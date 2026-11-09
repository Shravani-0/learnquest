import 'server-only'

import { randomBytes, randomInt } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOwnership } from '@/lib/server/billing/store'
import { unlockAchievement } from '@/lib/server/quests/access'
import { displayNameFor } from '@/lib/display-name'
import {
  ATTEMPT_LIMIT_MS, INVITE_TTL_MS, PLAY_WINDOW_MS,
  canUsePuzzle, decide, readyToScore, runOver,
  type ChallengeSkill, type Run,
} from '@/lib/challenges/rules'
import { PUZZLES, getPuzzle, runLinuxPuzzle, runSqlPuzzle, toClientPuzzle, type Puzzle } from './bank'
import type { Database } from '@/lib/supabase/types'

/**
 * Challenge lifecycle (service role only; see 0006_challenges.sql):
 *   open ──accept──▶ active ──both runs over / deadline──▶ finished
 *     └──invite unused for a week──▶ expired
 * Every transition is a conditional update on the current status, so two
 * people accepting the same link (or two settles racing) can't both win.
 */

type ChallengeRow = Database['public']['Tables']['challenges']['Row']
type RunRow = Database['public']['Tables']['challenge_runs']['Row']

export const FIRST_WIN_BADGE = 'first-duel-win'

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function newCode(len = 10): string {
  const bytes = randomBytes(len)
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
}

export function toRun(row: RunRow | null | undefined): Run | null {
  if (!row) return null
  return {
    startedAt: Date.parse(row.started_at),
    finishedAt: row.finished_at ? Date.parse(row.finished_at) : null,
    solved: row.solved,
    gaveUp: row.gave_up,
    moves: row.moves,
  }
}

export async function createChallenge(userId: string, skill: ChallengeSkill): Promise<string> {
  const db = createAdminClient()
  for (let tries = 0; tries < 3; tries++) {
    const code = newCode()
    const { error } = await db.from('challenges').insert({
      code,
      challenger_id: userId,
      skill,
      invite_expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
    })
    if (!error) return code
    if (error.code !== '23505') throw new Error(error.message) // retry only a code collision
  }
  throw new Error('could not allocate a challenge code')
}

export async function loadChallenge(code: string): Promise<{ challenge: ChallengeRow; runs: RunRow[] } | null> {
  if (!/^[A-Za-z0-9]{6,20}$/.test(code)) return null
  const db = createAdminClient()
  const { data: challenge } = await db.from('challenges').select('*').eq('code', code).maybeSingle()
  if (!challenge) return null
  const { data: runs } = await db.from('challenge_runs').select('*').eq('challenge_id', (challenge as ChallengeRow).id)
  return { challenge: challenge as ChallengeRow, runs: (runs ?? []) as RunRow[] }
}

/** Puzzles of this skill that every listed player may be given. */
export async function sharedPool(skill: ChallengeSkill, userIds: string[]): Promise<Puzzle[]> {
  const owned = await Promise.all(userIds.map(id => getOwnership(id)))
  return PUZZLES.filter(p => p.skill === skill && owned.every(o => canUsePuzzle(o, skill, p.tier)))
}

/** Pick at random, preferring puzzles neither player has raced before. */
export function pickPuzzle(pool: Puzzle[], seen: Set<string>, rand = randomInt): Puzzle | null {
  if (pool.length === 0) return null
  const fresh = pool.filter(p => !seen.has(p.id))
  const from = fresh.length ? fresh : pool
  return from[rand(from.length)]
}

async function seenPuzzles(userIds: string[]): Promise<Set<string>> {
  const db = createAdminClient()
  const seen = new Set<string>()
  for (const id of userIds) {
    const { data } = await db
      .from('challenges')
      .select('puzzle_id')
      .or(`challenger_id.eq.${id},opponent_id.eq.${id}`)
    for (const r of (data ?? []) as { puzzle_id: string | null }[]) if (r.puzzle_id) seen.add(r.puzzle_id)
  }
  return seen
}

export type AcceptError = 'not_found' | 'own_challenge' | 'taken' | 'expired' | 'no_puzzle'

export async function acceptChallenge(code: string, userId: string): Promise<{ ok: true } | { ok: false; error: AcceptError }> {
  const loaded = await loadChallenge(code)
  if (!loaded) return { ok: false, error: 'not_found' }
  const c = loaded.challenge
  if (c.challenger_id === userId) return { ok: false, error: 'own_challenge' }
  if (c.status !== 'open' || c.opponent_id) return { ok: false, error: 'taken' }
  if (Date.parse(c.invite_expires_at) <= Date.now()) return { ok: false, error: 'expired' }

  const players = [c.challenger_id, userId]
  const pool = await sharedPool(c.skill, players)
  const puzzle = pickPuzzle(pool, await seenPuzzles(players))
  if (!puzzle) return { ok: false, error: 'no_puzzle' }

  const now = Date.now()
  const db = createAdminClient()
  const { data } = await db
    .from('challenges')
    .update({
      opponent_id: userId,
      puzzle_id: puzzle.id,
      status: 'active',
      accepted_at: new Date(now).toISOString(),
      deadline_at: new Date(now + PLAY_WINDOW_MS).toISOString(),
    })
    .eq('id', c.id)
    .eq('status', 'open') // only one accept can win the race
    .select('id')
  if (!data || (Array.isArray(data) && data.length === 0)) return { ok: false, error: 'taken' }
  return { ok: true }
}

function isPlayer(c: ChallengeRow, userId: string) {
  return c.challenger_id === userId || c.opponent_id === userId
}

export type RunError = 'not_found' | 'not_player' | 'not_active' | 'over' | 'not_started'

/**
 * Start (or resume) this player's one timed run. The clock starts on the
 * server the first time; reloading the page resumes the same run.
 */
export async function startRun(code: string, userId: string) {
  const loaded = await loadChallenge(code)
  if (!loaded) return { ok: false as const, error: 'not_found' as RunError }
  const { challenge: c, runs } = loaded
  if (!isPlayer(c, userId)) return { ok: false as const, error: 'not_player' as RunError }
  if (c.status !== 'active' || !c.puzzle_id) return { ok: false as const, error: 'not_active' as RunError }
  if (c.deadline_at && Date.parse(c.deadline_at) <= Date.now()) return { ok: false as const, error: 'over' as RunError }

  let row = runs.find(r => r.user_id === userId)
  if (!row) {
    const db = createAdminClient()
    await db
      .from('challenge_runs')
      .upsert(
        { challenge_id: c.id, user_id: userId, started_at: new Date().toISOString() },
        { onConflict: 'challenge_id,user_id', ignoreDuplicates: true },
      )
    const { data } = await db.from('challenge_runs').select('*').eq('challenge_id', c.id).eq('user_id', userId).maybeSingle()
    row = (data as RunRow | null) ?? undefined
  }
  const run = toRun(row)
  if (!run || runOver(run, Date.now())) return { ok: false as const, error: 'over' as RunError }
  const puzzle = getPuzzle(c.puzzle_id)!
  return { ok: true as const, puzzle: toClientPuzzle(puzzle), startedAt: run.startedAt!, limitMs: ATTEMPT_LIMIT_MS, moves: run.moves }
}

/** Grade one query/command inside a live run. */
export async function submitMove(code: string, userId: string, input: string) {
  const loaded = await loadChallenge(code)
  if (!loaded) return { ok: false as const, error: 'not_found' as RunError }
  const { challenge: c, runs } = loaded
  if (!isPlayer(c, userId)) return { ok: false as const, error: 'not_player' as RunError }
  if (c.status !== 'active') return { ok: false as const, error: 'not_active' as RunError }
  const row = runs.find(r => r.user_id === userId)
  const run = toRun(row)
  if (!run) return { ok: false as const, error: 'not_started' as RunError }
  if (runOver(run, Date.now())) return { ok: false as const, error: 'over' as RunError }

  const db = createAdminClient()
  const { data: moves } = await db.rpc('bump_challenge_moves', { p_challenge: c.id, p_user: userId })

  const puzzle = getPuzzle(c.puzzle_id)!
  const graded =
    puzzle.skill === 'sql'
      ? { kind: 'sql' as const, ...runSqlPuzzle(puzzle, input) }
      : { kind: 'linux' as const, ...runLinuxPuzzle(puzzle, input) }

  if (graded.solved) {
    await db
      .from('challenge_runs')
      .update({ solved: true, finished_at: new Date().toISOString() })
      .eq('challenge_id', c.id)
      .eq('user_id', userId)
      .eq('solved', false)
    await settle(code)
  }
  return { ok: true as const, ...graded, moves: typeof moves === 'number' ? moves : run.moves + 1 }
}

export async function giveUp(code: string, userId: string): Promise<boolean> {
  const loaded = await loadChallenge(code)
  if (!loaded || !isPlayer(loaded.challenge, userId)) return false
  const db = createAdminClient()
  await db
    .from('challenge_runs')
    .update({ gave_up: true, finished_at: new Date().toISOString() })
    .eq('challenge_id', loaded.challenge.id)
    .eq('user_id', userId)
    .eq('solved', false)
  await settle(code)
  return true
}

/**
 * Move a challenge forward if it's due: expire an unused invite, or score a
 * duel once both runs are over or the deadline has passed. Safe to call on
 * every page view.
 */
export async function settle(code: string): Promise<void> {
  const loaded = await loadChallenge(code)
  if (!loaded) return
  const { challenge: c, runs } = loaded
  const db = createAdminClient()
  const now = Date.now()

  if (c.status === 'open' && Date.parse(c.invite_expires_at) <= now) {
    await db.from('challenges').update({ status: 'expired' }).eq('id', c.id).eq('status', 'open')
    return
  }
  if (c.status !== 'active' || !c.opponent_id || !c.deadline_at) return

  const a = toRun(runs.find(r => r.user_id === c.challenger_id))
  const b = toRun(runs.find(r => r.user_id === c.opponent_id))
  if (!readyToScore(a, b, Date.parse(c.deadline_at), now)) return

  const outcome = decide(a, b)
  const winnerId = outcome.winner === 'a' ? c.challenger_id : outcome.winner === 'b' ? c.opponent_id : null
  const { data } = await db
    .from('challenges')
    .update({ status: 'finished', winner_id: winnerId, result_reason: outcome.reason, finished_at: new Date(now).toISOString() })
    .eq('id', c.id)
    .eq('status', 'active')
    .select('id')
  const settledNow = Array.isArray(data) && data.length > 0
  if (settledNow && winnerId) await unlockAchievement(winnerId, FIRST_WIN_BADGE)
}

export async function namesFor(ids: (string | null)[]): Promise<Record<string, string>> {
  const want = [...new Set(ids.filter((x): x is string => !!x))]
  if (!want.length) return {}
  const db = createAdminClient()
  const { data } = await db.from('profiles').select('id, display_name, username').in('id', want)
  return Object.fromEntries(((data ?? []) as { id: string; display_name: string; username: string }[]).map(p => [p.id, displayNameFor(p)]))
}

export async function listChallenges(userId: string): Promise<ChallengeRow[]> {
  const db = createAdminClient()
  const { data } = await db
    .from('challenges')
    .select('*')
    .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(30)
  return (data ?? []) as ChallengeRow[]
}

export function recordFrom(rows: Pick<ChallengeRow, 'status' | 'winner_id'>[], userId: string) {
  const done = rows.filter(r => r.status === 'finished')
  const wins = done.filter(r => r.winner_id === userId).length
  const draws = done.filter(r => r.winner_id == null).length
  return { wins, losses: done.length - wins - draws, draws }
}

/** Lifetime win/loss/draw record (finished duels only). */
export async function recordFor(userId: string) {
  const db = createAdminClient()
  const { data } = await db
    .from('challenges')
    .select('status, winner_id')
    .eq('status', 'finished')
    .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
  return recordFrom((data ?? []) as Pick<ChallengeRow, 'status' | 'winner_id'>[], userId)
}

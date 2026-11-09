import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fakeSupabase } from './helpers/fake-supabase'

// ── Mocks: DB, ownership per user, badge unlocks ────────────────────────────────
const state = vi.hoisted(() => ({
  admin: null as unknown as ReturnType<typeof import('./helpers/fake-supabase').fakeSupabase>,
  owned: {} as Record<string, import('@/lib/billing/entitlements').Ownership>,
  badges: [] as [string, string][],
}))
vi.mock('@/lib/supabase/admin', () => ({ serviceConfigured: true, createAdminClient: () => state.admin.client }))
vi.mock('@/lib/server/billing/store', () => ({
  getOwnership: async (id: string) => state.owned[id] ?? { plans: [], worlds: [], levels: [] },
}))
vi.mock('@/lib/server/quests/access', () => ({
  unlockAchievement: async (u: string, a: string) => { state.badges.push([u, a]) },
}))

import {
  ATTEMPT_LIMIT_MS, canUsePuzzle, decide, readyToScore, runOver, formatDuration, type Run,
} from '@/lib/challenges/rules'
import { PUZZLES, getPuzzle, runLinuxPuzzle, runSqlPuzzle, sqlMatches, toClientPuzzle, type LinuxPuzzle, type SqlPuzzle } from '@/lib/server/challenges/bank'
import * as duel from '@/lib/server/challenges/service'
import { executeSQL } from '@/lib/sql-engine'

const NOW = 1_800_000_000_000
const run = (over: Partial<Run> = {}): Run => ({ startedAt: NOW, finishedAt: null, solved: false, moves: 0, ...over })
const solvedRun = (ms: number, moves = 3): Run => run({ solved: true, finishedAt: NOW + ms, moves })
const PRO = { plans: ['pro' as const], worlds: [], levels: [] }

beforeEach(() => {
  state.admin = fakeSupabase()
  state.owned = {}
  state.badges = []
})

// ═════════════════════════════════════════════════════════════════════════════
describe('who wins', () => {
  it('the faster solve wins', () => {
    expect(decide(solvedRun(40_000), solvedRun(90_000))).toEqual({ winner: 'a', reason: 'faster' })
    expect(decide(solvedRun(90_000), solvedRun(40_000))).toEqual({ winner: 'b', reason: 'faster' })
  })

  it('treats times within a second as level and falls back to fewer moves', () => {
    expect(decide(solvedRun(40_000, 6), solvedRun(40_600, 2))).toEqual({ winner: 'b', reason: 'fewer-moves' })
  })

  it('calls a draw when time and moves are both level', () => {
    expect(decide(solvedRun(40_000, 3), solvedRun(40_400, 3))).toEqual({ winner: 'draw', reason: 'tie' })
  })

  it('the only solver wins, however slow', () => {
    expect(decide(solvedRun(14 * 60_000), run({ gaveUp: true }))).toEqual({ winner: 'a', reason: 'only-solver' })
    expect(decide(null, solvedRun(1_000))).toEqual({ winner: 'b', reason: 'only-solver' })
  })

  it('is a draw when nobody solves it', () => {
    expect(decide(run({ gaveUp: true }), null)).toEqual({ winner: 'draw', reason: 'nobody-solved' })
  })
})

describe('when a run is over', () => {
  it('ends on solve, give-up, or the 15-minute limit', () => {
    expect(runOver(null, NOW)).toBe(false)
    expect(runOver(run(), NOW + 60_000)).toBe(false)
    expect(runOver(run(), NOW + ATTEMPT_LIMIT_MS)).toBe(true)
    expect(runOver(solvedRun(5_000), NOW + 6_000)).toBe(true)
    expect(runOver(run({ gaveUp: true }), NOW + 1)).toBe(true)
  })

  it('scores once both runs are over, or when the deadline passes', () => {
    const deadline = NOW + 48 * 3600_000
    expect(readyToScore(solvedRun(5_000), run(), deadline, NOW + 10_000)).toBe(false)
    expect(readyToScore(solvedRun(5_000), run({ gaveUp: true }), deadline, NOW + 10_000)).toBe(true)
    expect(readyToScore(solvedRun(5_000), null, deadline, deadline)).toBe(true)
  })

  it('formats times for people', () => {
    expect(formatDuration(42_400)).toBe('42s')
    expect(formatDuration(83_000)).toBe('1m 23s')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('which puzzles a player can get', () => {
  const none = { plans: [], worlds: [], levels: [] }

  it('gives everyone the free puzzles', () => {
    expect(canUsePuzzle(none, 'sql', 'free')).toBe(true)
  })

  it('opens premium puzzles with Pro or Career', () => {
    expect(canUsePuzzle(PRO, 'linux', 'premium')).toBe(true)
    expect(canUsePuzzle({ ...none, plans: ['career'] }, 'sql', 'premium')).toBe(true)
  })

  it('opens premium puzzles of a skill when the player owns that skill’s world', () => {
    const linuxWorld = { ...none, worlds: ['linux-prison-break'] }
    expect(canUsePuzzle(linuxWorld, 'linux', 'premium')).toBe(true)
    expect(canUsePuzzle(linuxWorld, 'sql', 'premium')).toBe(false)
  })

  it('keeps premium closed for free accounts and Interview-only plans', () => {
    expect(canUsePuzzle(none, 'sql', 'premium')).toBe(false)
    expect(canUsePuzzle({ ...none, plans: ['interview'] }, 'sql', 'premium')).toBe(false)
  })

  it('draws only from puzzles BOTH players can use', async () => {
    state.owned = { pro: PRO }
    const pool = await duel.sharedPool('sql', ['pro', 'free-user'])
    expect(pool.length).toBeGreaterThan(0)
    expect(pool.every(p => p.skill === 'sql' && p.tier === 'free')).toBe(true)
    state.owned = { a: PRO, b: PRO }
    expect((await duel.sharedPool('sql', ['a', 'b'])).some(p => p.tier === 'premium')).toBe(true)
  })

  it('prefers puzzles neither player has seen, and falls back when all are seen', () => {
    const pool = PUZZLES.filter(p => p.skill === 'linux' && p.tier === 'free')
    const seen = new Set(pool.slice(0, -1).map(p => p.id))
    expect(duel.pickPuzzle(pool, seen, () => 0)?.id).toBe(pool[pool.length - 1].id)
    expect(duel.pickPuzzle(pool, new Set(pool.map(p => p.id)), () => 1)?.id).toBe(pool[1].id)
    expect(duel.pickPuzzle([], new Set())).toBeNull()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('puzzle bank', () => {
  const sqlPuzzles = PUZZLES.filter((p): p is SqlPuzzle => p.skill === 'sql')
  const linuxPuzzles = PUZZLES.filter((p): p is LinuxPuzzle => p.skill === 'linux')

  it('has free and premium puzzles for every skill, with unique ids', () => {
    for (const skill of ['sql', 'linux']) {
      const mine = PUZZLES.filter(p => p.skill === skill)
      expect(mine.some(p => p.tier === 'free')).toBe(true)
      expect(mine.some(p => p.tier === 'premium')).toBe(true)
    }
    expect(new Set(PUZZLES.map(p => p.id)).size).toBe(PUZZLES.length)
  })

  it.each(sqlPuzzles.map(p => [p.id, p] as const))('%s: the reference answer runs and returns rows', (_id, p) => {
    const r = executeSQL(p.reference, p.db as never)
    expect(r.error).toBeUndefined()
    expect(r.rowCount).toBeGreaterThan(0)
    expect(sqlMatches(p, r)).toBe(true)
  })

  it('accepts a differently written but equivalent query', () => {
    const p = getPuzzle('sql-pune') as SqlPuzzle
    expect(runSqlPuzzle(p, "SELECT name AS who FROM customers WHERE city = 'Pune' ORDER BY name DESC").solved).toBe(true)
  })

  it('rejects wrong rows, extra columns, and errors', () => {
    const p = getPuzzle('sql-pune') as SqlPuzzle
    expect(runSqlPuzzle(p, "SELECT name FROM customers WHERE city = 'Delhi'").solved).toBe(false)
    expect(runSqlPuzzle(p, "SELECT name, city FROM customers WHERE city = 'Pune'").solved).toBe(false)
    expect(runSqlPuzzle(p, 'DROP TABLE customers').solved).toBe(false)
  })

  it('enforces order only when the task asks for it', () => {
    const p = getPuzzle('sql-big-tickets') as SqlPuzzle
    expect(runSqlPuzzle(p, 'SELECT item, amount FROM orders WHERE amount > 20000 ORDER BY amount DESC').solved).toBe(true)
    expect(runSqlPuzzle(p, 'SELECT item, amount FROM orders WHERE amount > 20000 ORDER BY amount ASC').solved).toBe(false)
  })

  it.each(linuxPuzzles.flatMap(p => p.accepted.map(a => [p.id, a, p] as const)))('%s accepts `%s`', (_id, cmd, p) => {
    expect(runLinuxPuzzle(p, `  ${cmd.replace(/ /g, '   ')} `).solved).toBe(true)
  })

  it('gives Linux players a look around without solving', () => {
    const p = getPuzzle('lx-grep') as LinuxPuzzle
    expect(runLinuxPuzzle(p, 'ls')).toEqual({ lines: [{ type: 'output', content: p.listing }], solved: false })
    expect(runLinuxPuzzle(p, 'rm -rf /').solved).toBe(false)
  })

  it('never sends answers to the browser', () => {
    for (const p of PUZZLES) {
      const json = JSON.stringify(toClientPuzzle(p))
      if (p.skill === 'sql') {
        expect(json).not.toContain(p.reference)
        expect(json).not.toContain('Aarav') // no table data either
      } else {
        for (const a of p.accepted) expect(json).not.toContain(JSON.stringify(a).slice(1, -1))
        expect(json).not.toContain(p.id)
        for (const line of p.output) if (line !== p.cwd) expect(json).not.toContain(line) // the cwd is shown on purpose
      }
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('challenge lifecycle', () => {
  const challenge = (over: Record<string, unknown> = {}) => ({
    id: 'c1', code: 'abcDEF2345', challenger_id: 'alice', opponent_id: null, skill: 'sql', puzzle_id: null,
    status: 'open', winner_id: null, result_reason: null, created_at: new Date().toISOString(),
    invite_expires_at: new Date(Date.now() + 86_400_000).toISOString(), accepted_at: null, deadline_at: null, finished_at: null,
    ...over,
  })
  const withDb = (c: object, runs: object[] = []) => {
    state.admin = fakeSupabase({ tables: { challenges: { data: c, rows: [c] }, challenge_runs: { data: runs } } })
  }
  const update = () => state.admin.calls.find(c => c.table === 'challenges' && c.method === 'update')?.args[0] as Record<string, unknown> | undefined

  it('makes unguessable 10-character link codes', () => {
    const codes = new Set(Array.from({ length: 200 }, () => duel.newCode()))
    expect(codes.size).toBe(200)
    for (const c of codes) expect(c).toMatch(/^[A-Za-z0-9]{10}$/)
  })

  it('will not let you accept your own challenge', async () => {
    withDb(challenge())
    expect(await duel.acceptChallenge('abcDEF2345', 'alice')).toEqual({ ok: false, error: 'own_challenge' })
  })

  it('refuses a taken or expired invite', async () => {
    withDb(challenge({ status: 'active', opponent_id: 'carol' }))
    expect(await duel.acceptChallenge('abcDEF2345', 'bob')).toEqual({ ok: false, error: 'taken' })
    withDb(challenge({ invite_expires_at: new Date(Date.now() - 1).toISOString() }))
    expect(await duel.acceptChallenge('abcDEF2345', 'bob')).toEqual({ ok: false, error: 'expired' })
  })

  it('accepting draws a puzzle of the right skill and opens a 48-hour window', async () => {
    withDb(challenge())
    expect(await duel.acceptChallenge('abcDEF2345', 'bob')).toEqual({ ok: true })
    const u = update()!
    expect(u).toMatchObject({ opponent_id: 'bob', status: 'active' })
    expect(getPuzzle(u.puzzle_id as string)?.skill).toBe('sql')
    expect(getPuzzle(u.puzzle_id as string)?.tier).toBe('free') // neither player has premium
    expect(Date.parse(u.deadline_at as string) - Date.parse(u.accepted_at as string)).toBe(48 * 3600_000)
    // Guarded on status so two accepts can't both succeed.
    expect(state.admin.calls).toContainEqual(expect.objectContaining({ table: 'challenges', method: 'eq', args: ['status', 'open'] }))
  })

  it('ignores malformed codes without touching the database', async () => {
    expect(await duel.loadChallenge("x' or 1=1")).toBeNull()
    expect(state.admin.client.from).not.toHaveBeenCalled()
  })

  it('only the two players can play, and only after starting', async () => {
    withDb(challenge({ status: 'active', opponent_id: 'bob', puzzle_id: 'sql-pune' }))
    expect(await duel.submitMove('abcDEF2345', 'mallory', 'SELECT 1')).toMatchObject({ ok: false, error: 'not_player' })
    expect(await duel.submitMove('abcDEF2345', 'bob', 'SELECT 1')).toMatchObject({ ok: false, error: 'not_started' })
  })

  it('grades a move on the server and records the solve time', async () => {
    const started = new Date(Date.now() - 30_000).toISOString()
    withDb(
      challenge({ status: 'active', opponent_id: 'bob', puzzle_id: 'sql-pune', deadline_at: new Date(Date.now() + 3600_000).toISOString() }),
      [{ challenge_id: 'c1', user_id: 'bob', started_at: started, finished_at: null, solved: false, gave_up: false, moves: 2 }],
    )
    const res = await duel.submitMove('abcDEF2345', 'bob', "SELECT name FROM customers WHERE city = 'Pune'")
    expect(res).toMatchObject({ ok: true, kind: 'sql', solved: true })
    expect(state.admin.client.rpc).toHaveBeenCalledWith('bump_challenge_moves', { p_challenge: 'c1', p_user: 'bob' })
    expect(state.admin.calls).toContainEqual(expect.objectContaining({
      table: 'challenge_runs', method: 'update', args: [expect.objectContaining({ solved: true })],
    }))
  })

  it('refuses moves after the 15-minute limit', async () => {
    withDb(
      challenge({ status: 'active', opponent_id: 'bob', puzzle_id: 'sql-pune' }),
      [{ challenge_id: 'c1', user_id: 'bob', started_at: new Date(Date.now() - ATTEMPT_LIMIT_MS - 1).toISOString(), finished_at: null, solved: false, gave_up: false, moves: 9 }],
    )
    expect(await duel.submitMove('abcDEF2345', 'bob', "SELECT name FROM customers WHERE city = 'Pune'")).toMatchObject({ ok: false, error: 'over' })
  })

  it('scores a finished duel and gives the winner the badge', async () => {
    const t0 = Date.now() - 600_000
    withDb(
      challenge({ status: 'active', opponent_id: 'bob', puzzle_id: 'sql-pune', deadline_at: new Date(Date.now() + 3600_000).toISOString() }),
      [
        { challenge_id: 'c1', user_id: 'alice', started_at: new Date(t0).toISOString(), finished_at: new Date(t0 + 95_000).toISOString(), solved: true, gave_up: false, moves: 4 },
        { challenge_id: 'c1', user_id: 'bob', started_at: new Date(t0).toISOString(), finished_at: new Date(t0 + 60_000).toISOString(), solved: true, gave_up: false, moves: 7 },
      ],
    )
    await duel.settle('abcDEF2345')
    expect(update()).toMatchObject({ status: 'finished', winner_id: 'bob', result_reason: 'faster' })
    expect(state.badges).toEqual([['bob', duel.FIRST_WIN_BADGE]])
  })

  it('waits while a run is still going and the deadline is ahead', async () => {
    withDb(
      challenge({ status: 'active', opponent_id: 'bob', puzzle_id: 'sql-pune', deadline_at: new Date(Date.now() + 3600_000).toISOString() }),
      [{ challenge_id: 'c1', user_id: 'alice', started_at: new Date().toISOString(), finished_at: null, solved: false, gave_up: false, moves: 0 }],
    )
    await duel.settle('abcDEF2345')
    expect(update()).toBeUndefined()
  })

  it('expires an invite nobody accepted', async () => {
    withDb(challenge({ invite_expires_at: new Date(Date.now() - 1).toISOString() }))
    await duel.settle('abcDEF2345')
    expect(update()).toEqual({ status: 'expired' })
  })

  it('counts a win/loss/draw record from finished duels', () => {
    const rows = [
      { status: 'finished', winner_id: 'me' }, { status: 'finished', winner_id: 'you' },
      { status: 'finished', winner_id: null }, { status: 'active', winner_id: null },
    ] as never[]
    expect(duel.recordFrom(rows, 'me')).toEqual({ wins: 1, losses: 1, draws: 1 })
  })
})

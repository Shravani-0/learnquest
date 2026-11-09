import 'server-only'

import { getAdventureBySlug } from '@/lib/data/adventures'
import { getUser } from '@/lib/db/queries'
import { createAdminClient, serviceConfigured } from '@/lib/supabase/admin'
import type { AccessReason } from '@/lib/quests/types'
import { canPlayLevel, type Ownership } from '@/lib/billing/entitlements'
import { getOwnership } from '@/lib/server/billing/store'

/**
 * Server-side access control + progress persistence for the games.
 *
 * Model (chosen with the product owner):
 *   • Levels 1–TRIAL_LEVEL of every world are a free TRIAL — playable without an
 *     account (nothing is persisted for anonymous players).
 *   • Levels beyond the trial require a signed-in user who owns them: the level
 *     itself, its world, or a plan covering every world (see lib/billing). Owned
 *     levels open straight away — earlier levels needn't be cleared first.
 *
 * `checkAccess()` is the one gate; both the play routes and the server actions
 * call it, so a locked level can't be reached by URL or by calling the action
 * directly. All writes go through the service role (RLS blocks clients).
 *
 * TRIAL_LEVEL is the single source of truth. Client components can't import this
 * (it's server-only), so the play/overview pages pass it down as a prop.
 */

export const TRIAL_LEVEL = 2

export const LEVEL_COUNTS: Record<string, number> = {
  'sql-murder-mystery': 3,
  'linux-prison-break': 10,
}

export interface Access {
  ok: boolean
  reason?: AccessReason
  userId: string | null
}

export async function completedLevels(userId: string | null, adventureId: string): Promise<number[]> {
  if (!userId || !serviceConfigured) return []
  const db = createAdminClient()
  const { data } = await db
    .from('user_quest_progress')
    .select('level_number, status')
    .eq('user_id', userId)
    .eq('adventure_id', adventureId)
  return (data ?? []).filter(r => r.status === 'completed').map(r => r.level_number)
}

/** Every level of a world this player can open right now (free trial + owned). */
export async function accessibleLevels(
  userId: string | null,
  adventureId: string,
  count: number,
  ownership?: Ownership,
): Promise<number[]> {
  const owned = userId ? (ownership ?? (await getOwnership(userId))) : null
  const out: number[] = []
  for (let n = 1; n <= count; n++) {
    if (n <= TRIAL_LEVEL || (owned && canPlayLevel(owned, adventureId, n, TRIAL_LEVEL))) out.push(n)
  }
  return out
}

/**
 * Where to drop a player in: the first level they can open and haven't cleared,
 * so fresh/anonymous players start at level 1. Once everything they can open is
 * cleared, the last of those (a replay).
 */
export async function resumeLevel(
  userId: string | null,
  adventureId: string,
  count: number,
): Promise<number> {
  const open = await accessibleLevels(userId, adventureId, count)
  const done = new Set(await completedLevels(userId, adventureId))
  return open.find(n => !done.has(n)) ?? open[open.length - 1] ?? 1
}

/** Can this player open this level? Same rule as checkAccess, without the world checks. */
export async function canOpenLevel(userId: string | null, adventureId: string, level: number): Promise<boolean> {
  if (level <= TRIAL_LEVEL) return true
  if (!userId) return false
  return canPlayLevel(await getOwnership(userId), adventureId, level, TRIAL_LEVEL)
}

/**
 * Which level a play page should open. An explicit ?level= is honoured when the
 * player can open it; otherwise anonymous players go to login, and signed-in
 * players go to the world page to unlock it. No ?level= → resume.
 */
export async function resolvePlayLevel(
  userId: string | null,
  adventureId: string,
  count: number,
  requested: string | undefined,
): Promise<{ level: number } | { redirect: string }> {
  const raw = parseInt(requested ?? '', 10)
  if (Number.isNaN(raw)) return { level: await resumeLevel(userId, adventureId, count) }
  const level = Math.max(1, Math.min(count, raw))
  if (await canOpenLevel(userId, adventureId, level)) return { level }
  const playUrl = `/adventures/${adventureId}/play?level=${level}`
  if (!userId) return { redirect: `/login?next=${encodeURIComponent(playUrl)}` }
  return { redirect: `/adventures/${adventureId}?unlock=${level}#unlock` }
}

/** The single access gate for a specific level. */
export async function checkAccess(adventureId: string, level: number): Promise<Access> {
  const adv = getAdventureBySlug(adventureId)
  if (!adv || adv.isComingSoon) return { ok: false, reason: 'coming_soon', userId: null }

  const user = await getUser()
  const userId = user?.id ?? null

  if (level <= TRIAL_LEVEL) return { ok: true, userId } // free trial — anonymous allowed

  if (!userId) return { ok: false, reason: 'auth_required', userId: null }

  if (!(await canOpenLevel(userId, adventureId, level))) {
    return { ok: false, reason: 'payment_required', userId }
  }

  return { ok: true, userId }
}

// ─── Writes (service role only) ──────────────────────────────────────────────

/** Atomically complete a level and award its XP exactly once. */
export async function grantCompletion(
  userId: string,
  adventureId: string,
  level: number,
  xp: number,
  steps: string[],
): Promise<{ xpAwarded: number; alreadyDone: boolean }> {
  if (!serviceConfigured) return { xpAwarded: 0, alreadyDone: false }
  const db = createAdminClient()
  const { data, error } = await db.rpc('complete_level', {
    p_user: userId,
    p_adventure: adventureId,
    p_level: level,
    p_xp: xp,
    p_steps: steps,
  })
  if (error) return { xpAwarded: 0, alreadyDone: false }
  const row = Array.isArray(data) ? data[0] : data
  return { xpAwarded: row?.xp_awarded ?? 0, alreadyDone: row?.already_completed ?? false }
}

export interface LevelProgress {
  /** Server-detected investigation steps (never client-supplied). */
  steps: string[]
  /** Hints revealed through the server (the XP skill tax), deduped per hint. */
  hintsUsed: number
  completed: boolean
}

const EMPTY_PROGRESS: LevelProgress = { steps: [], hintsUsed: 0, completed: false }

function toProgress(keys: string[] | null | undefined, status?: string | null): LevelProgress {
  const all = keys ?? []
  return {
    steps: all.filter(k => !k.startsWith('hint:')),
    hintsUsed: all.filter(k => k.startsWith('hint:')).length,
    completed: status === 'completed',
  }
}

/** The authoritative per-level progress for a signed-in player. */
export async function getLevelProgress(
  userId: string,
  adventureId: string,
  level: number,
): Promise<LevelProgress> {
  if (!serviceConfigured) return EMPTY_PROGRESS
  const db = createAdminClient()
  const { data } = await db
    .from('user_quest_progress')
    .select('steps_completed, status')
    .eq('user_id', userId)
    .eq('adventure_id', adventureId)
    .eq('level_number', level)
    .maybeSingle()
  return toProgress(data?.steps_completed, data?.status)
}

/**
 * Append server-detected step ids or revealed hint keys ('hint:*') to a level's
 * progress. Atomic via the append_progress_keys RPC (0003); before that migration
 * is applied it falls back to a read-merge-write through record_step_progress.
 */
export async function appendProgressKeys(
  userId: string,
  adventureId: string,
  level: number,
  keys: string[],
): Promise<void> {
  if (!serviceConfigured || keys.length === 0) return
  const db = createAdminClient()
  const { error } = await db.rpc('append_progress_keys', {
    p_user: userId,
    p_adventure: adventureId,
    p_level: level,
    p_keys: keys,
  })
  if (!error) return
  const { data } = await db
    .from('user_quest_progress')
    .select('steps_completed, status')
    .eq('user_id', userId)
    .eq('adventure_id', adventureId)
    .eq('level_number', level)
    .maybeSingle()
  if (data?.status === 'completed') return
  const prior = data?.steps_completed ?? []
  await recordSteps(userId, adventureId, level, Array.from(new Set([...prior, ...keys])))
}

/** Wrong verdicts this player submitted for a level in the recent window. */
export async function recentWrongVerdicts(
  userId: string,
  adventureId: string,
  level: number,
  windowMs: number,
): Promise<number> {
  if (!serviceConfigured) return 0
  const db = createAdminClient()
  const { count } = await db
    .from('user_answers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('adventure_id', adventureId)
    .eq('level_number', level)
    .like('step_key', 'verdict-%')
    .eq('is_correct', false)
    .gte('created_at', new Date(Date.now() - windowMs).toISOString())
  return count ?? 0
}

/** Persist which narrative steps a player has revealed (no XP). */
export async function recordSteps(
  userId: string,
  adventureId: string,
  level: number,
  steps: string[],
): Promise<void> {
  if (!serviceConfigured) return
  const db = createAdminClient()
  await db.rpc('record_step_progress', {
    p_user: userId,
    p_adventure: adventureId,
    p_level: level,
    p_steps: steps,
  })
}

/** Log a raw submission (private to the owner via RLS). */
export async function logAnswer(
  userId: string,
  adventureId: string,
  level: number,
  stepKey: string | null,
  answer: string,
  isCorrect: boolean,
): Promise<void> {
  if (!serviceConfigured) return
  const db = createAdminClient()
  await db.from('user_answers').insert({
    user_id: userId,
    adventure_id: adventureId,
    level_number: level,
    step_key: stepKey,
    submitted_answer: answer.slice(0, 4000),
    is_correct: isCorrect,
  })
}

/** Unlock an achievement badge (idempotent — no XP). */
export async function unlockAchievement(userId: string, achievementId: string): Promise<void> {
  if (!serviceConfigured) return
  const db = createAdminClient()
  await db
    .from('user_achievements')
    .upsert(
      { user_id: userId, achievement_id: achievementId },
      { onConflict: 'user_id,achievement_id', ignoreDuplicates: true },
    )
}

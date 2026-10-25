import 'server-only'

import { getAdventureBySlug } from '@/lib/data/adventures'
import { getUser } from '@/lib/db/queries'
import { createAdminClient, serviceConfigured } from '@/lib/supabase/admin'
import type { AccessReason } from '@/lib/quests/types'

/**
 * Server-side access control + progress persistence for the games.
 *
 * Model (chosen with the product owner):
 *   • Levels 1–TRIAL_LEVEL of every world are a free TRIAL — playable without an
 *     account (nothing is persisted for anonymous players).
 *   • Levels beyond the trial require a signed-in user AND completion of the
 *     previous level.
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

export async function isLevelCompleted(
  userId: string,
  adventureId: string,
  levelNumber: number,
): Promise<boolean> {
  if (!serviceConfigured) return false
  const db = createAdminClient()
  const { data } = await db
    .from('user_quest_progress')
    .select('status')
    .eq('user_id', userId)
    .eq('adventure_id', adventureId)
    .eq('level_number', levelNumber)
    .maybeSingle()
  return data?.status === 'completed'
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

/** Highest level the player may access right now (sequential unlock from the trial). */
export async function unlockedMax(
  userId: string | null,
  adventureId: string,
  count: number,
): Promise<number> {
  if (!userId || !serviceConfigured) return TRIAL_LEVEL
  const done = new Set(await completedLevels(userId, adventureId))
  let max = TRIAL_LEVEL
  for (let n = TRIAL_LEVEL + 1; n <= count; n++) {
    if (done.has(n - 1)) max = n
    else break
  }
  return max
}

/**
 * Where to drop a player in: the first accessible level they haven't cleared,
 * so fresh/anonymous players always start at level 1 rather than being skipped
 * ahead to the top of the free trial. Falls back to the highest accessible level
 * once everything reachable is done.
 */
export async function resumeLevel(
  userId: string | null,
  adventureId: string,
  count: number,
): Promise<number> {
  if (!userId || !serviceConfigured) return 1
  const done = new Set(await completedLevels(userId, adventureId))

  // Highest level currently accessible (trial + sequential unlock).
  let max = TRIAL_LEVEL
  for (let n = TRIAL_LEVEL + 1; n <= count; n++) {
    if (done.has(n - 1)) max = n
    else break
  }

  // First not-yet-cleared level within reach; else resume at the top.
  for (let n = 1; n <= max; n++) if (!done.has(n)) return n
  return max
}

/** The single access gate for a specific level. */
export async function checkAccess(adventureId: string, level: number): Promise<Access> {
  const adv = getAdventureBySlug(adventureId)
  if (!adv || adv.isComingSoon) return { ok: false, reason: 'coming_soon', userId: null }

  const user = await getUser()
  const userId = user?.id ?? null

  if (level <= TRIAL_LEVEL) return { ok: true, userId } // free trial — anonymous allowed

  if (!userId) return { ok: false, reason: 'auth_required', userId: null }

  const priorDone = await isLevelCompleted(userId, adventureId, level - 1)
  if (!priorDone) return { ok: false, reason: 'locked', userId }

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

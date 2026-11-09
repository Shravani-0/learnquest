import { worldsPlan, type Ownership } from '@/lib/billing/entitlements'

/**
 * Challenge rules — pure, shared by server and UI.
 *
 *  • A challenger picks a skill and shares a link. When a friend accepts, one
 *    puzzle for that skill is drawn at random from the puzzles BOTH can use.
 *  • Free accounts use free puzzles. Pro/Career, or owning that skill's world,
 *    adds the premium ones.
 *  • Each player gets one timed run (ATTEMPT_LIMIT_MS) any time before the
 *    deadline. Fastest solve wins; fewer queries/commands breaks a tie.
 *    Bragging rights only — no XP changes hands.
 */

export type ChallengeSkill = 'sql' | 'linux'
export type PuzzleTier = 'free' | 'premium'

export const CHALLENGE_SKILLS: { id: ChallengeSkill; label: string; worldId: string }[] = [
  { id: 'sql', label: 'SQL', worldId: 'sql-murder-mystery' },
  { id: 'linux', label: 'Linux', worldId: 'linux-prison-break' },
]

export const isChallengeSkill = (v: unknown): v is ChallengeSkill =>
  CHALLENGE_SKILLS.some(s => s.id === v)

/** How long a friend has to accept the link. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000
/** Once accepted, how long both players have to take their run. */
export const PLAY_WINDOW_MS = 48 * 60 * 60 * 1000
/** One run's time limit; an unfinished run counts as not solved. */
export const ATTEMPT_LIMIT_MS = 15 * 60 * 1000

/** May this player be given a puzzle of this skill and tier? */
export function canUsePuzzle(o: Ownership, skill: ChallengeSkill, tier: PuzzleTier): boolean {
  if (tier === 'free') return true
  if (worldsPlan(o)) return true
  const world = CHALLENGE_SKILLS.find(s => s.id === skill)?.worldId
  return !!world && o.worlds.includes(world)
}

export interface Run {
  startedAt: number | null
  finishedAt: number | null
  solved: boolean
  /** Queries run / commands entered. */
  moves: number
  gaveUp?: boolean
}

/** Is this run over (solved, given up, or out of time)? */
export function runOver(run: Run | null, now: number): boolean {
  if (!run?.startedAt) return false
  return run.solved || !!run.gaveUp || run.finishedAt != null || now - run.startedAt >= ATTEMPT_LIMIT_MS
}

export function elapsedMs(run: Run): number | null {
  if (!run.solved || run.startedAt == null || run.finishedAt == null) return null
  return run.finishedAt - run.startedAt
}

export type Outcome = { winner: 'a' | 'b' | 'draw'; reason: 'faster' | 'fewer-moves' | 'only-solver' | 'nobody-solved' | 'tie' }

/** Decide a finished duel. Runs that never started count as not solved. */
export function decide(a: Run | null, b: Run | null): Outcome {
  const ta = a ? elapsedMs(a) : null
  const tb = b ? elapsedMs(b) : null
  if (ta == null && tb == null) return { winner: 'draw', reason: 'nobody-solved' }
  if (ta == null) return { winner: 'b', reason: 'only-solver' }
  if (tb == null) return { winner: 'a', reason: 'only-solver' }
  // Within a second counts as level on time; then fewer moves wins.
  if (Math.abs(ta - tb) >= 1000) return { winner: ta < tb ? 'a' : 'b', reason: 'faster' }
  if (a!.moves !== b!.moves) return { winner: a!.moves < b!.moves ? 'a' : 'b', reason: 'fewer-moves' }
  return { winner: 'draw', reason: 'tie' }
}

/** Both runs over, or the deadline passed → the duel can be scored. */
export function readyToScore(a: Run | null, b: Run | null, deadline: number, now: number): boolean {
  return now >= deadline || (runOver(a, now) && runOver(b, now))
}

/** "1m 23s" */
export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return m ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`
}

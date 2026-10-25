/**
 * unrust XP system — "clearance", not points.
 * =====================================================================================
 * Design (see DESIGN.md "XP system"). This is a terminal you break into, not an edtech
 * app, so the economy rewards skill, not time:
 *
 *  1. HARDER = MORE.      A level's base XP scales with its difficulty (CTF dynamic-scoring
 *                         principle), not with how long you grind. Values live server-side
 *                         (quest modules) and in levels.ts for display.
 *  2. FIRST CLEAR ONLY.   XP is granted once per level. Replays pay nothing — enforced by the
 *                         idempotent `complete_level` RPC. You cannot farm XP; you earn it by
 *                         breaking in. This is the anti-grind core.
 *  3. HINTS ARE A SKILL TAX.  Hints are free to use but cost you XP (never purchasable). A clean
 *                         solve pays full; each hint drops the multiplier toward a floor. A
 *                         no-hint solver out-earns a hint-heavy one ~2.5x. (`awardFor`)
 *  4. XP IS CLEARANCE.    Total XP maps to a privilege-escalation rank (guest → user → operator
 *                         → sudo → daemon → kernel → root), surfaced by `whoami`. Clearance is
 *                         the VALUE: it unlocks systems (worlds), hard-mode, the board, /root.
 *                         It is earned and permanent — there is no shop.
 *
 * The math runs identically on server and client (pure functions, no deps).
 */

// ── Level number (kept for the dashboard's XP bar; flat + legible) ───────────────────
const XP_PER_LEVEL = 1000

export function levelFromXp(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const levelFloor = (level - 1) * XP_PER_LEVEL
  const nextLevelAt = level * XP_PER_LEVEL
  return {
    level,
    xpIntoLevel: xp - levelFloor,
    xpForLevel: XP_PER_LEVEL,
    nextLevelAt,
    percent: Math.round(((xp - levelFloor) / XP_PER_LEVEL) * 100),
  }
}

// ── Clearance ladder (the identity + the value) ──────────────────────────────────────
export type Clearance = {
  id: string
  title: string
  minXp: number
  /** What reaching this clearance grants. Shown on the dashboard + worlds index. */
  unlocks: string[]
}

/** Anonymous visitors. Not a real rank — they can still play the trial of every world. */
export const GUEST: Clearance = {
  id: 'guest',
  title: 'guest',
  minXp: 0,
  unlocks: ['The trial (levels 1–2) of every world'],
}

/** Exponential thresholds: clearing both live worlds clean lands you around `sudo`, leaving
 *  real headroom for the worlds still in build. Ratios ~2.4–3x per tier (standard RPG curve). */
export const CLEARANCE: Clearance[] = [
  { id: 'user', title: 'user', minXp: 0, unlocks: ['Progress that saves', 'Every level past the trial', 'A seat on the board'] },
  { id: 'operator', title: 'operator', minXp: 750, unlocks: ['Git Time Traveler', 'Your handle ranked on the public board'] },
  { id: 'sudo', title: 'sudo', minXp: 2500, unlocks: ['Hacker Academy', 'Hard-mode: no-hint runs for bonus XP'] },
  { id: 'daemon', title: 'daemon', minXp: 6000, unlocks: ['Robot Factory', 'Early access to new worlds'] },
  { id: 'kernel', title: 'kernel', minXp: 14000, unlocks: ['Space Mission Control', 'Classified /root challenges'] },
  { id: 'root', title: 'root', minXp: 30000, unlocks: ['Full clearance. The whole box is yours.'] },
]

export function clearanceForXp(xp: number) {
  let i = 0
  for (let k = 0; k < CLEARANCE.length; k++) if (xp >= CLEARANCE[k].minXp) i = k
  const current = CLEARANCE[i]
  const next = CLEARANCE[i + 1] ?? null
  const span = next ? next.minXp - current.minXp : 0
  const into = xp - current.minXp
  return {
    index: i,
    current,
    next,
    xpToNext: next ? Math.max(0, next.minXp - xp) : 0,
    percent: next && span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 100,
  }
}

/** Clearance id required to access each world still in build (its `whoami` gate on launch). */
export const WORLD_CLEARANCE: Record<string, string> = {
  'git-time-traveler': 'operator',
  'hacker-academy': 'sudo',
  'robot-factory': 'daemon',
  'space-mission-control': 'kernel',
}

// ── Award rule: what a single level pays ─────────────────────────────────────────────
/** Hint tax. Index = hints used (clamped 0..3). A clean solve pays full; three hints pays 0.4x. */
const HINT_MULTIPLIER = [1, 0.75, 0.55, 0.4]
const SPEED_BONUS = 0.15 // solved at or under par time

export type AwardInput = {
  /** The level's difficulty XP (harder = more). */
  base: number
  /** Hints revealed this run. Clamped to 0..3. */
  hintsUsed?: number
  /** Time to solve, if tracked. */
  elapsedMs?: number
  /** Par time for the speed bonus, if set. */
  parMs?: number
}

/**
 * XP a level pays on its FIRST clear (replays pay nothing — the RPC's idempotency enforces that).
 * Returns the total plus the signals, so callers can also unlock the matching achievement badge.
 */
export function awardFor({ base, hintsUsed = 0, elapsedMs, parMs }: AwardInput) {
  const hints = Math.min(Math.max(Math.round(hintsUsed), 0), HINT_MULTIPLIER.length - 1)
  const fast = elapsedMs != null && parMs != null && elapsedMs <= parMs
  const raw = base * HINT_MULTIPLIER[hints] * (1 + (fast ? SPEED_BONUS : 0))
  return {
    total: Math.max(Math.round(raw), Math.round(base * 0.4)), // a real solve always pays something
    clean: hints === 0,
    fast,
    base,
  }
}

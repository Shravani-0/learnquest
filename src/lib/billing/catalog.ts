/**
 * What can be bought, and for how much. Shared by the server (which charges
 * from these numbers — never from anything the browser sends) and the UI.
 * Amounts are in paise (₹1 = 100 paise), the unit Razorpay expects.
 *
 * Access model:
 *   • Levels 1..TRIAL_LEVEL of every world are free.
 *   • Beyond that, a level opens when the player owns it, its world, or a plan
 *     that covers worlds (Pro, Career). Owned levels open immediately — no need
 *     to clear the earlier ones first.
 *   • Interview levels (coming later) open with Career or Interview.
 */

export const CURRENCY = 'INR'

export const ONE_TIME_PRICES = {
  /** One level of one world, forever. */
  level: 4900,
  /** Every level of one world, forever. */
  world: 29900,
} as const

export type PlanId = 'pro' | 'career' | 'interview'

/** What a plan unlocks. `worlds` = every level of every world; `interview` = interview levels. */
export type PlanAccess = 'worlds' | 'interview'

export interface Plan {
  id: PlanId
  name: string
  /** Monthly price in paise. */
  amount: number
  tagline: string
  features: string[]
  grants: PlanAccess[]
  /** false = shown as "coming soon" and cannot be bought yet. */
  available: boolean
  /** Env var holding this plan's Razorpay plan id (created in the Razorpay dashboard). */
  razorpayPlanEnv: string
}

export const PLANS: Record<PlanId, Plan> = {
  pro: {
    id: 'pro',
    name: 'Pro',
    amount: 49900,
    tagline: 'Every world, every level.',
    features: ['All levels of every world', 'New worlds as they launch', 'Cancel any time'],
    grants: ['worlds'],
    available: true,
    razorpayPlanEnv: 'RAZORPAY_PLAN_PRO',
  },
  career: {
    id: 'career',
    name: 'Career',
    amount: 99900,
    tagline: 'Pro, plus interview prep.',
    features: [
      'Everything in Pro',
      'Interview-question levels from MNCs, FAANG and the Big 4',
      'Cancel any time',
    ],
    grants: ['worlds', 'interview'],
    // Interview levels aren't built yet — flip to true when they launch.
    available: false,
    razorpayPlanEnv: 'RAZORPAY_PLAN_CAREER',
  },
  interview: {
    id: 'interview',
    name: 'Interview',
    // PLACEHOLDER price — set the real one before launch.
    amount: 69900,
    tagline: 'Just the interview questions.',
    features: [
      'Interview-question levels from MNCs, FAANG and the Big 4',
      'No world access (buy worlds separately or go Career)',
      'Cancel any time',
    ],
    grants: ['interview'],
    available: false,
    razorpayPlanEnv: 'RAZORPAY_PLAN_INTERVIEW',
  },
}

export const isPlanId = (v: unknown): v is PlanId => typeof v === 'string' && v in PLANS

/** "₹499" — paise to a display price (whole rupees, Indian grouping). */
export function formatInr(paise: number): string {
  const rupees = paise / 100
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: rupees % 1 ? 2 : 0 })}`
}

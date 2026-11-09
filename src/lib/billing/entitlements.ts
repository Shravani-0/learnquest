import { PLANS, isPlanId, type PlanId } from './catalog'

/** A row of public.entitlements (see 0005_billing.sql). */
export interface EntitlementRow {
  kind: 'level' | 'world' | 'plan'
  adventure_id: string | null
  level_number: number | null
  plan: string | null
  status: string
  expires_at: string | null
}

/** What a player currently owns, flattened for quick checks. */
export interface Ownership {
  plans: PlanId[]
  worlds: string[]
  /** `${adventureId}:${level}` */
  levels: string[]
}

export const NO_OWNERSHIP: Ownership = { plans: [], worlds: [], levels: [] }

/** Keep only live entitlements: active, and (for plans) not past their paid-up date. */
export function toOwnership(rows: EntitlementRow[], now = Date.now()): Ownership {
  const live = rows.filter(
    r => r.status === 'active' && (r.expires_at == null || Date.parse(r.expires_at) > now),
  )
  return {
    plans: [...new Set(live.filter(r => r.kind === 'plan' && isPlanId(r.plan)).map(r => r.plan as PlanId))],
    worlds: [...new Set(live.filter(r => r.kind === 'world' && r.adventure_id).map(r => r.adventure_id!))],
    levels: [
      ...new Set(
        live
          .filter(r => r.kind === 'level' && r.adventure_id && r.level_number != null)
          .map(r => `${r.adventure_id}:${r.level_number}`),
      ),
    ],
  }
}

/** The best plan the player holds that covers every world (Pro or Career), if any. */
export function worldsPlan(o: Ownership): PlanId | null {
  return o.plans.find(p => PLANS[p].grants.includes('worlds')) ?? null
}

export function ownsWorld(o: Ownership, adventureId: string): boolean {
  return worldsPlan(o) != null || o.worlds.includes(adventureId)
}

/** Can this player open this level? Free trial levels are always open. */
export function canPlayLevel(o: Ownership, adventureId: string, level: number, trialLevel: number): boolean {
  if (level <= trialLevel) return true
  return ownsWorld(o, adventureId) || o.levels.includes(`${adventureId}:${level}`)
}

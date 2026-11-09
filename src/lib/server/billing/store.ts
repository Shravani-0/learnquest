import 'server-only'

import { createAdminClient, serviceConfigured } from '@/lib/supabase/admin'
import { NO_OWNERSHIP, toOwnership, type EntitlementRow, type Ownership } from '@/lib/billing/entitlements'
import { isPlanId, type PlanId } from '@/lib/billing/catalog'
import type { Database } from '@/lib/supabase/types'

/**
 * Reads and writes for payments + entitlements. Service role only — the tables
 * have no client write policies (0005_billing.sql).
 */

type PaymentRow = Database['public']['Tables']['payments']['Row']
type PaymentInsert = Database['public']['Tables']['payments']['Insert']

/** Renewal webhooks can lag a little behind the period end; don't lock players out for that. */
export const PLAN_GRACE_MS = 24 * 60 * 60 * 1000

export async function getOwnership(userId: string | null): Promise<Ownership> {
  if (!userId || !serviceConfigured) return NO_OWNERSHIP
  const db = createAdminClient()
  const { data } = await db
    .from('entitlements')
    .select('kind, adventure_id, level_number, plan, status, expires_at')
    .eq('user_id', userId)
  return toOwnership((data ?? []) as EntitlementRow[])
}

/** The player's current monthly plan, for the pricing page's "your plan" row. */
export async function getActivePlan(
  userId: string | null,
): Promise<{ plan: PlanId; paidUntil: string | null; cancelling: boolean } | null> {
  if (!userId || !serviceConfigured) return null
  const db = createAdminClient()
  const { data } = await db
    .from('entitlements')
    .select('plan, expires_at, source')
    .eq('user_id', userId)
    .eq('kind', 'plan')
    .eq('status', 'active')
  const live = (data ?? []).find(r => isPlanId(r.plan) && (!r.expires_at || Date.parse(r.expires_at) > Date.now()))
  if (!live) return null
  const { data: pay } = await db
    .from('payments')
    .select('status')
    .eq('razorpay_subscription_id', live.source)
    .maybeSingle()
  return {
    plan: live.plan as PlanId,
    // Show the period end, not the grace window.
    paidUntil: live.expires_at ? new Date(Date.parse(live.expires_at) - PLAN_GRACE_MS).toISOString() : null,
    cancelling: pay?.status === 'cancelled',
  }
}

export async function createPaymentRecord(row: PaymentInsert): Promise<void> {
  const db = createAdminClient()
  const { error } = await db.from('payments').insert(row)
  if (error) throw new Error(`payments insert: ${error.message}`)
}

export async function findPayment(by: { orderId?: string; subscriptionId?: string }): Promise<PaymentRow | null> {
  const db = createAdminClient()
  const q = db.from('payments').select('*')
  const { data } = by.orderId
    ? await q.eq('razorpay_order_id', by.orderId).maybeSingle()
    : await q.eq('razorpay_subscription_id', by.subscriptionId ?? '').maybeSingle()
  return (data as PaymentRow | null) ?? null
}

/**
 * Mark a payment paid and grant what it bought. Idempotent: the entitlement is
 * keyed by the Razorpay order/subscription id, so a second confirmation (the
 * browser callback and the webhook both arrive) changes nothing.
 */
export async function fulfilPayment(
  payment: PaymentRow,
  paymentId: string | null,
  planPaidUntil?: Date | null,
): Promise<void> {
  const db = createAdminClient()
  const source = payment.razorpay_order_id ?? payment.razorpay_subscription_id!
  // Plans always carry an end date (never null = forever); one-time purchases never expire.
  const paidUntil = planPaidUntil ?? new Date(Date.now() + 31 * 24 * 60 * 60 * 1000)
  const expires = payment.kind === 'plan' ? new Date(paidUntil.getTime() + PLAN_GRACE_MS).toISOString() : null

  const { error } = await db.from('entitlements').upsert(
    {
      user_id: payment.user_id,
      kind: payment.kind,
      adventure_id: payment.kind === 'plan' ? null : payment.adventure_id,
      level_number: payment.kind === 'level' ? payment.level_number : null,
      plan: payment.kind === 'plan' ? payment.plan : null,
      status: 'active',
      expires_at: expires,
      source,
    },
    { onConflict: 'source' },
  )
  if (error) throw new Error(`entitlements upsert: ${error.message}`)

  await db
    .from('payments')
    .update({ status: 'paid', ...(paymentId ? { razorpay_payment_id: paymentId } : {}) })
    .eq('id', payment.id)
}

/** A plan's subscription ended (cancelled, halted for failed payments, completed). */
export async function endPlan(subscriptionId: string): Promise<void> {
  const db = createAdminClient()
  await db.from('entitlements').update({ status: 'cancelled' }).eq('source', subscriptionId)
}

export async function markPaymentFailed(by: { orderId?: string; subscriptionId?: string }): Promise<void> {
  const db = createAdminClient()
  const q = db.from('payments').update({ status: 'failed' }).eq('status', 'created')
  if (by.orderId) await q.eq('razorpay_order_id', by.orderId)
  else if (by.subscriptionId) await q.eq('razorpay_subscription_id', by.subscriptionId)
}

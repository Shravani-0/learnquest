'use server'

import { revalidatePath } from 'next/cache'
import { getUser } from '@/lib/db/queries'
import { getAdventureBySlug } from '@/lib/data/adventures'
import { LEVEL_COUNTS, TRIAL_LEVEL } from '@/lib/server/quests/access'
import { CURRENCY, ONE_TIME_PRICES, PLANS, isPlanId, type PlanId } from '@/lib/billing/catalog'
import { canPlayLevel, ownsWorld } from '@/lib/billing/entitlements'
import * as rzp from '@/lib/server/billing/razorpay'
import * as store from '@/lib/server/billing/store'
import { createAdminClient } from '@/lib/supabase/admin'

export type CheckoutItem =
  | { kind: 'level'; adventureId: string; level: number }
  | { kind: 'world'; adventureId: string }
  | { kind: 'plan'; plan: PlanId }

/** What the browser needs to open Razorpay Checkout. Never includes a secret. */
export type CheckoutStart =
  | {
      ok: true
      keyId: string
      mode: 'order'
      orderId: string
      amount: number
      currency: string
      description: string
      email: string
    }
  | { ok: true; keyId: string; mode: 'subscription'; subscriptionId: string; description: string; email: string }
  | { ok: false; error: string; needLogin?: boolean }

const NOT_SET_UP = 'Payments aren’t set up yet. Please try again later.'

/**
 * Start a purchase. Everything that decides the price or what's granted is
 * resolved here, on the server, from the catalog — the browser only names the item.
 */
export async function startCheckout(item: CheckoutItem): Promise<CheckoutStart> {
  const user = await getUser()
  if (!user) return { ok: false, error: 'Sign in to unlock this.', needLogin: true }
  if (!rzp.razorpayConfigured) return { ok: false, error: NOT_SET_UP }

  const owned = await store.getOwnership(user.id)
  const email = user.email ?? ''
  const notes = { user_id: user.id, kind: item.kind }

  try {
    if (item.kind === 'plan') {
      if (!isPlanId(item.plan)) return { ok: false, error: 'Unknown plan.' }
      const plan = PLANS[item.plan]
      if (!plan.available) return { ok: false, error: `${plan.name} is coming soon.` }
      if (owned.plans.includes(plan.id)) return { ok: false, error: `You already have ${plan.name}.` }
      const planId = process.env[plan.razorpayPlanEnv]
      if (!planId) return { ok: false, error: NOT_SET_UP }

      const sub = await rzp.createSubscription(planId, { ...notes, plan: plan.id })
      await store.createPaymentRecord({
        user_id: user.id, kind: 'plan', plan: plan.id, amount: plan.amount, currency: CURRENCY,
        razorpay_subscription_id: sub.id,
      })
      return {
        ok: true, keyId: rzp.razorpayKeyId(), mode: 'subscription', subscriptionId: sub.id,
        description: `unrust ${plan.name} — monthly`, email,
      }
    }

    const adv = getAdventureBySlug(item.adventureId)
    const count = LEVEL_COUNTS[item.adventureId]
    if (!adv || adv.isComingSoon || !count) return { ok: false, error: 'This world isn’t available.' }

    if (item.kind === 'world') {
      if (ownsWorld(owned, adv.id)) return { ok: false, error: 'You already have every level of this world.' }
      const amount = ONE_TIME_PRICES.world
      const order = await rzp.createOrder(amount, CURRENCY, `w_${adv.id}_${user.id.slice(0, 8)}`, { ...notes, adventure_id: adv.id })
      await store.createPaymentRecord({
        user_id: user.id, kind: 'world', adventure_id: adv.id, amount, currency: CURRENCY,
        razorpay_order_id: order.id,
      })
      return {
        ok: true, keyId: rzp.razorpayKeyId(), mode: 'order', orderId: order.id, amount, currency: CURRENCY,
        description: `${adv.title} — all levels`, email,
      }
    }

    const level = Math.floor(Number(item.level))
    if (!Number.isFinite(level) || level <= TRIAL_LEVEL || level > count) {
      return { ok: false, error: 'That level can’t be bought.' }
    }
    if (canPlayLevel(owned, adv.id, level, TRIAL_LEVEL)) return { ok: false, error: 'You already have this level.' }
    const amount = ONE_TIME_PRICES.level
    const order = await rzp.createOrder(amount, CURRENCY, `l_${adv.id}_${level}_${user.id.slice(0, 8)}`, {
      ...notes, adventure_id: adv.id, level_number: String(level),
    })
    await store.createPaymentRecord({
      user_id: user.id, kind: 'level', adventure_id: adv.id, level_number: level, amount, currency: CURRENCY,
      razorpay_order_id: order.id,
    })
    return {
      ok: true, keyId: rzp.razorpayKeyId(), mode: 'order', orderId: order.id, amount, currency: CURRENCY,
      description: `${adv.title} — level ${level}`, email,
    }
  } catch {
    return { ok: false, error: 'Couldn’t start the payment. Please try again.' }
  }
}

/**
 * Checkout succeeded in the browser. Verify Razorpay's signature, then grant.
 * The webhook does the same independently, so a closed tab still gets fulfilled.
 */
export async function confirmCheckout(input: {
  orderId?: string
  subscriptionId?: string
  paymentId: string
  signature: string
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getUser()
  if (!user) return { ok: false, error: 'Sign in again to finish.' }

  const payment = await store.findPayment(
    input.orderId ? { orderId: String(input.orderId) } : { subscriptionId: String(input.subscriptionId ?? '') },
  )
  // Only the buyer can confirm their own payment.
  if (!payment || payment.user_id !== user.id) return { ok: false, error: 'Payment not found.' }

  const valid = payment.razorpay_order_id
    ? rzp.verifyOrderPayment(payment.razorpay_order_id, input.paymentId, input.signature)
    : rzp.verifySubscriptionPayment(payment.razorpay_subscription_id!, input.paymentId, input.signature)
  if (!valid) return { ok: false, error: 'We couldn’t verify that payment.' }

  let paidUntil: Date | null = null
  if (payment.kind === 'plan') {
    const sub = await rzp.fetchSubscription(payment.razorpay_subscription_id!).catch(() => null)
    paidUntil = sub?.current_end ? new Date(sub.current_end * 1000) : new Date(Date.now() + 31 * 24 * 3600 * 1000)
  }
  await store.fulfilPayment(payment, input.paymentId, paidUntil)

  revalidatePath('/', 'layout')
  return { ok: true }
}

/** Cancel a plan at the end of the current paid month. Access continues until then. */
export async function cancelPlan(plan: PlanId): Promise<{ ok: boolean; error?: string }> {
  const user = await getUser()
  if (!user) return { ok: false, error: 'Sign in first.' }
  if (!isPlanId(plan) || !rzp.razorpayConfigured) return { ok: false, error: NOT_SET_UP }

  const db = createAdminClient()
  const { data } = await db
    .from('entitlements')
    .select('source')
    .eq('user_id', user.id)
    .eq('kind', 'plan')
    .eq('plan', plan)
    .eq('status', 'active')
    .maybeSingle()
  if (!data?.source) return { ok: false, error: 'No active plan to cancel.' }

  try {
    await rzp.cancelSubscription(data.source)
  } catch {
    return { ok: false, error: 'Couldn’t cancel right now. Please try again.' }
  }
  await db.from('payments').update({ status: 'cancelled' }).eq('razorpay_subscription_id', data.source)
  revalidatePath('/pricing')
  return { ok: true }
}

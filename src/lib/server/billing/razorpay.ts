import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Thin Razorpay REST client (no SDK) + signature checks.
 *
 * Env (server only, see .env.local.example):
 *   RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET   API keys (Dashboard → Account & Settings → API Keys)
 *   RAZORPAY_WEBHOOK_SECRET                 secret set on the webhook (Dashboard → Webhooks)
 *   RAZORPAY_PLAN_PRO / _CAREER / _INTERVIEW  plan ids created in Dashboard → Subscriptions → Plans
 * The key id is also sent to the browser to open Checkout; that's what it's for.
 */

const API = 'https://api.razorpay.com/v1'

export const razorpayConfigured = !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET

export function razorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID ?? ''
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } }
  if (!res.ok) throw new Error(`Razorpay ${path}: ${json.error?.description ?? res.status}`)
  return json
}

export type Notes = Record<string, string>

/** One-time payment: an order for a fixed amount (paise). */
export function createOrder(amount: number, currency: string, receipt: string, notes: Notes) {
  return call<{ id: string; amount: number; currency: string; status: string }>('POST', '/orders', {
    amount,
    currency,
    receipt: receipt.slice(0, 40),
    notes,
  })
}

/** Monthly plan: a subscription to a plan created in the Razorpay dashboard. */
export function createSubscription(planId: string, notes: Notes) {
  return call<{ id: string; status: string; short_url?: string }>('POST', '/subscriptions', {
    plan_id: planId,
    total_count: 120, // monthly for up to 10 years; the player can cancel any time
    customer_notify: 1,
    notes,
  })
}

export interface RazorpaySubscription {
  id: string
  status: string
  /** End of the current paid period, unix seconds. */
  current_end: number | null
  notes?: Notes
}

export function fetchSubscription(id: string) {
  return call<RazorpaySubscription>('GET', `/subscriptions/${encodeURIComponent(id)}`)
}

export function cancelSubscription(id: string) {
  return call<RazorpaySubscription>('POST', `/subscriptions/${encodeURIComponent(id)}/cancel`, {
    cancel_at_cycle_end: 1,
  })
}

// ─── Signatures ────────────────────────────────────────────────────────────────

function hmacHex(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

/** Constant-time compare of two hex signatures. */
function sameSignature(expected: string, given: string): boolean {
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(String(given ?? ''), 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Checkout success for an order: HMAC(order_id|payment_id, key secret). */
export function verifyOrderPayment(orderId: string, paymentId: string, signature: string, secret = process.env.RAZORPAY_KEY_SECRET ?? ''): boolean {
  if (!secret || !orderId || !paymentId) return false
  return sameSignature(hmacHex(secret, `${orderId}|${paymentId}`), signature)
}

/** Checkout success for a subscription: HMAC(payment_id|subscription_id, key secret). */
export function verifySubscriptionPayment(subscriptionId: string, paymentId: string, signature: string, secret = process.env.RAZORPAY_KEY_SECRET ?? ''): boolean {
  if (!secret || !subscriptionId || !paymentId) return false
  return sameSignature(hmacHex(secret, `${paymentId}|${subscriptionId}`), signature)
}

/** Webhook: HMAC(raw request body, webhook secret) in the X-Razorpay-Signature header. */
export function verifyWebhook(rawBody: string, signature: string | null, secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? ''): boolean {
  if (!secret || !signature) return false
  return sameSignature(hmacHex(secret, rawBody), signature)
}

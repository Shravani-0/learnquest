import { NextResponse } from 'next/server'
import { verifyWebhook } from '@/lib/server/billing/razorpay'
import * as store from '@/lib/server/billing/store'

/**
 * Razorpay webhook (Dashboard → Webhooks → https://<site>/api/razorpay/webhook).
 * Subscribe to: order.paid, payment.failed, subscription.activated,
 * subscription.charged, subscription.cancelled, subscription.halted,
 * subscription.completed.
 *
 * The browser confirms checkout too, but this is the source of truth: it covers
 * closed tabs and every monthly renewal. All handling is idempotent.
 */

type Entity<T> = { entity: T } | undefined
interface WebhookEvent {
  event: string
  payload: {
    order?: Entity<{ id: string }>
    payment?: Entity<{ id: string; order_id?: string | null }>
    subscription?: Entity<{ id: string; current_end?: number | null }>
  }
}

export async function POST(req: Request) {
  const raw = await req.text()
  if (!verifyWebhook(raw, req.headers.get('x-razorpay-signature'))) {
    return NextResponse.json({ error: 'bad signature' }, { status: 400 })
  }

  let evt: WebhookEvent
  try {
    evt = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'bad body' }, { status: 400 })
  }

  const p = evt.payload ?? {}
  try {
    switch (evt.event) {
      case 'order.paid': {
        const orderId = p.order?.entity.id
        const payment = orderId ? await store.findPayment({ orderId }) : null
        if (payment) await store.fulfilPayment(payment, p.payment?.entity.id ?? null)
        break
      }
      case 'payment.failed': {
        const orderId = p.payment?.entity.order_id
        if (orderId) await store.markPaymentFailed({ orderId })
        break
      }
      case 'subscription.activated':
      case 'subscription.charged':
      case 'subscription.resumed': {
        const sub = p.subscription?.entity
        const payment = sub ? await store.findPayment({ subscriptionId: sub.id }) : null
        if (payment && sub) {
          const paidUntil = sub.current_end ? new Date(sub.current_end * 1000) : null
          await store.fulfilPayment(payment, p.payment?.entity.id ?? null, paidUntil)
        }
        break
      }
      case 'subscription.cancelled':
      case 'subscription.halted':
      case 'subscription.completed': {
        const id = p.subscription?.entity.id
        if (id) await store.endPlan(id)
        break
      }
      default:
        break // not an event we act on
    }
  } catch {
    // Let Razorpay retry (it backs off) rather than silently dropping a payment.
    return NextResponse.json({ error: 'temporary failure' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

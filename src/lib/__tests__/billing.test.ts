import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'crypto'
import { fakeSupabase } from './helpers/fake-supabase'

// ── Env + mocks ─────────────────────────────────────────────────────────────────
const state = vi.hoisted(() => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_key'
  process.env.RAZORPAY_KEY_SECRET = 'key_secret'
  process.env.RAZORPAY_WEBHOOK_SECRET = 'hook_secret'
  process.env.RAZORPAY_PLAN_PRO = 'plan_PRO'
  return {
    user: null as { id: string; email?: string } | null,
    rzpOn: true,
    admin: null as unknown as ReturnType<typeof import('./helpers/fake-supabase').fakeSupabase>,
  }
})

vi.mock('@/lib/db/queries', () => ({ getUser: async () => state.user }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ serviceConfigured: true, createAdminClient: () => state.admin.client }))
vi.mock('@/lib/server/billing/razorpay', async orig => {
  const real = await orig<typeof import('@/lib/server/billing/razorpay')>()
  return {
    ...real,
    get razorpayConfigured() { return state.rzpOn },
    createOrder: vi.fn(async (amount: number) => ({ id: 'order_1', amount, currency: 'INR', status: 'created' })),
    createSubscription: vi.fn(async () => ({ id: 'sub_1', status: 'created' })),
    fetchSubscription: vi.fn(async () => ({ id: 'sub_1', status: 'active', current_end: 1_900_000_000 })),
    cancelSubscription: vi.fn(async () => ({ id: 'sub_1', status: 'active', current_end: null })),
  }
})

import { ONE_TIME_PRICES, PLANS, formatInr } from '@/lib/billing/catalog'
import { toOwnership, canPlayLevel, ownsWorld, worldsPlan, type EntitlementRow } from '@/lib/billing/entitlements'
import * as rzp from '@/lib/server/billing/razorpay'
import { PLAN_GRACE_MS } from '@/lib/server/billing/store'
import { startCheckout, confirmCheckout } from '@/app/billing/actions'
import { POST as webhook } from '@/app/api/razorpay/webhook/route'

const hmac = (secret: string, payload: string) => createHmac('sha256', secret).update(payload).digest('hex')
const ent = (e: Partial<EntitlementRow>): EntitlementRow => ({
  kind: 'level', adventure_id: null, level_number: null, plan: null, status: 'active', expires_at: null, ...e,
})
const future = () => new Date(Date.now() + 86_400_000).toISOString()

beforeEach(() => {
  vi.clearAllMocks()
  state.user = { id: 'u1', email: 'ada@example.com' }
  state.rzpOn = true
  state.admin = fakeSupabase()
})

// ═════════════════════════════════════════════════════════════════════════════
describe('price list', () => {
  it('charges ₹49 a level, ₹299 a world, ₹499/₹999 a month for Pro/Career', () => {
    expect(ONE_TIME_PRICES).toEqual({ level: 4900, world: 29900 })
    expect(PLANS.pro.amount).toBe(49900)
    expect(PLANS.career.amount).toBe(99900)
  })

  it('makes Career a superset of Pro, and Interview interview-only', () => {
    expect(PLANS.pro.grants).toEqual(['worlds'])
    expect(PLANS.career.grants).toEqual(expect.arrayContaining(['worlds', 'interview']))
    expect(PLANS.interview.grants).toEqual(['interview'])
  })

  it('keeps Career and Interview off sale until interview levels exist', () => {
    expect(PLANS.pro.available).toBe(true)
    expect(PLANS.career.available).toBe(false)
    expect(PLANS.interview.available).toBe(false)
  })

  it('formats paise as rupees', () => {
    expect(formatInr(4900)).toBe('₹49')
    expect(formatInr(99900)).toBe('₹999')
    expect(formatInr(12345600)).toBe('₹1,23,456')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('what a player owns', () => {
  it('ignores cancelled rows and plans past their end date', () => {
    const o = toOwnership([
      ent({ kind: 'plan', plan: 'pro', expires_at: new Date(Date.now() - 1).toISOString() }),
      ent({ kind: 'world', adventure_id: 'linux-prison-break', status: 'cancelled' }),
      ent({ kind: 'level', adventure_id: 'sql-murder-mystery', level_number: 3 }),
    ])
    expect(o).toEqual({ plans: [], worlds: [], levels: ['sql-murder-mystery:3'] })
  })

  it('always opens the free trial', () => {
    const none = toOwnership([])
    expect(canPlayLevel(none, 'linux-prison-break', 1, 2)).toBe(true)
    expect(canPlayLevel(none, 'linux-prison-break', 2, 2)).toBe(true)
    expect(canPlayLevel(none, 'linux-prison-break', 3, 2)).toBe(false)
  })

  it('opens only the bought level, in that world', () => {
    const o = toOwnership([ent({ kind: 'level', adventure_id: 'linux-prison-break', level_number: 6 })])
    expect(canPlayLevel(o, 'linux-prison-break', 6, 2)).toBe(true)
    expect(canPlayLevel(o, 'linux-prison-break', 5, 2)).toBe(false)
    expect(canPlayLevel(o, 'sql-murder-mystery', 6, 2)).toBe(false)
  })

  it('opens every world with Pro or Career, but not with Interview alone', () => {
    for (const plan of ['pro', 'career'] as const) {
      const o = toOwnership([ent({ kind: 'plan', plan, expires_at: future() })])
      expect(worldsPlan(o)).toBe(plan)
      expect(ownsWorld(o, 'sql-murder-mystery')).toBe(true)
    }
    const interview = toOwnership([ent({ kind: 'plan', plan: 'interview', expires_at: future() })])
    expect(canPlayLevel(interview, 'linux-prison-break', 5, 2)).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('Razorpay signature checks', () => {
  it('accepts a genuine checkout signature for an order', () => {
    const sig = hmac('key_secret', 'order_1|pay_1')
    expect(rzp.verifyOrderPayment('order_1', 'pay_1', sig)).toBe(true)
  })

  it('rejects a forged, tampered or empty order signature', () => {
    const sig = hmac('key_secret', 'order_1|pay_1')
    expect(rzp.verifyOrderPayment('order_2', 'pay_1', sig)).toBe(false)
    expect(rzp.verifyOrderPayment('order_1', 'pay_1', hmac('wrong', 'order_1|pay_1'))).toBe(false)
    expect(rzp.verifyOrderPayment('order_1', 'pay_1', '')).toBe(false)
    expect(rzp.verifyOrderPayment('order_1', 'pay_1', sig, '')).toBe(false) // no secret configured
  })

  it('checks subscriptions as payment_id|subscription_id', () => {
    expect(rzp.verifySubscriptionPayment('sub_1', 'pay_1', hmac('key_secret', 'pay_1|sub_1'))).toBe(true)
    expect(rzp.verifySubscriptionPayment('sub_1', 'pay_1', hmac('key_secret', 'sub_1|pay_1'))).toBe(false)
  })

  it('verifies webhooks against the raw body', () => {
    const body = '{"event":"order.paid"}'
    expect(rzp.verifyWebhook(body, hmac('hook_secret', body))).toBe(true)
    expect(rzp.verifyWebhook(body + ' ', hmac('hook_secret', body))).toBe(false)
    expect(rzp.verifyWebhook(body, null)).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('starting a checkout', () => {
  const inserted = () => state.admin.calls.find(c => c.table === 'payments' && c.method === 'insert')?.args[0]

  it('asks signed-out visitors to sign in', async () => {
    state.user = null
    expect(await startCheckout({ kind: 'world', adventureId: 'linux-prison-break' })).toMatchObject({ ok: false, needLogin: true })
  })

  it('says so when payments are not configured', async () => {
    state.rzpOn = false
    expect(await startCheckout({ kind: 'world', adventureId: 'linux-prison-break' })).toMatchObject({ ok: false, error: expect.stringMatching(/set up/) })
  })

  it('creates a ₹49 order for one level and records it', async () => {
    const res = await startCheckout({ kind: 'level', adventureId: 'linux-prison-break', level: 5 })
    expect(rzp.createOrder).toHaveBeenCalledWith(4900, 'INR', expect.any(String), expect.objectContaining({ user_id: 'u1', level_number: '5' }))
    expect(inserted()).toMatchObject({ user_id: 'u1', kind: 'level', adventure_id: 'linux-prison-break', level_number: 5, amount: 4900, razorpay_order_id: 'order_1' })
    expect(res).toMatchObject({ ok: true, mode: 'order', orderId: 'order_1', amount: 4900, keyId: 'rzp_test_key' })
    expect(JSON.stringify(res)).not.toContain('key_secret')
  })

  it('charges the catalog price whatever the browser sends', async () => {
    await startCheckout({ kind: 'world', adventureId: 'linux-prison-break', amount: 1 } as never)
    expect(rzp.createOrder).toHaveBeenCalledWith(29900, 'INR', expect.any(String), expect.anything())
  })

  it.each([1, 2, 0, 11, Number.NaN])('refuses to sell level %s (free or out of range)', async level => {
    expect(await startCheckout({ kind: 'level', adventureId: 'linux-prison-break', level })).toMatchObject({ ok: false })
    expect(rzp.createOrder).not.toHaveBeenCalled()
  })

  it('refuses worlds that are not live', async () => {
    expect(await startCheckout({ kind: 'world', adventureId: 'git-time-traveler' })).toMatchObject({ ok: false })
  })

  it('does not sell what the player already owns', async () => {
    state.admin = fakeSupabase({
      tables: { entitlements: { data: [ent({ kind: 'world', adventure_id: 'linux-prison-break' })] } },
    })
    expect(await startCheckout({ kind: 'level', adventureId: 'linux-prison-break', level: 4 })).toMatchObject({ ok: false, error: expect.stringMatching(/already/) })
    expect(await startCheckout({ kind: 'world', adventureId: 'linux-prison-break' })).toMatchObject({ ok: false })
  })

  it('starts a Pro subscription on the configured Razorpay plan', async () => {
    const res = await startCheckout({ kind: 'plan', plan: 'pro' })
    expect(rzp.createSubscription).toHaveBeenCalledWith('plan_PRO', expect.objectContaining({ user_id: 'u1', plan: 'pro' }))
    expect(inserted()).toMatchObject({ kind: 'plan', plan: 'pro', amount: 49900, razorpay_subscription_id: 'sub_1' })
    expect(res).toMatchObject({ ok: true, mode: 'subscription', subscriptionId: 'sub_1' })
  })

  it('does not sell plans that are coming soon or unknown', async () => {
    expect(await startCheckout({ kind: 'plan', plan: 'career' })).toMatchObject({ ok: false, error: expect.stringMatching(/coming soon/) })
    expect(await startCheckout({ kind: 'plan', plan: 'gold' as never })).toMatchObject({ ok: false })
    expect(rzp.createSubscription).not.toHaveBeenCalled()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('confirming a checkout', () => {
  const orderPayment = { id: 'p1', user_id: 'u1', kind: 'level', adventure_id: 'linux-prison-break', level_number: 5, plan: null, razorpay_order_id: 'order_1', razorpay_subscription_id: null }
  const subPayment = { id: 'p2', user_id: 'u1', kind: 'plan', adventure_id: null, level_number: null, plan: 'pro', razorpay_order_id: null, razorpay_subscription_id: 'sub_1' }
  const granted = () => state.admin.calls.find(c => c.table === 'entitlements' && c.method === 'upsert')

  it('grants the level after a valid signature, keyed by the order id', async () => {
    state.admin = fakeSupabase({ tables: { payments: { data: orderPayment } } })
    const res = await confirmCheckout({ orderId: 'order_1', paymentId: 'pay_1', signature: hmac('key_secret', 'order_1|pay_1') })
    expect(res).toEqual({ ok: true })
    expect(granted()?.args).toEqual([
      { user_id: 'u1', kind: 'level', adventure_id: 'linux-prison-break', level_number: 5, plan: null, status: 'active', expires_at: null, source: 'order_1' },
      { onConflict: 'source' },
    ])
    expect(state.admin.calls).toContainEqual(expect.objectContaining({ table: 'payments', method: 'update', args: [{ status: 'paid', razorpay_payment_id: 'pay_1' }] }))
  })

  it('grants nothing for a bad signature', async () => {
    state.admin = fakeSupabase({ tables: { payments: { data: orderPayment } } })
    const res = await confirmCheckout({ orderId: 'order_1', paymentId: 'pay_1', signature: 'deadbeef' })
    expect(res.ok).toBe(false)
    expect(granted()).toBeUndefined()
  })

  it('will not confirm someone else’s payment', async () => {
    state.admin = fakeSupabase({ tables: { payments: { data: { ...orderPayment, user_id: 'someone-else' } } } })
    const res = await confirmCheckout({ orderId: 'order_1', paymentId: 'pay_1', signature: hmac('key_secret', 'order_1|pay_1') })
    expect(res.ok).toBe(false)
    expect(granted()).toBeUndefined()
  })

  it('runs a plan until the end of the paid period, plus a short grace', async () => {
    state.admin = fakeSupabase({ tables: { payments: { data: subPayment } } })
    await confirmCheckout({ subscriptionId: 'sub_1', paymentId: 'pay_9', signature: hmac('key_secret', 'pay_9|sub_1') })
    const row = granted()?.args[0] as { expires_at: string; plan: string; source: string }
    expect(row).toMatchObject({ plan: 'pro', source: 'sub_1' })
    expect(Date.parse(row.expires_at)).toBe(1_900_000_000 * 1000 + PLAN_GRACE_MS)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('Razorpay webhook', () => {
  const send = (body: object, secret = 'hook_secret') => {
    const raw = JSON.stringify(body)
    return webhook(new Request('http://localhost/api/razorpay/webhook', {
      method: 'POST', body: raw, headers: { 'x-razorpay-signature': hmac(secret, raw) },
    }))
  }

  it('rejects requests not signed by Razorpay', async () => {
    const res = await send({ event: 'order.paid', payload: {} }, 'attacker')
    expect(res.status).toBe(400)
    expect(state.admin.client.from).not.toHaveBeenCalled()
  })

  it('fulfils an order when Razorpay says it was paid', async () => {
    state.admin = fakeSupabase({ tables: { payments: { data: { id: 'p1', user_id: 'u1', kind: 'world', adventure_id: 'linux-prison-break', razorpay_order_id: 'order_1' } } } })
    const res = await send({ event: 'order.paid', payload: { order: { entity: { id: 'order_1' } }, payment: { entity: { id: 'pay_1' } } } })
    expect(res.status).toBe(200)
    expect(state.admin.calls).toContainEqual(expect.objectContaining({ table: 'entitlements', method: 'upsert' }))
  })

  it('extends a plan on each monthly charge', async () => {
    state.admin = fakeSupabase({ tables: { payments: { data: { id: 'p2', user_id: 'u1', kind: 'plan', plan: 'pro', razorpay_subscription_id: 'sub_1' } } } })
    await send({ event: 'subscription.charged', payload: { subscription: { entity: { id: 'sub_1', current_end: 1_950_000_000 } } } })
    const up = state.admin.calls.find(c => c.table === 'entitlements' && c.method === 'upsert')?.args[0] as { expires_at: string }
    expect(Date.parse(up.expires_at)).toBe(1_950_000_000 * 1000 + PLAN_GRACE_MS)
  })

  it('ends a plan when the subscription is cancelled', async () => {
    await send({ event: 'subscription.cancelled', payload: { subscription: { entity: { id: 'sub_1' } } } })
    expect(state.admin.calls).toContainEqual(expect.objectContaining({ table: 'entitlements', method: 'update', args: [{ status: 'cancelled' }] }))
    expect(state.admin.calls).toContainEqual(expect.objectContaining({ method: 'eq', args: ['source', 'sub_1'] }))
  })

  it('acknowledges events it does not act on', async () => {
    expect((await send({ event: 'refund.created', payload: {} })).status).toBe(200)
  })
})

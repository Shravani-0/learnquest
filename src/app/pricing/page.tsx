import Link from 'next/link'
import Field from '@/components/home/Field'
import CheckoutButton from '@/components/billing/CheckoutButton'
import CancelPlanButton from '@/components/billing/CancelPlanButton'
import { getUser } from '@/lib/db/queries'
import { getActivePlan } from '@/lib/server/billing/store'
import { TRIAL_LEVEL } from '@/lib/server/quests/access'
import { ONE_TIME_PRICES, PLANS, formatInr, type PlanId } from '@/lib/billing/catalog'

export const metadata = {
  title: 'Pricing — unrust',
  description: 'The first levels of every world are free. Unlock a level, a whole world, or every world with Pro.',
}
export const dynamic = 'force-dynamic'

const PLAN_ORDER: PlanId[] = ['pro', 'career', 'interview']

export default async function PricingPage() {
  const user = await getUser()
  const current = await getActivePlan(user?.id ?? null)
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="sq sq-page">
      <Field />

      <header className="sq-phead">
        <div className="sq-shell">
          <div className="sq-phead__in">
            <p className="sq-kicker">pricing</p>
            <h1 className="sq-display sq-phead__title">Play free. <b>Unlock</b> what you want.</h1>
            <p className="sq-phead__lead">
              Levels 1–{TRIAL_LEVEL} of every world are free, no card needed. After that, unlock a single
              level, a whole world, or every world at once.
            </p>
          </div>
        </div>
      </header>

      <div className="sq-body">
        <div className="sq-shell sq-stack">
          {current && (
            <div className="sq-panel sq-current">
              <div className="sq-panel__bar">
                <h2 className="sq-panel__h">Your plan</h2>
                <span className="sq-panel__r">▸ {PLANS[current.plan].name}</span>
              </div>
              <div className="sq-panel__body sq-current__body">
                <span>
                  {current.cancelling
                    ? `Cancelled. You keep access until ${fmtDate(current.paidUntil)}.`
                    : `Renews monthly. Paid up to ${fmtDate(current.paidUntil)}.`}
                </span>
                {!current.cancelling && <CancelPlanButton plan={current.plan} until={fmtDate(current.paidUntil)} />}
              </div>
            </div>
          )}

          {/* One-time unlocks */}
          <section aria-labelledby="sq-pay-once">
            <h2 id="sq-pay-once" className="sq-kicker sq-pricing__h">pay once, keep forever</h2>
            <div className="sq-prices sq-prices--3">
              <article className="sq-price">
                <p className="sq-price__name">Free</p>
                <p className="sq-price__amt sq-num">₹0</p>
                <p className="sq-price__tag">Levels 1–{TRIAL_LEVEL} of every world.</p>
                <ul className="sq-bullets">
                  <li>No account needed to start</li>
                  <li>Sign in to save XP and progress</li>
                </ul>
                <Link href="/adventures" className="sq-btn sq-btn--ghost sq-price__cta">
                  <span className="sq-btn__fill" aria-hidden="true" />
                  start playing
                </Link>
              </article>
              <article className="sq-price">
                <p className="sq-price__name">One level</p>
                <p className="sq-price__amt sq-num">{formatInr(ONE_TIME_PRICES.level)}</p>
                <p className="sq-price__tag">Any single level beyond the free ones.</p>
                <ul className="sq-bullets">
                  <li>Opens right away, in any order</li>
                  <li>Yours to replay forever</li>
                </ul>
                <p className="sq-price__how">Unlock from a world&apos;s level list.</p>
              </article>
              <article className="sq-price">
                <p className="sq-price__name">One world</p>
                <p className="sq-price__amt sq-num">{formatInr(ONE_TIME_PRICES.world)}</p>
                <p className="sq-price__tag">Every level of one world.</p>
                <ul className="sq-bullets">
                  <li>All current levels of that world</li>
                  <li>Yours to keep</li>
                </ul>
                <p className="sq-price__how">Unlock from the world&apos;s page.</p>
              </article>
            </div>
          </section>

          {/* Monthly plans */}
          <section aria-labelledby="sq-pay-monthly">
            <h2 id="sq-pay-monthly" className="sq-kicker sq-pricing__h">monthly plans</h2>
            <div className="sq-prices sq-prices--3">
              {PLAN_ORDER.map(id => {
                const plan = PLANS[id]
                const isCurrent = current?.plan === id
                return (
                  <article key={id} className={`sq-price${id === 'pro' ? ' sq-price--hot' : ''}${plan.available ? '' : ' is-soon'}`}>
                    <p className="sq-price__name">
                      {plan.name}
                      {!plan.available && <span className="sq-tag">coming soon</span>}
                      {isCurrent && <span className="sq-tag sq-tag--hot">your plan</span>}
                    </p>
                    <p className="sq-price__amt sq-num">
                      {formatInr(plan.amount)}<small>/month</small>
                    </p>
                    <p className="sq-price__tag">{plan.tagline}</p>
                    <ul className="sq-bullets">
                      {plan.features.map(f => <li key={f}>{f}</li>)}
                    </ul>
                    {!plan.available ? (
                      <p className="sq-price__how">Launching with the interview levels.</p>
                    ) : isCurrent ? (
                      <p className="sq-price__how">You&apos;re on this plan.</p>
                    ) : user ? (
                      <CheckoutButton
                        item={{ kind: 'plan', plan: id }}
                        label={`get ${plan.name}`}
                        className={`sq-btn sq-price__cta${id === 'pro' ? '' : ' sq-btn--ghost'}`}
                      />
                    ) : (
                      <Link href="/login?next=/pricing" className="sq-btn sq-price__cta">
                        <span className="sq-btn__fill" aria-hidden="true" />
                        sign in to subscribe
                      </Link>
                    )}
                  </article>
                )
              })}
            </div>
          </section>

          <p className="sq-pricing__fine">
            Prices in Indian rupees. Payments are handled securely by Razorpay
            (UPI, cards, netbanking). Monthly plans renew automatically; cancel any time and keep access until the
            end of the month you paid for.
          </p>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { startCheckout, confirmCheckout, type CheckoutItem } from '@/app/billing/actions'

/** Razorpay Checkout's global, loaded on demand from their CDN. */
type RazorpayResponse = {
  razorpay_payment_id: string
  razorpay_order_id?: string
  razorpay_subscription_id?: string
  razorpay_signature: string
}
type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void }
declare global {
  interface Window { Razorpay?: RazorpayCtor }
}

let scriptLoad: Promise<void> | null = null
function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  scriptLoad ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      scriptLoad = null
      reject(new Error('load'))
    }
    document.body.appendChild(s)
  })
  return scriptLoad
}

/**
 * One button that buys one thing: asks the server to start the payment, opens
 * Razorpay Checkout, then has the server verify and grant it. Prices and what's
 * granted are decided on the server; this only names the item.
 */
export default function CheckoutButton({
  item,
  label,
  className = 'sq-btn',
  /** Where to go once paid (defaults to refreshing the current page). */
  successHref,
}: {
  item: CheckoutItem
  label: React.ReactNode
  className?: string
  successHref?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<'idle' | 'working' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function buy() {
    setError(null)
    setState('working')
    const start = await startCheckout(item)
    if (!start.ok) {
      setState('idle')
      if (start.needLogin) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`)
        return
      }
      setError(start.error)
      return
    }

    try {
      await loadRazorpay()
    } catch {
      setState('idle')
      setError('Couldn’t reach the payment page. Check your connection and try again.')
      return
    }

    const rzp = new window.Razorpay!({
      key: start.keyId,
      name: 'unrust',
      description: start.description,
      ...(start.mode === 'order'
        ? { order_id: start.orderId, amount: start.amount, currency: start.currency }
        : { subscription_id: start.subscriptionId }),
      prefill: { email: start.email },
      theme: { color: '#E4FF1A' },
      modal: { ondismiss: () => setState('idle') },
      handler: async (res: RazorpayResponse) => {
        const done = await confirmCheckout({
          orderId: res.razorpay_order_id,
          subscriptionId: res.razorpay_subscription_id,
          paymentId: res.razorpay_payment_id,
          signature: res.razorpay_signature,
        })
        if (!done.ok) {
          setState('idle')
          setError(`${done.error} If you were charged, it will unlock within a few minutes.`)
          return
        }
        setState('done')
        if (successHref) router.push(successHref)
        else router.refresh()
      },
    })
    rzp.on('payment.failed', () => setError('The payment didn’t go through. You haven’t been charged.'))
    rzp.open()
  }

  return (
    <span className="sq-buy">
      <button type="button" className={className} onClick={buy} disabled={state !== 'idle'} aria-busy={state === 'working'}>
        {className.includes('sq-btn') && <span className="sq-btn__fill" aria-hidden="true" />}
        {state === 'working' ? 'opening…' : state === 'done' ? 'unlocked ✓' : label}
      </button>
      {error && <span className="sq-buy__err" role="alert">{error}</span>}
    </span>
  )
}

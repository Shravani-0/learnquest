'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelPlan } from '@/app/billing/actions'
import type { PlanId } from '@/lib/billing/catalog'

/** Two-step cancel (no browser confirm dialogs): ask, then confirm in place. */
export default function CancelPlanButton({ plan, until }: { plan: PlanId; until: string }) {
  const router = useRouter()
  const [step, setStep] = useState<'idle' | 'confirm' | 'working'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function cancel() {
    setStep('working')
    const res = await cancelPlan(plan)
    if (!res.ok) {
      setError(res.error ?? 'Couldn’t cancel.')
      setStep('confirm')
      return
    }
    router.refresh()
  }

  if (step === 'idle') {
    return (
      <button type="button" className="sq-link" onClick={() => setStep('confirm')}>
        cancel plan
      </button>
    )
  }
  return (
    <span className="sq-buy">
      <span className="sq-buy__note">You keep access until {until}. Cancel?</span>
      <span className="sq-buy__row">
        <button type="button" className="sq-link" onClick={cancel} disabled={step === 'working'}>
          {step === 'working' ? 'cancelling…' : 'yes, cancel'}
        </button>
        <button type="button" className="sq-link" onClick={() => setStep('idle')} disabled={step === 'working'}>
          keep it
        </button>
      </span>
      {error && <span className="sq-buy__err" role="alert">{error}</span>}
    </span>
  )
}

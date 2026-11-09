'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createChallenge, acceptChallenge } from '@/app/challenges/actions'
import type { ChallengeSkill } from '@/lib/challenges/rules'

/** Skill picker → creates a challenge and opens its page (where the link is). */
export function CreateChallenge({ skills }: { skills: { id: ChallengeSkill; label: string }[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<ChallengeSkill | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function create(skill: ChallengeSkill) {
    setBusy(skill)
    setError(null)
    const res = await createChallenge(skill)
    if (!res.ok) {
      setBusy(null)
      if (res.needLogin) router.push('/login?next=/challenges')
      else setError(res.error)
      return
    }
    router.push(`/challenges/${res.code}`)
  }

  return (
    <div className="sq-duel-new">
      <div className="sq-duel-new__skills" role="group" aria-label="Pick a skill">
        {skills.map(s => (
          <button key={s.id} type="button" className="sq-btn" onClick={() => create(s.id)} disabled={busy != null}>
            <span className="sq-btn__fill" aria-hidden="true" />
            {busy === s.id ? 'creating…' : `challenge in ${s.label}`}
          </button>
        ))}
      </div>
      {error && <p className="sq-buy__err" role="alert">{error}</p>}
    </div>
  )
}

/** The invite link with a copy button (and the system share sheet on phones). */
export function ShareLink({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false)
  // Known only in the browser; checked after mount so server and client markup match.
  const [canShare, setCanShare] = useState(false)
  useEffect(() => setCanShare('share' in navigator), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  async function share() {
    try {
      await navigator.share({ title: 'unrust challenge', text, url })
    } catch {
      /* dismissed */
    }
  }

  return (
    <div className="sq-share">
      <input className="sq-input sq-share__url" readOnly value={url} aria-label="Challenge link" onFocus={e => e.currentTarget.select()} />
      <div className="sq-share__btns">
        <button type="button" className="sq-btn" onClick={copy}>
          <span className="sq-btn__fill" aria-hidden="true" />
          {copied ? 'copied ✓' : 'copy link'}
        </button>
        {canShare && (
          <button type="button" className="sq-btn sq-btn--ghost" onClick={share}>
            <span className="sq-btn__fill" aria-hidden="true" />
            share
          </button>
        )}
      </div>
    </div>
  )
}

export function AcceptChallenge({ code }: { code: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function accept() {
    setBusy(true)
    setError(null)
    const res = await acceptChallenge(code)
    if (!res.ok) {
      setBusy(false)
      if (res.needLogin) router.push(`/login?next=${encodeURIComponent(`/challenges/${code}`)}`)
      else setError(res.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="sq-stack" style={{ gap: '0.6rem', justifyItems: 'start' }}>
      <button type="button" className="sq-btn" onClick={accept} disabled={busy}>
        <span className="sq-btn__fill" aria-hidden="true" />
        {busy ? 'accepting…' : 'accept challenge'}
        <span className="sq-arrow" aria-hidden="true">→</span>
      </button>
      {error && <p className="sq-buy__err" role="alert" style={{ textAlign: 'left' }}>{error}</p>}
    </div>
  )
}

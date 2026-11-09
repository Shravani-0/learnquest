import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Field from '@/components/home/Field'
import { AcceptChallenge, ShareLink } from '@/components/challenges/ChallengeControls'
import ChallengeArena from '@/components/challenges/ChallengeArena'
import { getUser } from '@/lib/db/queries'
import { serviceConfigured } from '@/lib/supabase/admin'
import { CHALLENGE_SKILLS, elapsedMs, formatDuration, runOver, type Run } from '@/lib/challenges/rules'
import { loadChallenge, namesFor, settle, toRun } from '@/lib/server/challenges/service'
import { getPuzzle } from '@/lib/server/challenges/bank'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Challenge — unrust', robots: { index: false } }

function runLine(run: Run | null, skill: string): string {
  if (!run) return 'didn’t play'
  const t = elapsedMs(run)
  if (t != null) return `solved in ${formatDuration(t)} · ${run.moves} ${skill === 'sql' ? 'queries' : 'commands'}`
  return run.gaveUp ? 'gave up' : 'not solved'
}

export default async function ChallengePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  if (!serviceConfigured) notFound()

  await settle(code) // expire an old invite / score a finished duel before showing it
  const loaded = await loadChallenge(code)
  if (!loaded) notFound()
  const { challenge: c, runs } = loaded

  const user = await getUser()
  const me = user?.id ?? null
  const names = await namesFor([c.challenger_id, c.opponent_id])
  const challenger = names[c.challenger_id] ?? 'A player'
  const opponent = c.opponent_id ? names[c.opponent_id] ?? 'a player' : null
  const skill = CHALLENGE_SKILLS.find(s => s.id === c.skill)!
  const role = me === c.challenger_id ? 'challenger' : me && me === c.opponent_id ? 'opponent' : me ? 'visitor' : 'anon'
  const isPlayer = role === 'challenger' || role === 'opponent'

  const myRun = me ? toRun(runs.find(r => r.user_id === me)) : null
  const theirId = role === 'challenger' ? c.opponent_id : c.challenger_id
  const theirRun = theirId ? toRun(runs.find(r => r.user_id === theirId)) : null
  const now = Date.now()

  // The configured site address, so a spoofed Host header can't change the link.
  const h = await headers()
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`
  const shareUrl = `${origin}/challenges/${c.code}`
  const loginHref = `/login?next=${encodeURIComponent(`/challenges/${c.code}`)}`

  const title =
    c.status === 'finished'
      ? c.winner_id == null ? 'It’s a draw.' : c.winner_id === me ? 'You won.' : isPlayer ? 'You lost this one.' : `${names[c.winner_id] ?? 'Someone'} won.`
      : role === 'challenger' && c.status === 'open'
        ? 'Send this to a friend.'
        : `${role === 'challenger' ? 'You' : challenger} vs ${opponent ?? 'you'}`

  return (
    <div className="sq sq-page">
      <Field />
      <header className="sq-phead">
        <div className="sq-shell sq-stack">
          <Link href="/challenges" className="sq-back">challenges</Link>
          <div className="sq-phead__in">
            <p className="sq-kicker">{skill.label} challenge · {c.status === 'open' ? 'waiting' : c.status === 'active' ? 'live' : c.status}</p>
            <h1 className="sq-display sq-phead__title">{title}</h1>
          </div>
        </div>
      </header>

      <div className="sq-body">
        <div className="sq-shell sq-stack">
          {/* ── Invite stage ── */}
          {c.status === 'open' && role === 'challenger' && (
            <div className="sq-panel">
              <div className="sq-panel__body sq-stack" style={{ gap: '0.9rem' }}>
                <p className="sq-duel__lead">
                  Whoever opens this link and signs in becomes your opponent. You&apos;ll both get the same random
                  {' '}{skill.label} puzzle once they accept. The link works for 7 days.
                </p>
                <ShareLink url={shareUrl} text={`I challenge you to a ${skill.label} duel on unrust. Fastest solve wins.`} />
              </div>
            </div>
          )}
          {c.status === 'open' && role !== 'challenger' && (
            <div className="sq-panel">
              <div className="sq-panel__body sq-stack" style={{ gap: '1rem', justifyItems: 'start' }}>
                <p className="sq-duel__lead">
                  <b>{challenger}</b> challenges you to a <b>{skill.label}</b> duel. You&apos;ll both solve the same random
                  puzzle with one 15-minute run each. Fastest solve wins.
                </p>
                {role === 'anon' ? (
                  <Link href={loginHref} className="sq-btn">
                    <span className="sq-btn__fill" aria-hidden="true" />
                    sign in to accept
                    <span className="sq-arrow" aria-hidden="true">→</span>
                  </Link>
                ) : (
                  <AcceptChallenge code={c.code} />
                )}
              </div>
            </div>
          )}
          {c.status === 'expired' && (
            <p className="sq-panel__empty">This invite expired before anyone accepted it.</p>
          )}

          {/* ── Someone else's duel ── */}
          {c.status === 'active' && !isPlayer && (
            <p className="sq-panel__empty">
              This challenge is already between {challenger} and {opponent}.{' '}
              <Link href="/challenges" className="sq-link">Start your own</Link>.
            </p>
          )}

          {/* ── Live duel ── */}
          {c.status === 'active' && isPlayer && (
            <>
              <div className="sq-duel__status">
                <span>
                  <b>You:</b> {myRun ? (runOver(myRun, now) ? runLine(myRun, c.skill) : 'playing') : 'not started'}
                </span>
                <span>
                  <b>{role === 'challenger' ? opponent : challenger}:</b>{' '}
                  {theirRun ? (runOver(theirRun, now) ? 'finished' : 'playing') : 'not started'}
                </span>
                {c.deadline_at && (
                  <span>closes {new Date(c.deadline_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                )}
              </div>
              {myRun && runOver(myRun, now) ? (
                <p className="sq-panel__empty">
                  Your run is in. The result appears here as soon as {role === 'challenger' ? opponent : challenger} finishes
                  (or the challenge closes).
                </p>
              ) : (
                <ChallengeArena code={c.code} started={!!myRun} />
              )}
            </>
          )}

          {/* ── Result ── */}
          {c.status === 'finished' && (
            <div className="sq-panel">
              <div className="sq-panel__bar">
                <h2 className="sq-panel__h">{getPuzzle(c.puzzle_id)?.title ?? 'Result'}</h2>
                <span className="sq-panel__r">{skill.label}</span>
              </div>
              <div>
                {[
                  { id: c.challenger_id, name: challenger, run: toRun(runs.find(r => r.user_id === c.challenger_id)) },
                  { id: c.opponent_id!, name: opponent ?? 'opponent', run: toRun(runs.find(r => r.user_id === c.opponent_id)) },
                ].map(p => (
                  <div key={p.id} className={`sq-item${p.id === c.winner_id ? ' is-me' : ''}`}>
                    <span className="sq-item__main">
                      <span className="sq-item__title">{p.name}{p.id === me ? ' (you)' : ''}</span>
                      <span className="sq-item__meta">{runLine(p.run, c.skill)}</span>
                    </span>
                    <span className="sq-item__r sq-item__r--hot">{p.id === c.winner_id ? 'winner' : ''}</span>
                  </div>
                ))}
              </div>
              <div className="sq-panel__body">
                <Link href="/challenges" className="sq-btn">
                  <span className="sq-btn__fill" aria-hidden="true" />
                  {isPlayer ? 'rematch: new challenge' : 'start your own'}
                  <span className="sq-arrow" aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

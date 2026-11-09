import Link from 'next/link'
import Field from '@/components/home/Field'
import { CreateChallenge } from '@/components/challenges/ChallengeControls'
import { getUser } from '@/lib/db/queries'
import { serviceConfigured } from '@/lib/supabase/admin'
import { CHALLENGE_SKILLS } from '@/lib/challenges/rules'
import { listChallenges, namesFor, recordFrom } from '@/lib/server/challenges/service'

export const metadata = {
  title: 'Challenges — unrust',
  description: 'Challenge a friend in SQL or Linux. Same random puzzle, one timed run each, fastest solve wins.',
}
export const dynamic = 'force-dynamic'

const SKILL_LABEL = Object.fromEntries(CHALLENGE_SKILLS.map(s => [s.id, s.label]))

export default async function ChallengesPage() {
  const user = await getUser()
  const rows = user && serviceConfigured ? await listChallenges(user.id) : []
  const names = await namesFor(rows.flatMap(r => [r.challenger_id, r.opponent_id]))
  const record = user ? recordFrom(rows, user.id) : null

  const describe = (r: (typeof rows)[number]) => {
    const theirId = r.challenger_id === user!.id ? r.opponent_id : r.challenger_id
    const them = theirId ? names[theirId] ?? 'a player' : null
    if (r.status === 'open') return { who: 'waiting for a friend', state: 'link not used yet' }
    if (r.status === 'expired') return { who: 'nobody accepted', state: 'expired' }
    if (r.status === 'active') return { who: `vs ${them}`, state: 'in play' }
    const state = r.winner_id == null ? 'draw' : r.winner_id === user!.id ? 'you won' : 'you lost'
    return { who: `vs ${them}`, state }
  }

  return (
    <div className="sq sq-page">
      <Field />

      <header className="sq-phead">
        <div className="sq-shell">
          <div className="sq-phead__in">
            <p className="sq-kicker">challenges</p>
            <h1 className="sq-display sq-phead__title">Challenge a <b>friend</b>.</h1>
            <p className="sq-phead__lead">
              Pick a skill and send the link. When they accept, you both get the same random puzzle and one
              15-minute run each. Fastest solve wins; fewer queries or commands breaks a tie.
            </p>
          </div>
        </div>
      </header>

      <div className="sq-body">
        <div className="sq-shell sq-stack">
          {!user ? (
            <div className="sq-empty">
              <span><b>Sign in to start a challenge.</b> Your friend will need an account too.</span>
              <Link href="/login?next=/challenges" className="sq-btn">
                <span className="sq-btn__fill" aria-hidden="true" />
                sign in
                <span className="sq-arrow" aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <>
              <section className="sq-panel" aria-labelledby="sq-duel-new-h">
                <div className="sq-panel__bar">
                  <h2 id="sq-duel-new-h" className="sq-panel__h">New challenge</h2>
                  <span className="sq-panel__r">
                    free puzzles for everyone · premium with <Link href="/pricing" className="sq-link">Pro or the world</Link>
                  </span>
                </div>
                <div className="sq-panel__body">
                  <CreateChallenge skills={CHALLENGE_SKILLS.map(s => ({ id: s.id, label: s.label }))} />
                </div>
              </section>

              {record && (
                <div className="sq-readout">
                  <div className="sq-stats sq-stats--3 sq-stats--sm">
                    <div className="sq-stat"><span className="sq-display sq-stat__v sq-num">{record.wins}</span><span className="sq-stat__l">wins</span></div>
                    <div className="sq-stat"><span className="sq-display sq-stat__v sq-num">{record.losses}</span><span className="sq-stat__l">losses</span></div>
                    <div className="sq-stat"><span className="sq-display sq-stat__v sq-num">{record.draws}</span><span className="sq-stat__l">draws</span></div>
                  </div>
                </div>
              )}

              <section className="sq-panel" aria-labelledby="sq-duel-list-h">
                <div className="sq-panel__bar">
                  <h2 id="sq-duel-list-h" className="sq-panel__h">Your challenges</h2>
                </div>
                {rows.length === 0 ? (
                  <p className="sq-panel__empty">No challenges yet. Pick a skill above and send the link to a friend.</p>
                ) : (
                  <div>
                    {rows.map(r => {
                      const d = describe(r)
                      const hot = d.state === 'you won' || d.state === 'in play'
                      return (
                        <Link key={r.id} href={`/challenges/${r.code}`} className="sq-item">
                          <span className="sq-tag">{SKILL_LABEL[r.skill]}</span>
                          <span className="sq-item__main">
                            <span className="sq-item__title">{d.who}</span>
                            <span className="sq-item__meta">
                              {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          </span>
                          <span className={`sq-item__r${hot ? ' sq-item__r--hot' : ''}`}>{d.state}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

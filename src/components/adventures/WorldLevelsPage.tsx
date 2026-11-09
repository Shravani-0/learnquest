import Link from 'next/link'
import Field from '@/components/home/Field'
import type { Adventure, WorldLevel } from '@/lib/types'
import { SKILL_ABBR } from '@/lib/worlds'
import { WORLD_CLEARANCE } from '@/lib/xp'
import { ONE_TIME_PRICES, PLANS, formatInr } from '@/lib/billing/catalog'
import CheckoutButton from '@/components/billing/CheckoutButton'

interface Props {
  adventure: Adventure
  levels: WorldLevel[]
  completedLevelIds?: number[]
  isAuthed?: boolean
  /** Levels 1..trialLevel are free to play without an account. From the server. */
  trialLevel?: number
  /** Levels this player can open now (free trial + owned). From the server. */
  openLevelIds?: number[]
  /** Owns every level of this world (bought it, or holds Pro/Career). */
  ownsWorld?: boolean
  hasPlan?: boolean
  /** Arrived from an in-game "Unlock" prompt for this level. */
  unlockLevel?: number | null
}

/** paid = beyond the free trial and not owned yet. */
type Status = 'completed' | 'active' | 'paid' | 'locked'

const STATE_LABEL: Record<Status, string> = {
  completed: '✓ cleared',
  active: '● open',
  paid: '◌ locked',
  locked: '◌ locked',
}

export default function WorldLevelsPage({
  adventure,
  levels,
  completedLevelIds = [],
  isAuthed = false,
  trialLevel = 1,
  openLevelIds = [],
  ownsWorld = false,
  hasPlan = false,
  unlockLevel = null,
}: Props) {
  // Completion is authoritative from the server — never localStorage.
  const completedIds = completedLevelIds

  const isPlayable = !adventure.isComingSoon
  const totalXP = levels.reduce((sum, l) => sum + l.xpReward, 0)
  const totalTime = levels.reduce((sum, l) => sum + parseInt(l.duration), 0)
  const gate = WORLD_CLEARANCE[adventure.slug]

  const getStatus = (level: WorldLevel): Status => {
    if (!isPlayable) return 'locked'
    if (completedIds.includes(level.id)) return 'completed'
    // Free trial levels and owned levels open straight away, in any order.
    if (level.id <= trialLevel || openLevelIds.includes(level.id)) return 'active'
    return 'paid'
  }
  const hasPaidLevels = isPlayable && levels.some(l => getStatus(l) === 'paid')
  const loginHref = `/login?next=${encodeURIComponent(`/adventures/${adventure.slug}`)}`

  const firstActiveLevel = levels.find(l => getStatus(l) === 'active')
  const playHref = `/adventures/${adventure.slug}/play`
  const cleared = levels.filter(l => completedIds.includes(l.id)).length
  const pct = levels.length ? Math.round((cleared / levels.length) * 100) : 0

  return (
    <div className="sq sq-page">
      <Field />

      <header className="sq-phead">
        <div className="sq-shell sq-stack">
          <Link href="/adventures" className="sq-back">all worlds</Link>
          <div className="sq-world-head">
            <div className="sq-phead__in">
              <p className="sq-kicker">
                {isPlayable ? 'online' : 'locked'} · {adventure.genre.toLowerCase()} · {(SKILL_ABBR[adventure.skill] ?? adventure.skill).toLowerCase()}
              </p>
              <h1 className="sq-display sq-phead__title">{adventure.title}</h1>
              <p className="sq-phead__lead">{adventure.subtitle}</p>
            </div>
            {isPlayable && firstActiveLevel ? (
              <Link href={`${playHref}?level=${firstActiveLevel.id}`} className="sq-btn">
                <span className="sq-btn__fill" aria-hidden="true" />
                {completedIds.length > 0 ? `resume level ${firstActiveLevel.id}` : 'boot world'}
                <span className="sq-arrow" aria-hidden="true">→</span>
              </Link>
            ) : !isPlayable ? (
              <span className="sq-tag">{gate ? `needs ${gate} clearance` : 'in development'}</span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="sq-body">
        <div className="sq-shell sq-stack">
          <div className="sq-readout">
            <div className="sq-readout__bar">
              <span className="sq-dot">●</span>
              <b>{adventure.slug}</b>:~$ stat
            </div>
            <div className="sq-stats sq-stats--4">
              <div className="sq-stat">
                <span className="sq-display sq-stat__v sq-num">{levels.length}</span>
                <span className="sq-stat__l">levels</span>
              </div>
              <div className="sq-stat">
                <span className="sq-display sq-stat__v sq-num">{totalXP.toLocaleString()}</span>
                <span className="sq-stat__l">XP on offer</span>
              </div>
              <div className="sq-stat">
                <span className="sq-display sq-stat__v sq-num">~{totalTime}</span>
                <span className="sq-stat__l">minutes</span>
              </div>
              <div className="sq-stat">
                <span className="sq-display sq-stat__v sq-num">{pct}%</span>
                <span className="sq-stat__l">{isAuthed ? `cleared · ${cleared}/${levels.length}` : 'sign in to save progress'}</span>
              </div>
            </div>
          </div>

          <section aria-labelledby="sq-levels-h">
            <div className="sq-trackhead">
              <h2 id="sq-levels-h" className="sq-kicker">levels</h2>
              <div className="sq-tags">
                {adventure.concepts.map(c => <span key={c} className="sq-tag">{c}</span>)}
              </div>
            </div>

            <ol className="sq-track">
              {levels.map(level => {
                const status = getStatus(level)
                const open = status === 'active'
                return (
                  <li
                    key={level.id}
                    className={`sq-level is-${status === 'completed' ? 'done' : status}${open ? ' sq-level--link' : ''}`}
                  >
                    <span className="sq-level__bar" aria-hidden="true" />
                    <span className="sq-level__n">{String(level.id).padStart(2, '0')}</span>
                    <div className="sq-level__main">
                      <span className="sq-level__title">
                        {open ? <Link href={`${playHref}?level=${level.id}`}>{level.title}</Link> : level.title}
                        <span className="sq-tag">{level.concept}</span>
                      </span>
                      <p className="sq-level__desc">{level.description}</p>
                    </div>
                    <div className="sq-level__side">
                      {status === 'paid' && isAuthed ? (
                        <CheckoutButton
                          item={{ kind: 'level', adventureId: adventure.slug, level: level.id }}
                          label={`unlock ${formatInr(ONE_TIME_PRICES.level)}`}
                          className="sq-unlock"
                          successHref={`${playHref}?level=${level.id}`}
                        />
                      ) : (
                        <span className="sq-level__state">{STATE_LABEL[status]}</span>
                      )}
                      <span className="sq-level__xp sq-num">{level.xpReward} XP</span>
                      <span>{level.duration}</span>
                    </div>
                  </li>
                )
              })}
            </ol>

          </section>

          {hasPaidLevels && (
            <section id="unlock" className="sq-panel sq-unlockbox" aria-labelledby="sq-unlock-h">
              <div className="sq-panel__bar">
                <h2 id="sq-unlock-h" className="sq-panel__h">
                  {unlockLevel ? `Unlock level ${unlockLevel}` : 'Unlock the rest'}
                </h2>
                <span className="sq-panel__r">
                  {trialLevel > 1 ? `levels 1–${trialLevel}` : 'level 1'} free
                </span>
              </div>
              {!isAuthed ? (
                <p className="sq-panel__body sq-unlockbox__note">
                  <Link href={loginHref} className="sq-link">Sign in</Link> to unlock more levels and keep your XP.
                  Plans and prices are on the <Link href="/pricing" className="sq-link">pricing page</Link>.
                </p>
              ) : (
                <div className="sq-unlockbox__opts">
                  {unlockLevel && (
                    <div className="sq-unlockbox__opt">
                      <b>Just level {unlockLevel}</b>
                      <span>{formatInr(ONE_TIME_PRICES.level)} once</span>
                      <CheckoutButton
                        item={{ kind: 'level', adventureId: adventure.slug, level: unlockLevel }}
                        label="unlock level"
                        className="sq-btn sq-btn--ghost"
                        successHref={`${playHref}?level=${unlockLevel}`}
                      />
                    </div>
                  )}
                  {!ownsWorld && (
                    <div className="sq-unlockbox__opt">
                      <b>All of {adventure.title}</b>
                      <span>{formatInr(ONE_TIME_PRICES.world)} once · every level, yours to keep</span>
                      <CheckoutButton
                        item={{ kind: 'world', adventureId: adventure.slug }}
                        label="unlock world"
                        className={unlockLevel ? 'sq-btn sq-btn--ghost' : 'sq-btn'}
                      />
                    </div>
                  )}
                  {!hasPlan && (
                    <div className="sq-unlockbox__opt">
                      <b>{PLANS.pro.name}: every world</b>
                      <span>{formatInr(PLANS.pro.amount)}/month · cancel any time</span>
                      <Link href="/pricing" className="sq-btn sq-btn--ghost">
                        <span className="sq-btn__fill" aria-hidden="true" />
                        see plans
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {!isPlayable && (
            <div className="sq-empty">
              <span><b>status:</b> this world is still being built</span>
              <span>Boot a live one in the meantime.</span>
              <Link href="/adventures/linux-prison-break" className="sq-btn sq-btn--ghost">
                <span className="sq-btn__fill" aria-hidden="true" />
                run linux-prison-break
                <span className="sq-arrow" aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import Link from 'next/link'
import Field from '@/components/home/Field'
import type { Adventure, WorldLevel } from '@/lib/types'
import { SKILL_ABBR } from '@/lib/worlds'
import { WORLD_CLEARANCE } from '@/lib/xp'

interface Props {
  adventure: Adventure
  levels: WorldLevel[]
  completedLevelIds?: number[]
  isAuthed?: boolean
  /** Levels 1..trialLevel are free to play without an account. From the server. */
  trialLevel?: number
}

type Status = 'completed' | 'active' | 'locked'

const STATE_LABEL: Record<Status, string> = {
  completed: '✓ cleared',
  active: '● open',
  locked: '◌ locked',
}

export default function WorldLevelsPage({
  adventure,
  levels,
  completedLevelIds = [],
  isAuthed = false,
  trialLevel = 1,
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
    if (level.id <= trialLevel) return 'active' // free trial — always open
    // Beyond the trial: must be signed in AND have finished the previous level.
    if (!isAuthed) return 'locked'
    return completedIds.includes(level.id - 1) ? 'active' : 'locked'
  }

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
                      <span className="sq-level__state">{STATE_LABEL[status]}</span>
                      <span className="sq-level__xp sq-num">{level.xpReward} XP</span>
                      <span>{level.duration}</span>
                    </div>
                  </li>
                )
              })}
            </ol>

            {isPlayable && !isAuthed && (
              <p className="sq-panel__empty" style={{ paddingInline: 0 }}>
                # {trialLevel > 1 ? `levels 1–${trialLevel} are` : 'level 1 is'} free. <Link href={`/login?next=/adventures/${adventure.slug}`} className="sq-link">sign in</Link> to unlock the rest and keep your XP.
              </p>
            )}
          </section>

          {!isPlayable && (
            <div className="sq-empty">
              <span><b>status:</b> this world is still being built</span>
              <span>Boot a live one in the meantime.</span>
              <Link href="/adventures/sql-murder-mystery" className="sq-btn sq-btn--ghost">
                <span className="sq-btn__fill" aria-hidden="true" />
                run sql-murder-mystery
                <span className="sq-arrow" aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import Link from 'next/link'
import Field from '@/components/home/Field'
import type { Rarity } from '@/lib/supabase/types'
import DashboardJump from './DashboardJump'

export interface DashboardWorld {
  id: string
  slug: string
  title: string
  subtitle: string
  icon: string | null
  skill: string
  estimatedTime: string
  levelCount: number
  levelsCleared: number
  xpEarned: number
  status: 'completed' | 'in_progress' | 'not_started' | string
  live: boolean
  gate: string | null
}

export interface DashboardViewProps {
  profile: {
    displayName: string
    avatar: string
    xp: number
    streak: number
    rank: number | null
    levelsCleared: number
    clearance: string
    nextClearance: string | null
    clearancePercent: number
    xpToNext: number
    nextClearanceAt: number | null
    nextUnlocks: string[]
  }
  achievements: { id: string; title: string; description: string | null; icon: string | null; rarity: Rarity }[]
  unlockedIds: string[]
  worlds: DashboardWorld[]
  recentActivity: { icon: string; text: string; time: string; xp: number }[]
  leaderboard: { id: string; display_name: string; avatar: string; xp: number; rank: number }[]
  currentUserId: string
  /** Challenge record (wins/losses/draws against friends). */
  duels?: { wins: number; losses: number; draws: number }
}

const SECTIONS = [
  { id: 'next', label: 'Next up' },
  { id: 'worlds', label: 'Worlds' },
  { id: 'activity', label: 'Activity' },
  { id: 'unlocks', label: 'Unlocks' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'badges', label: 'Badges' },
  { id: 'leaderboard', label: 'Leaderboard' },
]

/** The one world to point the player at: resume what's open, else the first unstarted. */
function pickNext(worlds: DashboardWorld[]) {
  const live = worlds.filter(w => w.live)
  return (
    live.find(w => w.status === 'in_progress') ??
    live.find(w => w.status === 'not_started') ??
    null
  )
}

function worldAction(w: DashboardWorld) {
  if (!w.live) return w.gate ? `needs ${w.gate}` : 'coming soon'
  if (w.status === 'completed') return '✓ cleared'
  if (w.status === 'in_progress') return 'continue →'
  return 'start →'
}

export default function DashboardView({
  profile, achievements, unlockedIds, worlds, recentActivity, leaderboard, currentUserId, duels,
}: DashboardViewProps) {
  const unlocked = achievements.filter(a => unlockedIds.includes(a.id))
  const locked = achievements.filter(a => !unlockedIds.includes(a.id))
  const next = pickNext(worlds)
  const liveCount = worlds.filter(w => w.live).length
  const meOnBoard = leaderboard.some(e => e.id === currentUserId)

  const stats = [
    { label: 'total XP', value: profile.xp.toLocaleString() },
    { label: 'levels cleared', value: profile.levelsCleared },
    { label: `badges · of ${achievements.length}`, value: unlocked.length },
    { label: 'global rank', value: profile.rank != null ? `#${profile.rank}` : '—' },
  ]

  return (
    <div className="sq sq-page sq-dashboard">
      <Field />

      {/* Identity + the one progress meter that matters: clearance */}
      <header className="sq-dhead">
        <div className="sq-shell sq-dhead__in">
          <div className="sq-id">
            <div className="sq-avatar" aria-hidden="true">{profile.avatar}</div>
            <div className="sq-id__main">
              <p className="sq-kicker">dashboard</p>
              <h1 className="sq-display sq-dhead__title">{profile.displayName}</h1>
              <div className="sq-tags">
                <span className="sq-tag sq-tag--hot" title="Your clearance rank">▸ {profile.clearance}</span>
                {profile.rank != null && <span className="sq-tag">rank #{profile.rank}</span>}
                <span className="sq-tag">{profile.streak} day streak</span>
              </div>
            </div>
          </div>

          <div className="sq-dhead__meter">
            {profile.nextClearance ? (
              <>
                <div className="sq-meter__row">
                  <span><b>{profile.clearance}</b> → {profile.nextClearance}</span>
                  <span className="sq-num">
                    {profile.xp.toLocaleString()} / {profile.nextClearanceAt?.toLocaleString()} XP
                  </span>
                </div>
                <div
                  className="sq-meter"
                  role="progressbar"
                  aria-label={`Progress to ${profile.nextClearance}`}
                  aria-valuenow={profile.clearancePercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <i style={{ width: `${profile.clearancePercent}%` }} />
                </div>
                <p className="sq-dhead__hint">
                  {profile.xpToNext.toLocaleString()} XP until <b>{profile.nextClearance}</b>.{' '}
                  <a href="#unlocks" className="sq-link">what it unlocks</a>
                </p>
              </>
            ) : (
              <p className="sq-dhead__hint"><b>root</b>. Maximum clearance. The whole box is yours.</p>
            )}
          </div>
        </div>
      </header>

      <DashboardJump sections={SECTIONS} />

      <div className="sq-body">
        <div className="sq-shell sq-stack">
          {/* Next up: the single most useful thing to do now */}
          <section id="next" className="sq-next" aria-labelledby="sq-d-next">
            {next ? (
              <>
                <span className="sq-next__icon" aria-hidden="true">{next.icon}</span>
                <div className="sq-next__main">
                  <p className="sq-kicker" id="sq-d-next">
                    {next.status === 'in_progress' ? 'pick up where you left off' : 'next up'}
                  </p>
                  <h2 className="sq-next__title">{next.title}</h2>
                  <p className="sq-next__sub">{next.subtitle}</p>
                  <p className="sq-next__meta">
                    {next.skill} · {next.estimatedTime} · {next.levelsCleared}/{next.levelCount} levels
                  </p>
                </div>
                <Link href={`/adventures/${next.slug}`} className="sq-btn sq-next__cta">
                  <span className="sq-btn__fill" aria-hidden="true" />
                  {next.status === 'in_progress' ? 'continue' : 'start world'}
                  <span className="sq-arrow" aria-hidden="true">→</span>
                </Link>
              </>
            ) : (
              <div className="sq-next__main">
                <p className="sq-kicker" id="sq-d-next">all clear</p>
                <h2 className="sq-next__title">Every live world is cleared.</h2>
                <p className="sq-next__sub">
                  New worlds open as you gain clearance. Replays are free but don&apos;t pay XP.
                </p>
              </div>
            )}
          </section>

          <div className="sq-readout">
            <div className="sq-stats sq-stats--4 sq-stats--sm">
              {stats.map(s => (
                <div key={s.label} className="sq-stat">
                  <span className="sq-display sq-stat__v sq-num">{s.value}</span>
                  <span className="sq-stat__l">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sq-dash">
            <div className="sq-stack">
              {/* Worlds */}
              <section id="worlds" className="sq-panel" aria-labelledby="sq-d-worlds">
                <div className="sq-panel__bar">
                  <h2 id="sq-d-worlds" className="sq-panel__h">Worlds</h2>
                  <span className="sq-panel__note">{liveCount} playable</span>
                  <Link href="/adventures" className="sq-panel__r">browse all →</Link>
                </div>
                <div>
                  {worlds.map(w => {
                    const body = (
                      <>
                        <span aria-hidden="true">{w.icon}</span>
                        <span className="sq-item__main">
                          <span className="sq-item__title">{w.title}</span>
                          <span className="sq-item__meta">
                            {w.skill.toLowerCase()} · {w.estimatedTime}
                            {w.live && ` · ${w.levelsCleared}/${w.levelCount} levels`}
                            {w.xpEarned > 0 && ` · ${w.xpEarned} XP`}
                          </span>
                          {w.live && w.levelCount > 0 && (
                            <span className="sq-meter sq-meter--thin" aria-hidden="true">
                              <i style={{ width: `${(w.levelsCleared / w.levelCount) * 100}%` }} />
                            </span>
                          )}
                        </span>
                        <span className={`sq-item__r${w.live && w.status !== 'not_started' ? ' sq-item__r--hot' : ''}`}>
                          {worldAction(w)}
                        </span>
                      </>
                    )
                    return w.live ? (
                      <Link key={w.id} href={`/adventures/${w.slug}`} className="sq-item">{body}</Link>
                    ) : (
                      <div key={w.id} className="sq-item is-locked" title={w.gate ? `Unlocks at ${w.gate} clearance` : 'In build'}>
                        {body}
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Activity */}
              <section id="activity" className="sq-panel" aria-labelledby="sq-d-log">
                <div className="sq-panel__bar">
                  <h2 id="sq-d-log" className="sq-panel__h">Recent activity</h2>
                </div>
                {recentActivity.length === 0 ? (
                  <p className="sq-panel__empty">
                    Nothing yet. Clear your first level and it shows up here.
                  </p>
                ) : (
                  <div>
                    {recentActivity.map((item, i) => (
                      <div key={i} className="sq-item">
                        <span aria-hidden="true">{item.icon}</span>
                        <span className="sq-item__main">
                          <span className="sq-item__title" style={{ whiteSpace: 'normal' }}>{item.text}</span>
                          <span className="sq-item__meta">{item.time}</span>
                        </span>
                        {item.xp > 0 && <span className="sq-item__r sq-item__r--hot sq-num">+{item.xp} XP</span>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="sq-stack">
              {/* Unlocks: what XP buys — access, not a vanity number */}
              <section id="unlocks" className="sq-panel" aria-labelledby="sq-d-clr">
                <div className="sq-panel__bar">
                  <h2 id="sq-d-clr" className="sq-panel__h">
                    {profile.nextClearance ? `Unlocks at ${profile.nextClearance}` : 'Clearance'}
                  </h2>
                  {profile.nextClearance && (
                    <span className="sq-panel__r sq-num">{profile.xpToNext.toLocaleString()} XP to go</span>
                  )}
                </div>
                <div className="sq-panel__body sq-stack" style={{ gap: '0.9rem' }}>
                  <ul className="sq-bullets">
                    {profile.nextUnlocks.map((u, i) => <li key={i}>{u}</li>)}
                  </ul>
                  <p className="sq-panel__help">
                    Clear levels to earn XP. XP raises your clearance, and clearance opens new worlds.
                    Hints cost a share of a level&apos;s XP; replays pay nothing.
                  </p>
                </div>
              </section>

              {/* Challenges: record against friends */}
              <section id="challenges" className="sq-panel" aria-labelledby="sq-d-duels">
                <div className="sq-panel__bar">
                  <h2 id="sq-d-duels" className="sq-panel__h">Challenges</h2>
                  <Link href="/challenges" className="sq-panel__r">all →</Link>
                </div>
                <div className="sq-panel__body sq-stack" style={{ gap: '0.9rem' }}>
                  <p className="sq-duel-record sq-num">
                    <span><b>{duels?.wins ?? 0}</b> won</span>
                    <span><b>{duels?.losses ?? 0}</b> lost</span>
                    <span><b>{duels?.draws ?? 0}</b> drawn</span>
                  </p>
                  <Link href="/challenges" className="sq-btn sq-btn--ghost" style={{ justifySelf: 'start' }}>
                    <span className="sq-btn__fill" aria-hidden="true" />
                    challenge a friend
                    <span className="sq-arrow" aria-hidden="true">→</span>
                  </Link>
                </div>
              </section>

              {/* Badges */}
              <section id="badges" className="sq-panel" aria-labelledby="sq-d-ach">
                <div className="sq-panel__bar">
                  <h2 id="sq-d-ach" className="sq-panel__h">Badges</h2>
                  <span className="sq-panel__r sq-num">{unlocked.length}/{achievements.length}</span>
                </div>
                {unlocked.length > 0 && (
                  <div className="sq-badges">
                    {unlocked.map(a => (
                      <div
                        key={a.id}
                        className={`sq-badge${a.rarity === 'legendary' || a.rarity === 'epic' ? ' sq-badge--legendary' : ''}`}
                        title={a.description ?? undefined}
                      >
                        <span className="sq-badge__i" aria-hidden="true">{a.icon}</span>
                        <span>{a.title}</span>
                      </div>
                    ))}
                  </div>
                )}
                {locked.length > 0 && (
                  <>
                    <p className="sq-panel__sub">{unlocked.length ? 'Still to earn' : 'Earn your first'}</p>
                    <div>
                      {locked.slice(0, 3).map(a => (
                        <div key={a.id} className="sq-item is-locked">
                          <span aria-hidden="true">{a.icon}</span>
                          <span className="sq-item__main">
                            <span className="sq-item__title">{a.title}</span>
                            {a.description && (
                              <span className="sq-item__meta" style={{ whiteSpace: 'normal' }}>{a.description}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* Leaderboard */}
              <section id="leaderboard" className="sq-panel" aria-labelledby="sq-d-top">
                <div className="sq-panel__bar">
                  <h2 id="sq-d-top" className="sq-panel__h">Leaderboard</h2>
                  <span className="sq-panel__r">by XP</span>
                </div>
                <ol className="sq-lboard">
                  {leaderboard.map(entry => {
                    const me = entry.id === currentUserId
                    return (
                      <li key={entry.id} className={`sq-item${me ? ' is-me' : ''}`}>
                        <span className={`sq-num sq-lboard__rank${entry.rank <= 3 ? ' sq-item__r--hot' : ''}`}>
                          #{entry.rank}
                        </span>
                        <span className="sq-item__main">
                          <span className="sq-item__title">{me ? `${entry.display_name} (you)` : entry.display_name}</span>
                        </span>
                        <span className="sq-item__r sq-num">{entry.xp.toLocaleString()} XP</span>
                      </li>
                    )
                  })}
                  {!meOnBoard && profile.rank != null && (
                    <li className="sq-item is-me sq-lboard__me">
                      <span className="sq-num sq-lboard__rank">#{profile.rank}</span>
                      <span className="sq-item__main">
                        <span className="sq-item__title">{profile.displayName} (you)</span>
                      </span>
                      <span className="sq-item__r sq-num">{profile.xp.toLocaleString()} XP</span>
                    </li>
                  )}
                </ol>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

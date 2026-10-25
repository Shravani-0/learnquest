import Link from 'next/link'
import Field from '@/components/home/Field'
import type { Rarity } from '@/lib/supabase/types'

export interface DashboardViewProps {
  profile: {
    displayName: string
    avatar: string
    xp: number
    streak: number
    level: number
    xpIntoLevel: number
    xpForLevel: number
    percent: number
    rank: number | null
    completedAdventures: number
    clearance: string
    nextClearance: string | null
    clearancePercent: number
    xpToNext: number
    nextUnlocks: string[]
  }
  achievements: { id: string; title: string; description: string | null; icon: string | null; rarity: Rarity }[]
  unlockedIds: string[]
  adventures: { id: string; slug: string; title: string; icon: string | null; skill: string; estimatedTime: string; status: string }[]
  skills: { name: string; xp: number; level: number; max: number }[]
  recentActivity: { icon: string; text: string; time: string; xp: number }[]
  leaderboard: { id: string; display_name: string; avatar: string; xp: number; rank: number }[]
  currentUserId: string
}

export default function DashboardView({
  profile, achievements, unlockedIds, adventures, skills, recentActivity, leaderboard, currentUserId,
}: DashboardViewProps) {
  const unlockedAchievements = achievements.filter(a => unlockedIds.includes(a.id))
  const lockedAchievements = achievements.filter(a => !unlockedIds.includes(a.id))
  const handle = profile.displayName.toLowerCase().replace(/\s+/g, '_')

  const stats = [
    { label: 'total XP', value: profile.xp.toLocaleString() },
    { label: 'worlds cleared', value: profile.completedAdventures },
    { label: `achievements · of ${achievements.length}`, value: unlockedAchievements.length },
    { label: 'global rank', value: profile.rank != null ? `#${profile.rank}` : '—' },
  ]

  return (
    <div className="sq sq-page">
      <Field />

      <header className="sq-phead">
        <div className="sq-shell">
          <div className="sq-id">
            <div className="sq-avatar" aria-hidden="true">{profile.avatar}</div>
            <div className="sq-id__main">
              <p className="sq-kicker">whoami · {profile.clearance} clearance</p>
              <h1 className="sq-display sq-phead__title">{profile.displayName}</h1>
              <div className="sq-tags">
                <span className="sq-tag sq-tag--hot">▸ {profile.clearance}</span>
                <span className="sq-tag">level {profile.level}</span>
                {profile.rank != null && <span className="sq-tag">rank #{profile.rank}</span>}
                <span className="sq-tag">{profile.streak} day streak</span>
              </div>
              <div className="sq-id__meter">
                <div className="sq-meter__row">
                  <span><b className="sq-num">{profile.xpIntoLevel.toLocaleString()}</b> / {profile.xpForLevel.toLocaleString()} XP</span>
                  <span>{(profile.xpForLevel - profile.xpIntoLevel).toLocaleString()} to level {profile.level + 1}</span>
                </div>
                <div className="sq-meter" role="progressbar" aria-label="Level progress" aria-valuenow={profile.percent} aria-valuemin={0} aria-valuemax={100}>
                  <i style={{ width: `${profile.percent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="sq-body">
        <div className="sq-shell sq-stack">
          <div className="sq-readout">
            <div className="sq-readout__bar">
              <span className="sq-dot">●</span>
              <b>{handle}@unrust</b>:~$ stats
            </div>
            <div className="sq-stats sq-stats--4">
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
              <section className="sq-panel" aria-labelledby="sq-d-worlds">
                <div className="sq-panel__bar">
                  <span id="sq-d-worlds">$ <b>ls</b> ~/worlds</span>
                  <Link href="/adventures" className="sq-panel__r">all worlds →</Link>
                </div>
                <div>
                  {adventures.map(a => (
                    <Link key={a.id} href={`/adventures/${a.slug}`} className="sq-item">
                      <span aria-hidden="true">{a.icon}</span>
                      <span className="sq-item__main">
                        <span className="sq-item__title">{a.title}</span>
                        <span className="sq-item__meta">{a.skill.toLowerCase()} · {a.estimatedTime}</span>
                      </span>
                      <span className={`sq-item__r${a.status === 'completed' ? ' sq-item__r--hot' : ''}`}>
                        {a.status === 'completed' ? '✓ cleared' : a.status === 'in_progress' ? '● in progress' : 'boot →'}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Skills */}
              <section className="sq-panel" aria-labelledby="sq-d-skills">
                <div className="sq-panel__bar">
                  <span id="sq-d-skills">$ <b>skills</b> --progress</span>
                </div>
                <div className="sq-panel__body sq-stack" style={{ gap: '1.1rem' }}>
                  {skills.map(skill => (
                    <div key={skill.name}>
                      <div className="sq-meter__row">
                        <span><b>{skill.name}</b> · lv.{skill.level}</span>
                        <span className="sq-num">{skill.xp} XP</span>
                      </div>
                      <div className={`sq-meter${skill.xp ? '' : ' sq-meter--steel'}`}>
                        <i style={{ width: `${Math.min((skill.level / skill.max) * 100, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Activity */}
              <section className="sq-panel" aria-labelledby="sq-d-log">
                <div className="sq-panel__bar">
                  <span id="sq-d-log">$ <b>tail</b> activity.log</span>
                </div>
                {recentActivity.length === 0 ? (
                  <p className="sq-panel__empty"># no activity yet. boot a world to earn XP.</p>
                ) : (
                  <div>
                    {recentActivity.map((item, i) => (
                      <div key={i} className="sq-item">
                        <span aria-hidden="true">{item.icon}</span>
                        <span className="sq-item__main">
                          <span className="sq-item__title" style={{ whiteSpace: 'normal' }}>{item.text}</span>
                          <span className="sq-item__meta">{item.time}</span>
                        </span>
                        <span className="sq-item__r sq-item__r--hot sq-num">+{item.xp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="sq-stack">
              {/* Clearance — what XP buys: access, not a vanity number */}
              <section className="sq-panel" aria-labelledby="sq-d-clr">
                <div className="sq-panel__bar">
                  <span id="sq-d-clr">$ <b>sudo</b> -l</span>
                  <span className="sq-panel__r">▸ {profile.clearance}</span>
                </div>
                <div className="sq-panel__body">
                  {profile.nextClearance ? (
                    <div className="sq-stack" style={{ gap: '1rem' }}>
                      <div>
                        <div className="sq-meter__row">
                          <span><b>{profile.clearance}</b></span>
                          <span>{profile.nextClearance}</span>
                        </div>
                        <div className="sq-meter" role="progressbar" aria-label="Clearance progress" aria-valuenow={profile.clearancePercent} aria-valuemin={0} aria-valuemax={100}>
                          <i style={{ width: `${profile.clearancePercent}%` }} />
                        </div>
                        <p className="sq-meter__row" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                          <span>{profile.xpToNext.toLocaleString()} XP to {profile.nextClearance}</span>
                        </p>
                      </div>
                      <div>
                        <p className="sq-kicker" style={{ marginBottom: '0.6rem' }}>unlocks at {profile.nextClearance}</p>
                        <ul className="sq-bullets">
                          {profile.nextUnlocks.map((u, i) => <li key={i}>{u}</li>)}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="sq-panel__empty" style={{ padding: 0 }}>root. maximum clearance. The whole box is yours.</p>
                  )}
                </div>
              </section>

              {/* Achievements */}
              <section className="sq-panel" aria-labelledby="sq-d-ach">
                <div className="sq-panel__bar">
                  <span id="sq-d-ach">$ <b>ls</b> ~/badges</span>
                  <span className="sq-panel__r sq-num">{unlockedAchievements.length}/{achievements.length}</span>
                </div>
                <div className="sq-badges">
                  {unlockedAchievements.map(a => (
                    <div
                      key={a.id}
                      className={`sq-badge${a.rarity === 'legendary' || a.rarity === 'epic' ? ' sq-badge--legendary' : ''}`}
                      title={`${a.title}: ${a.description ?? ''}`}
                    >
                      <span className="sq-badge__i" aria-hidden="true">{a.icon}</span>
                      <span>{a.title}</span>
                    </div>
                  ))}
                  {lockedAchievements.slice(0, Math.max(3, 6 - unlockedAchievements.length)).map(a => (
                    <div key={a.id} className="sq-badge is-locked" title={`Locked: ${a.description ?? ''}`}>
                      <span className="sq-badge__i" aria-hidden="true">{a.icon}</span>
                      <span>{a.title}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Leaderboard */}
              <section className="sq-panel" aria-labelledby="sq-d-top">
                <div className="sq-panel__bar">
                  <span id="sq-d-top">$ <b>top</b> --sort=xp</span>
                </div>
                <div>
                  {leaderboard.map(entry => {
                    const me = entry.id === currentUserId
                    return (
                      <div key={entry.id} className={`sq-item${me ? ' is-me' : ''}`}>
                        <span className={`sq-num${entry.rank <= 3 ? ' sq-item__r--hot' : ''}`} style={{ width: '2rem' }}>
                          #{entry.rank}
                        </span>
                        <span className="sq-item__main">
                          <span className="sq-item__title">{me ? 'you' : entry.display_name}</span>
                        </span>
                        <span className="sq-item__r sq-item__r--hot sq-num">{entry.xp.toLocaleString()}</span>
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

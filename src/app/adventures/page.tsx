'use client'

import { useState } from 'react'
import Link from 'next/link'
import Field from '@/components/home/Field'
import { worlds, isPlayable, SKILL_ABBR } from '@/lib/worlds'
import { WORLD_CLEARANCE } from '@/lib/xp'
import type { Difficulty, SkillCategory } from '@/lib/types'

const skills: SkillCategory[] = ['SQL', 'Linux', 'Git', 'Cybersecurity', 'JavaScript', 'Data Analysis']
const difficulties: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

// Live worlds are colour-blocked from the palette (hazard, then chalk) so they
// stand apart from the locked ones at a glance.
const LIVE_BLOCK = ['sq-card--hazard', 'sq-card--chalk']
const liveSlugs = worlds.filter(isPlayable).map(w => w.slug)
const liveRank = (slug: string) => liveSlugs.indexOf(slug)

export default function AdventuresPage() {
  const [search, setSearch] = useState('')
  const [filterSkill, setFilterSkill] = useState<SkillCategory | 'All'>('All')
  const [filterDiff, setFilterDiff] = useState<Difficulty | 'All'>('All')

  const q = search.toLowerCase()
  const filtered = worlds.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    const matchSkill = filterSkill === 'All' || a.skill === filterSkill
    const matchDiff = filterDiff === 'All' || a.difficulty === filterDiff
    return matchSearch && matchSkill && matchDiff
  })

  const online = worlds.filter(isPlayable).length
  const reset = () => { setSearch(''); setFilterSkill('All'); setFilterDiff('All') }

  return (
    <div className="sq sq-page">
      <Field />

      <header className="sq-phead">
        <div className="sq-shell">
          <div className="sq-phead__in">
            <p className="sq-kicker">ls worlds · {online} online · {worlds.length - online} locked</p>
            <h1 className="sq-display sq-phead__title">Pick a system. <b>Break in.</b></h1>
            <p className="sq-phead__lead">Two are live. The rest unlock as you earn clearance.</p>
          </div>
        </div>
      </header>

      <div className="sq-body">
        <div className="sq-shell">
          <div className="sq-toolbar">
            <label className="sq-search">
              <span className="sq-term__ps1" aria-hidden="true">$ grep</span>
              <span className="sr-only">Search worlds</span>
              <input
                type="search"
                placeholder="search worlds…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </label>

            <div className="sq-filters" role="group" aria-label="Filter worlds">
              <span className="sq-filters__label">skill</span>
              <button className="sq-toggle" aria-pressed={filterSkill === 'All'} onClick={() => setFilterSkill('All')}>
                all
              </button>
              {skills.map(s => (
                <button
                  key={s}
                  className="sq-toggle"
                  aria-pressed={filterSkill === s}
                  onClick={() => setFilterSkill(filterSkill === s ? 'All' : s)}
                >
                  {(SKILL_ABBR[s] ?? s).toLowerCase()}
                </button>
              ))}
              <span className="sq-filters__sep" aria-hidden="true" />
              <span className="sq-filters__label">level</span>
              {difficulties.map(d => (
                <button
                  key={d}
                  className="sq-toggle"
                  aria-pressed={filterDiff === d}
                  onClick={() => setFilterDiff(filterDiff === d ? 'All' : d)}
                >
                  {d.toLowerCase()}
                </button>
              ))}
              <span className="sq-filters__count" aria-live="polite">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="sq-cards">
              {filtered.map(a => {
                const live = isPlayable(a)
                const gate = WORLD_CLEARANCE[a.slug]
                const n = worlds.indexOf(a) + 1
                return (
                  <article
                    key={a.id}
                    className={`sq-card ${live ? `sq-card--live ${LIVE_BLOCK[liveRank(a.slug)] ?? ''}` : 'is-locked'}`}
                  >
                    <span className="sq-card__bar" aria-hidden="true" />
                    <div className="sq-card__top">
                      <span className="sq-card__status">
                        <span className="sq-card__n">{String(n).padStart(2, '0')}</span>
                        {live ? '● READY' : '◌ LOCKED'}
                      </span>
                      <span className="sq-card__skill">{a.skill}</span>
                    </div>
                    <div>
                      <h2 className="sq-card__title">
                        <Link href={`/adventures/${a.slug}`} className="sq-card__link">{a.title}</Link>
                      </h2>
                      <p className="sq-card__sub">{a.subtitle}</p>
                    </div>
                    <div className="sq-tags">
                      {a.concepts.slice(0, 3).map(c => (
                        <span key={c} className="sq-tag">{c}</span>
                      ))}
                    </div>
                    <dl className="sq-card__spec">
                      <div><dt>time</dt><dd>{a.estimatedTime}</dd></div>
                      <div><dt>xp</dt><dd className="sq-num">{a.xpReward}</dd></div>
                      <div><dt>level</dt><dd>{a.difficulty.toLowerCase()}</dd></div>
                    </dl>
                    <span className="sq-card__go">
                      {live ? (
                        <>boot world <span className="sq-arrow" aria-hidden="true">→</span></>
                      ) : gate ? `needs ${gate} clearance` : 'in development'}
                    </span>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="sq-empty">
              <span><b>grep:</b> no worlds match that query</span>
              <button className="sq-link" onClick={reset}>clear filters</button>
            </div>
          )}

          <div className="sq-empty" style={{ marginTop: 'clamp(2rem, 1.5rem + 2vw, 3.5rem)' }}>
            <span className="sq-kicker">queued for build</span>
            <span>Python Data Heist · Docker Container Escape · Kubernetes Galaxy War</span>
          </div>
        </div>
      </div>
    </div>
  )
}

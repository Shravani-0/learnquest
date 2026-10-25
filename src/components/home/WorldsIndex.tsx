'use client'

import { useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { worlds, isPlayable, SKILL_ABBR, DIFF_ABBR } from '@/lib/worlds'
import { WORLD_CLEARANCE } from '@/lib/xp'
import WorldArt from './WorldArt'

// Industrial system: live worlds carry the hazard signal, locked ones read as steel.
const LIVE_SIGNAL = 'var(--c-accent)'
const LOCKED_SIGNAL = 'var(--c-faint)'

export default function WorldsIndex() {
  const [active, setActive] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const move = (e: React.PointerEvent) => {
    const box = previewRef.current
    if (!box) return
    box.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
  }

  const activeWorld = worlds.find((w) => w.slug === active) ?? null

  return (
    <section id="adventures" className="sq-section" aria-labelledby="sq-worlds-h">
      <div className="sq-shell">
        <header className="sq-section__head">
          <p className="sq-kicker" data-reveal="fade">systems · 2 online · 4 locked</p>
          <h2 id="sq-worlds-h" className="sq-display sq-section__title" data-split="lines">
            Six worlds. One console.
          </h2>
          <p className="sq-section__lead" data-reveal="up">
            Every world is a real system with a story wrapped around it. Boot the ones that are
            online now. The rest unlock as you earn clearance.
          </p>
        </header>

        <div
          className="sq-index"
          data-reveal="fade"
          onPointerMove={move}
          onPointerLeave={() => setActive(null)}
        >
          <div className="sq-row sq-row--head" aria-hidden="true">
            <span>status</span>
            <span>world</span>
            <span>skill</span>
            <span>level</span>
            <span>xp</span>
            <span />
          </div>

          {worlds.map((w) => {
            const live = isPlayable(w)
            const style = { '--w': live ? LIVE_SIGNAL : LOCKED_SIGNAL } as CSSProperties
            const cells = (
              <>
                <span className="sq-row__bar" aria-hidden="true" />
                <span className="sq-row__status">{live ? '● READY' : '◌ LOCKED'}</span>
                <span className="sq-row__world">
                  <span className="sq-row__title">{w.title}</span>
                  <span className="sq-row__sub">{w.subtitle}</span>
                </span>
                <span className="sq-row__meta">{SKILL_ABBR[w.skill] ?? w.skill}</span>
                <span className="sq-row__meta">{DIFF_ABBR[w.difficulty] ?? w.difficulty}</span>
                <span className="sq-row__meta sq-num">{w.xpReward}</span>
                <span className="sq-row__go" aria-hidden="true">
                  {live ? 'boot →' : WORLD_CLEARANCE[w.slug] ? `needs ${WORLD_CLEARANCE[w.slug]}` : 'soon'}
                </span>
              </>
            )
            // Live rows are the link itself, so the hover treatment (title tint, shift, bar) lives
            // on the link's own descendants; locked rows are inert.
            return live ? (
              <Link
                key={w.slug}
                href={`/adventures/${w.slug}`}
                className="sq-row sq-row--live"
                style={style}
                onPointerEnter={(e) => {
                  move(e) // position before showing so it never flashes at the origin
                  setActive(w.slug)
                }}
              >
                {cells}
              </Link>
            ) : (
              <div key={w.slug} className="sq-row is-locked" style={style} onPointerEnter={() => setActive(null)}>
                {cells}
              </div>
            )
          })}
        </div>
      </div>

      {/* pointer-following preview (fine pointer only; CSS hides it on touch) */}
      <div ref={previewRef} className={`sq-preview ${active ? 'is-on' : ''}`} aria-hidden="true">
        {activeWorld && (
          <div className="sq-preview__inner" style={{ '--w': LIVE_SIGNAL } as CSSProperties}>
            <WorldArt skill={activeWorld.skill} signal="var(--c-accent)" />
            <span className="sq-preview__label">{activeWorld.genre} · {activeWorld.estimatedTime}</span>
          </div>
        )}
      </div>
    </section>
  )
}

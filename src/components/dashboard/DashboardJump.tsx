'use client'

import { useEffect, useRef, useState } from 'react'

/** Mark the jumped-to section (styled by `[data-jump-hit]`); re-clicking replays the flash. */
function highlight(id: string) {
  document.querySelectorAll('[data-jump-hit]').forEach(el => el.removeAttribute('data-jump-hit'))
  const el = document.getElementById(id)
  if (!el) return
  void el.offsetWidth // restart the CSS animation
  el.setAttribute('data-jump-hit', '')
}

/**
 * Sticky in-page section bar for the dashboard. Plain #anchors (smooth scroll
 * comes from `html { scroll-behavior }`, which reduced-motion turns off); the
 * section in view is marked with aria-current.
 */
export default function DashboardJump({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id)
  // After a click, the clicked tab stays current until the player scrolls on their
  // own — sections near the page end can't reach the top band, so the observer
  // would otherwise mark an earlier one.
  const pinned = useRef(false)

  useEffect(() => {
    const els = sections
      .map(s => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el != null)
    const visible = new Map<string, boolean>()
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting)
        const first = sections.find(s => visible.get(s.id))
        if (first && !pinned.current) setActive(first.id)
      },
      // A band just below the sticky bars, so "active" means "at the top of the view".
      { rootMargin: '-120px 0px -55% 0px' },
    )
    els.forEach(el => io.observe(el))
    const unpin = () => { pinned.current = false }
    const keys = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) unpin()
    }
    window.addEventListener('wheel', unpin, { passive: true })
    window.addEventListener('touchmove', unpin, { passive: true })
    window.addEventListener('keydown', keys)
    return () => {
      io.disconnect()
      window.removeEventListener('wheel', unpin)
      window.removeEventListener('touchmove', unpin)
      window.removeEventListener('keydown', keys)
    }
  }, [sections])

  return (
    <nav className="sq-jump" aria-label="Dashboard sections">
      <div className="sq-shell sq-jump__in">
        {sections.map(s => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="sq-jump__a"
            aria-current={active === s.id ? 'location' : undefined}
            onClick={() => {
              pinned.current = true
              setActive(s.id)
              highlight(s.id)
            }}
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

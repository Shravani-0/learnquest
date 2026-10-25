'use client'

import { useEffect, useRef, useState } from 'react'
import { adventures } from '@/lib/data/adventures'
import { isPlayable } from '@/lib/worlds'
import { prefersReducedMotion } from '@/engine/env'

// Derived from the real catalog so the numbers are never invented, only summed.
const totalXp = adventures.reduce((s, a) => s + a.xpReward, 0)
const online = adventures.filter(isPlayable).length
const concepts = new Set(adventures.flatMap((a) => a.concepts)).size
const sessions = adventures.reduce((s, a) => s + a.completedBy, 0)

const STATS = [
  { value: adventures.length, label: 'worlds, live + in build', suffix: '' },
  { value: online, label: 'online to play right now', suffix: '' },
  { value: totalXp, label: 'XP on offer across worlds', suffix: '' },
  { value: concepts, label: 'distinct concepts to master', suffix: '' },
  { value: sessions, label: 'sessions logged so far', suffix: '' },
]

function useCountUp(target: number, run: boolean) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!run) return
    if (prefersReducedMotion()) {
      setV(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const dur = 1500
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setV(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run])
  return v
}

function Stat({ value, label, run }: { value: number; label: string; run: boolean }) {
  const v = useCountUp(value, run)
  return (
    <div className="sq-stat">
      <span className="sq-display sq-stat__v sq-num">{v.toLocaleString()}</span>
      <span className="sq-stat__l">{label}</span>
    </div>
  )
}

export default function StatsReadout() {
  const ref = useRef<HTMLDivElement>(null)
  const [run, setRun] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRun(true)
          io.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className="sq-section sq-section--tight" aria-labelledby="sq-stats-h">
      <div className="sq-shell">
        <h2 id="sq-stats-h" className="sr-only">By the numbers</h2>
        <div className="sq-readout" ref={ref} data-reveal="up">
          <div className="sq-readout__bar">
            <span className="sq-dot">●</span>
            <b>guest@unrust</b>:~$ stats --all
            <span className="sq-readout__note"># sample data</span>
          </div>
          <div className="sq-stats">
            {STATS.map((s) => (
              <Stat key={s.label} value={s.value} label={s.label} run={run} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

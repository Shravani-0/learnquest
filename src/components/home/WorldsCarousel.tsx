'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useMotionValue, useSpring } from 'framer-motion'
import { Lock, Play, Star, Clock, Zap, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { adventures } from '@/lib/data/adventures'

/* ─── layout ──────────────────────────────────────────────────────────────── */
const CARD_W   = 340
const CARD_H   = 520
const THUMB_H  = 210
const GAP      = 24
const STRIDE   = CARD_W + GAP      // 364
const TRACK_L  = 24                // px from left edge
const PARALLAX = 0.08              // bg shift per px of card offset from centre

/* ─── per-world thumbnail bg colour (fills gaps on parallax shift) ────────── */
const THUMB_BG: Record<string, string> = {
  'sql-murder-mystery':    '#1C1510',
  'linux-prison-break':   '#020A02',
  'git-time-traveler':    '#07090F',
  'hacker-academy':       '#030A03',
  'robot-factory':        '#0D0A00',
  'space-mission-control': '#02020E',
}

/* ─── difficulty badge ────────────────────────────────────────────────────── */
const DIFF: Record<string, React.CSSProperties> = {
  Beginner:     { color: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.10)',  border: '1px solid rgba(76,175,80,0.28)' },
  Intermediate: { color: '#00A0E0', backgroundColor: 'rgba(0,160,224,0.10)', border: '1px solid rgba(0,160,224,0.28)' },
  Advanced:     { color: '#FF9800', backgroundColor: 'rgba(255,152,0,0.10)',  border: '1px solid rgba(255,152,0,0.28)' },
  Expert:       { color: '#FF3C3C', backgroundColor: 'rgba(255,60,60,0.10)',  border: '1px solid rgba(255,60,60,0.28)' },
}

/* ─── bottom accent colours ───────────────────────────────────────────────── */
const ACCENT: Record<string, string> = {
  'sql-murder-mystery':    '#F5C418',
  'linux-prison-break':   '#00CC33',
  'git-time-traveler':    '#FF3C3C',
  'hacker-academy':       '#00FF41',
  'robot-factory':        '#F5A623',
  'space-mission-control': '#A855F7',
}

/* ─── thumbnail CSS-art components ───────────────────────────────────────── */

function SQLBg() {
  return (
    <div className="absolute inset-0 bg-[#1C1510] select-none">
      <div className="absolute inset-0 opacity-[0.09]" style={{
        backgroundImage: 'repeating-linear-gradient(90deg,#C8A87A 0,#C8A87A 1px,transparent 0,transparent 26px),repeating-linear-gradient(0deg,#C8A87A 0,#C8A87A 1px,transparent 0,transparent 26px)',
      }} />
      <div className="absolute top-[36%] inset-x-0 -rotate-[5deg] bg-[#F5C418] py-1.5">
        <p className="text-center text-[6.5px] font-black text-black tracking-[0.14em] uppercase">
          Crime Scene — Do Not Cross
        </p>
      </div>
      <div className="absolute bottom-0 inset-x-0 h-[55%] bg-gradient-to-t from-[#080705] to-transparent" />
      <span className="absolute top-3.5 right-4 text-2xl opacity-80">🔍</span>
      <p className="absolute bottom-2.5 left-4 text-[8px] font-mono text-[#8B7355]">SQL City · 2018</p>
    </div>
  )
}

function LinuxBg() {
  return (
    <div className="absolute inset-0 bg-[#020A02] select-none font-mono">
      <div className="absolute inset-0 opacity-[0.16]" style={{
        backgroundImage: 'repeating-linear-gradient(90deg,#00CC33 0,#00CC33 1px,transparent 0,transparent 22px),repeating-linear-gradient(0deg,#00CC33 0,#00CC33 1px,transparent 0,transparent 22px)',
      }} />
      <div className="absolute inset-0 p-4 flex flex-col gap-1.5 justify-center">
        <div className="flex items-center gap-1.5">
          <span className="text-[#00CC33] text-[9px]">$</span>
          <span className="text-[#00CC33] text-[9px]">ls -la /prison/cell42</span>
        </div>
        <div className="text-[8px] text-[#00CC33]/45 pl-4 leading-[1.7]">
          drwxr-xr-x  cell42/<br />-rw-r--r--  clue.txt<br />-rwxr-xr-x  escape.sh
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[#00CC33] text-[9px]">$</span>
          <span className="text-[#00CC33] text-[9px]">cat clue.txt</span>
          <span className="inline-block w-[5px] h-[11px] bg-[#00CC33] ml-0.5 animate-cursor-blink" />
        </div>
      </div>
      <span className="absolute top-3.5 right-4 text-2xl opacity-70">🔐</span>
    </div>
  )
}

function GitBg() {
  return (
    <div className="absolute inset-0 bg-[#07090F] select-none flex items-center justify-center p-4">
      <svg viewBox="0 0 160 72" className="w-full" style={{ maxHeight: 100 }}>
        <line x1="12" y1="48" x2="148" y2="48" stroke="#00A0E0" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M52,48 Q60,48 70,26 L110,26" stroke="#FF3C3C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M110,26 Q120,26 130,48" stroke="#FF3C3C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {[12, 52, 148].map(cx => (
          <circle key={cx} cx={cx} cy={48} r={5} fill="#00A0E0" stroke="#07090F" strokeWidth="2.5" />
        ))}
        {[70, 91, 110].map(cx => (
          <circle key={cx} cx={cx} cy={26} r={4.5} fill="#FF3C3C" stroke="#07090F" strokeWidth="2.5" />
        ))}
        <circle cx={130} cy={48} r={5} fill="#22c55e" stroke="#07090F" strokeWidth="2.5" />
        <text x={12} y={62} fill="#00A0E0" fontSize="6.5" textAnchor="middle" fontFamily="monospace">init</text>
        <text x={91} y={19} fill="#FF3C3C" fontSize="6.5" textAnchor="middle" fontFamily="monospace">feature</text>
        <text x={130} y={62} fill="#22c55e" fontSize="6.5" textAnchor="middle" fontFamily="monospace">merge</text>
      </svg>
      <span className="absolute top-3.5 right-4 text-2xl opacity-65">⏳</span>
    </div>
  )
}

function HackerBg() {
  return (
    <div className="absolute inset-0 bg-[#030A03] select-none overflow-hidden">
      <div className="absolute inset-0 opacity-[0.18]" style={{
        backgroundImage: 'repeating-linear-gradient(90deg,#00FF41 0,#00FF41 1px,transparent 0,transparent 28px),repeating-linear-gradient(0deg,#00FF41 0,#00FF41 1px,transparent 0,transparent 28px)',
      }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
        <span className="text-[#00FF41]/30 text-4xl font-mono leading-none">{'</>'}</span>
        <p className="text-[#00FF41]/28 text-[8.5px] font-mono tracking-[0.22em]">ACCESS DENIED</p>
        <p className="text-[#00FF41]/18 text-[7px] font-mono mt-0.5">CLEARANCE REQUIRED</p>
      </div>
      <span className="absolute top-3.5 right-4 text-2xl opacity-55">🕵️</span>
    </div>
  )
}

function RobotBg() {
  return (
    <div className="absolute inset-0 bg-[#0D0A00] select-none overflow-hidden">
      <div className="absolute inset-0 opacity-[0.10]" style={{
        backgroundImage: 'repeating-linear-gradient(90deg,#F5A623 0,#F5A623 1px,transparent 0,transparent 28px),repeating-linear-gradient(0deg,#F5A623 0,#F5A623 1px,transparent 0,transparent 28px)',
      }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
        <span className="text-4xl opacity-28">🤖</span>
        <p className="text-[#F5A623]/30 text-[8.5px] font-mono tracking-[0.18em]">UNIT OFFLINE</p>
        <p className="text-[#F5A623]/18 text-[7px] font-mono">FACTORY HALTED</p>
      </div>
      <span className="absolute top-3.5 right-4 text-2xl opacity-55">⚙️</span>
    </div>
  )
}

function SpaceBg() {
  return (
    <div className="absolute inset-0 bg-[#02020E] select-none overflow-hidden">
      <div className="absolute inset-0 opacity-[0.14]" style={{
        backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.9) 1px,transparent 1px)',
        backgroundSize: '22px 22px',
      }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
        <span className="text-4xl opacity-28">🚀</span>
        <p className="text-[#A855F7]/30 text-[8.5px] font-mono tracking-[0.18em]">AR-7 OFFLINE</p>
        <p className="text-[#A855F7]/18 text-[7px] font-mono">LIFE SUPPORT: 12%</p>
      </div>
      <span className="absolute top-3.5 right-4 text-2xl opacity-55">🛸</span>
    </div>
  )
}

const THUMBS: Record<string, React.ComponentType> = {
  'sql-murder-mystery':    SQLBg,
  'linux-prison-break':   LinuxBg,
  'git-time-traveler':    GitBg,
  'hacker-academy':       HackerBg,
  'robot-factory':        RobotBg,
  'space-mission-control': SpaceBg,
}

/* ─── WorldsCarousel ─────────────────────────────────────────────────────── */
export default function WorldsCarousel() {
  const containerRef    = useRef<HTMLDivElement>(null)
  const trackRef        = useRef<HTMLDivElement>(null)
  const bgRefs          = useRef<(HTMLDivElement | null)[]>([])
  const containerWRef   = useRef(0)
  const isDragging      = useRef(false)
  const hasDragged      = useRef(false)
  const dragStartX      = useRef(0)
  const dragStartScroll = useRef(0)

  const [activeIdx, setActiveIdx] = useState(0)

  // targetX: scroll position we want   displayX: spring-smoothed version
  const targetX  = useMotionValue(0)
  const displayX = useSpring(targetX, { stiffness: 110, damping: 22, mass: 1 })

  const maxScroll = useCallback(
    () => Math.max(0, adventures.length * STRIDE - GAP - containerWRef.current + TRACK_L),
    [],
  )
  const clamp = useCallback((v: number) => Math.max(0, Math.min(v, maxScroll())), [maxScroll])

  // Navigate to a card index
  const goTo = useCallback((idx: number) => {
    const i = Math.max(0, Math.min(idx, adventures.length - 1))
    targetX.set(clamp(i * STRIDE))
    setActiveIdx(i)
  }, [clamp, targetX])

  // displayX changes → update DOM directly (avoids per-frame setState)
  useEffect(() => {
    return displayX.on('change', v => {
      // Translate track
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${-v}px)`
      }
      // Per-card parallax: shift bg relative to card's distance from viewport centre
      const w = containerWRef.current
      const viewCentre = v + w / 2
      adventures.forEach((_, i) => {
        const el = bgRefs.current[i]
        if (!el) return
        const cardCentre = TRACK_L + i * STRIDE + CARD_W / 2
        el.style.transform = `translateX(${(cardCentre - viewCentre) * PARALLAX}px)`
      })
    })
  }, [displayX])

  // Measure container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      containerWRef.current = e.contentRect.width
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Global pointermove / pointerup — avoids setPointerCapture which breaks child Link clicks
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return
      const dx = dragStartX.current - e.clientX
      if (Math.abs(dx) > 5) hasDragged.current = true
      targetX.set(clamp(dragStartScroll.current + dx))
      const idx = Math.round(targetX.get() / STRIDE)
      setActiveIdx(Math.max(0, Math.min(idx, adventures.length - 1)))
    }
    const onUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      const idx = Math.round(targetX.get() / STRIDE)
      goTo(idx)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [clamp, goTo, targetX])

  /* ── drag start (container only) ── */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    isDragging.current = true
    hasDragged.current = false
    dragStartX.current = e.clientX
    dragStartScroll.current = targetX.get()
  }

  const liveCount   = adventures.filter(a => !a.isComingSoon).length
  const lockedCount = adventures.filter(a => a.isComingSoon).length

  return (
    <section id="adventures" className="py-20 border-t border-[#2A2A2A] overflow-hidden bg-[#0E0E0E]">
      <div className="max-w-[1500px] mx-auto">

        {/* ── section header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="px-6 mb-10"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-[3px] h-4 rounded-full bg-[#FF3C3C]" />
            <p className="text-[10px] font-black tracking-[0.26em] uppercase text-[#FF3C3C]">Worlds</p>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Choose Your World
          </h2>
          <p className="text-[#606060] text-sm mt-1.5">
            Drag to explore ·{' '}
            <span className="text-[#A0A0A0]">{liveCount} live</span>
            {' '}·{' '}
            <span className="text-[#444]">{lockedCount} coming soon</span>
          </p>
        </motion.div>

        {/* ── carousel container ── */}
        <div
          ref={containerRef}
          className="relative select-none cursor-grab active:cursor-grabbing"
          style={{ height: CARD_H + 16, overflow: 'hidden' }}
          onPointerDown={onPointerDown}
        >
          {/* track */}
          <div
            ref={trackRef}
            className="absolute top-0 flex items-start"
            style={{ left: TRACK_L, gap: GAP, willChange: 'transform' }}
          >
            {adventures.map((adv, i) => {
              const Thumb  = THUMBS[adv.slug]
              const locked = !!adv.isComingSoon
              const diff   = DIFF[adv.difficulty] ?? DIFF.Beginner
              const accent = ACCENT[adv.slug] ?? '#FF3C3C'
              const bgCol  = THUMB_BG[adv.slug] ?? '#111'

              const cardInner = (
                <div
                  className={[
                    'relative rounded-2xl border flex flex-col overflow-hidden',
                    'transition-[border-color,box-shadow] duration-200',
                    locked
                      ? 'border-[#1C1C1C] bg-[#111]'
                      : 'border-[#272727] bg-[#181818] group-hover:border-[#333] group-hover:-translate-y-1 group-hover:shadow-[0_24px_56px_rgba(0,0,0,0.75)]',
                  ].join(' ')}
                  style={{ width: CARD_W, height: CARD_H, transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease' }}
                >
                  {/* ── thumbnail area ── */}
                  <div
                    className="relative shrink-0 overflow-hidden"
                    style={{ height: THUMB_H, background: bgCol }}
                  >
                    {/* parallax bg wrapper — shifted via ref, no React state */}
                    <div
                      ref={el => { bgRefs.current[i] = el }}
                      className="absolute inset-0"
                      style={{ willChange: 'transform' }}
                    >
                      {Thumb && <Thumb />}
                    </div>

                    {/* lock overlay */}
                    {locked && (
                      <div className="absolute inset-0 bg-black/52 backdrop-blur-[2.5px] flex flex-col items-center justify-center gap-3 z-20">
                        <div className="w-11 h-11 rounded-full bg-[#181818]/80 border border-[#2A2A2A] flex items-center justify-center">
                          <Lock className="w-5 h-5 text-[#444]" />
                        </div>
                        <div className="px-3 py-1 rounded-full bg-[#191919]/90 border border-[#2A2A2A] text-[10px] font-black text-[#444] uppercase tracking-widest">
                          Coming Soon
                        </div>
                      </div>
                    )}

                    {/* hover play overlay */}
                    {!locked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
                        <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-black">
                          <Play className="w-4 h-4 fill-current" />
                          Play Now
                        </div>
                      </div>
                    )}

                    {/* XP badge */}
                    {!locked && (
                      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/65 border border-white/10 text-[10px] font-black font-mono text-white">
                        <Zap className="w-2.5 h-2.5 text-yellow-400" />
                        +{adv.xpReward} XP
                      </div>
                    )}

                    {/* Popular / New badge */}
                    {!locked && adv.isPopular && (
                      <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-[#FF3C3C]/20 border border-[#FF3C3C]/40 text-[10px] font-black text-[#FF3C3C] uppercase tracking-wider">
                        Popular
                      </div>
                    )}
                    {!locked && adv.isNew && !adv.isPopular && (
                      <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-[#22c55e]/20 border border-[#22c55e]/40 text-[10px] font-black text-[#22c55e] uppercase tracking-wider">
                        New
                      </div>
                    )}
                  </div>

                  {/* ── card body ── */}
                  <div className={`flex flex-col flex-1 p-5 ${locked ? 'opacity-35' : ''}`}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] mb-1.5">
                      {adv.genre} · {adv.skill}
                    </p>
                    <h3 className={[
                      'text-[16px] font-black leading-tight mb-1.5 transition-colors',
                      locked ? 'text-[#303030]' : 'text-[#EFEFEF] group-hover:text-white',
                    ].join(' ')}>
                      {adv.title}
                    </h3>
                    <p className="text-[12px] text-[#595959] leading-relaxed mb-4 line-clamp-2">
                      {adv.subtitle}
                    </p>

                    {/* live stats */}
                    {!locked && (
                      <div className="flex items-center gap-3 mb-4 text-[#4A4A4A]">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                          <span className="text-[11px] font-semibold text-[#888]">{adv.rating.toFixed(1)}</span>
                        </span>
                        <div className="w-px h-3 bg-[#222]" />
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 shrink-0" />
                          <span className="text-[11px]">{adv.completedBy.toLocaleString()}</span>
                        </span>
                        <div className="w-px h-3 bg-[#222]" />
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="text-[11px]">{adv.estimatedTime}</span>
                        </span>
                      </div>
                    )}

                    {/* concept tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {adv.concepts.slice(0, 3).map(c => (
                        <span
                          key={c}
                          className="px-2 py-0.5 rounded-md bg-[#1C1C1C] border border-[#272727] text-[10px] font-mono text-[#4A4A4A]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>

                    {/* footer row */}
                    <div className="flex items-center justify-between mt-auto">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black" style={diff}>
                        {adv.difficulty}
                      </span>
                      {!locked && (
                        <span className="text-[11px] font-bold text-[#4A4A4A] group-hover:text-[#FF3C3C] transition-colors">
                          Start →
                        </span>
                      )}
                    </div>
                  </div>

                  {/* coloured bottom accent */}
                  <div
                    className="h-[3px] shrink-0"
                    style={{
                      background: locked
                        ? 'transparent'
                        : `linear-gradient(90deg,${accent}55,transparent)`,
                    }}
                  />
                </div>
              )

              return locked ? (
                <div
                  key={adv.id}
                  className="shrink-0 cursor-not-allowed"
                  style={{ width: CARD_W }}
                >
                  {cardInner}
                </div>
              ) : (
                <Link
                  key={adv.id}
                  href={`/adventures/${adv.slug}`}
                  className="shrink-0 group block cursor-target"
                  style={{ width: CARD_W }}
                  draggable={false}
                  onClick={e => { if (hasDragged.current) e.preventDefault() }}
                >
                  {cardInner}
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── navigation bar ── */}
        <div className="px-6 mt-6 flex items-center justify-between">
          {/* progress dots */}
          <div className="flex items-center gap-2">
            {adventures.map((a, i) => (
              <button
                key={a.id}
                onClick={() => goTo(i)}
                aria-label={`Go to ${a.title}`}
                style={{
                  width:        i === activeIdx ? 20 : 6,
                  height:       6,
                  borderRadius: 3,
                  background:   i === activeIdx ? '#FF3C3C' : '#222',
                  transition:   'all 0.25s ease',
                  cursor:       'pointer',
                  flexShrink:   0,
                }}
              />
            ))}
          </div>

          {/* arrow buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goTo(activeIdx - 1)}
              disabled={activeIdx === 0}
              className="w-9 h-9 rounded-full bg-[#181818] border border-[#252525] flex items-center justify-center text-[#4A4A4A] hover:text-white hover:border-[#333] disabled:opacity-20 transition-all duration-150"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => goTo(activeIdx + 1)}
              disabled={activeIdx === adventures.length - 1}
              className="w-9 h-9 rounded-full bg-[#181818] border border-[#252525] flex items-center justify-center text-[#4A4A4A] hover:text-white hover:border-[#333] disabled:opacity-20 transition-all duration-150"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </section>
  )
}

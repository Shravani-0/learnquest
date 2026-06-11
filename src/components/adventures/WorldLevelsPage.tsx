'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Lock, CheckCircle2, Play,
  Zap, Clock, Star, Users, BookOpen, Trophy
} from 'lucide-react'
import type { Adventure, WorldLevel } from '@/lib/types'
import { cn } from '@/lib/cn'

const DEFAULT_COLOR = {
  accent: 'from-[#FF3C3C] to-[#00A0E0]',
  accentBg: 'bg-[#FF3C3C]/10',
  accentBorder: 'border-[#FF3C3C]/30',
  accentText: 'text-[#FF3C3C]',
  glow: '',
  levelActive: 'border-[#FF3C3C]/40 bg-[#FF3C3C]/8',
  levelDone: 'border-[#22c55e]/40 bg-[#22c55e]/8',
  connector: 'bg-[#FF3C3C]/25',
}

const colorMap: Record<string, {
  accent: string
  accentBg: string
  accentBorder: string
  accentText: string
  glow: string
  levelActive: string
  levelDone: string
  connector: string
}> = {
  amber: {
    accent: 'from-amber-600 to-orange-600',
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/30',
    accentText: 'text-amber-400',
    glow: 'shadow-glow-amber',
    levelActive: 'border-amber-500/50 bg-amber-500/8 shadow-glow-amber',
    levelDone: 'border-green-500/40 bg-green-500/8',
    connector: 'bg-amber-500/30',
  },
  cyan: {
    accent: 'from-cyan-600 to-teal-600',
    accentBg: 'bg-cyan-500/10',
    accentBorder: 'border-cyan-500/30',
    accentText: 'text-cyan-400',
    glow: 'shadow-glow-cyan',
    levelActive: 'border-cyan-500/50 bg-cyan-500/8 shadow-glow-cyan',
    levelDone: 'border-green-500/40 bg-green-500/8',
    connector: 'bg-cyan-500/30',
  },
  blue: {
    accent: 'from-blue-600 to-indigo-600',
    accentBg: 'bg-blue-500/10',
    accentBorder: 'border-blue-500/30',
    accentText: 'text-blue-400',
    glow: '',
    levelActive: 'border-blue-500/50 bg-blue-500/8',
    levelDone: 'border-green-500/40 bg-green-500/8',
    connector: 'bg-blue-500/30',
  },
  purple: {
    accent: 'from-[#a855f7] to-[#7c3aed]',
    accentBg: 'bg-[#a855f7]/10',
    accentBorder: 'border-[#a855f7]/30',
    accentText: 'text-[#c084fc]',
    glow: 'shadow-glow-purple',
    levelActive: 'border-[#a855f7]/50 bg-[#a855f7]/8 shadow-glow-purple',
    levelDone: 'border-green-500/40 bg-green-500/8',
    connector: 'bg-[#a855f7]/30',
  },
  red: {
    accent: 'from-red-600 to-rose-600',
    accentBg: 'bg-red-500/10',
    accentBorder: 'border-red-500/30',
    accentText: 'text-red-400',
    glow: '',
    levelActive: 'border-red-500/50 bg-red-500/8',
    levelDone: 'border-green-500/40 bg-green-500/8',
    connector: 'bg-red-500/30',
  },
}

const difficultyColors = {
  Beginner: 'text-green-400 bg-green-500/10 border-green-500/20',
  Intermediate: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Advanced: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Expert: 'text-red-400 bg-red-500/10 border-red-500/20',
}

interface Props {
  adventure: Adventure
  levels: WorldLevel[]
  completedLevelIds?: number[]
}

export default function WorldLevelsPage({ adventure, levels, completedLevelIds = [] }: Props) {
  // Hydrate completed levels from localStorage (same key the GameApp writes to)
  const [completedIds, setCompletedIds] = useState<number[]>(completedLevelIds)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`skillquest:${adventure.slug}-completed`)
      if (stored) setCompletedIds(JSON.parse(stored))
    } catch {}
  }, [adventure.slug])

  const c = colorMap[adventure.color] ?? DEFAULT_COLOR
  const isPlayable = !adventure.isComingSoon
  const totalXP = levels.reduce((sum, l) => sum + l.xpReward, 0)
  const totalTime = levels.reduce((sum, l) => sum + parseInt(l.duration), 0)

  const getStatus = (level: WorldLevel): 'completed' | 'active' | 'locked' => {
    if (!isPlayable) return 'locked'
    if (completedIds.includes(level.id)) return 'completed'
    // Continuous-session games (Linux) have no per-level URL access — all unlocked
    if (adventure.slug === 'linux-prison-break') return 'active'
    const prevDone = level.id <= 2 || completedIds.includes(level.id - 1)
    return prevDone ? 'active' : 'locked'
  }

  const firstActiveLevel = levels.find(l => getStatus(l) === 'active')
  const playHref = `/adventures/${adventure.slug}/play`

  return (
    <div className="min-h-screen bg-quest-bg">
      {/* Hero */}
      <div className={cn('relative border-b border-quest-border/40 py-14 overflow-hidden', adventure.bgGradient && `bg-gradient-to-br ${adventure.bgGradient}`)}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-quest-bg/80" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/adventures"
            className="inline-flex items-center gap-1.5 text-xs text-quest-text-3 hover:text-quest-text transition-colors mb-8"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            All Adventures
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-end gap-6"
          >
            <div className="text-6xl">{adventure.icon}</div>

            <div className="flex-1">
              <p className="text-xs font-semibold tracking-widest text-quest-text-3 uppercase mb-2">
                {adventure.genre} · {adventure.skill}
              </p>
              <h1 className="text-3xl sm:text-4xl font-black text-quest-text mb-2">{adventure.title}</h1>
              <p className={cn('text-sm italic mb-4', c.accentText)}>{adventure.subtitle}</p>
              <p className="text-quest-text-2 text-sm leading-relaxed max-w-xl">{adventure.description}</p>
            </div>

            {/* Quick stats */}
            <div className="flex sm:flex-col gap-3 shrink-0">
              {adventure.rating > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Star className={cn('w-4 h-4 fill-current', c.accentText)} />
                  <span className="font-semibold text-quest-text">{adventure.rating}</span>
                </div>
              )}
              {adventure.completedBy > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-quest-text-3">
                  <Users className="w-4 h-4" />
                  {(adventure.completedBy / 1000).toFixed(1)}K
                </div>
              )}
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-4 mt-8"
          >
            {[
              { icon: BookOpen, label: `${levels.length} Levels` },
              { icon: Zap, label: `${totalXP} XP Total` },
              { icon: Clock, label: `~${totalTime} min` },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium', c.accentBg, c.accentBorder, c.accentText)}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
            ))}
            <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium', difficultyColors[adventure.difficulty])}>
              {adventure.difficulty}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Levels */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-sm font-semibold text-quest-text">Levels</h2>
          {isPlayable && firstActiveLevel && (
            <Link
              href={`${playHref}?level=${firstActiveLevel.id}`}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all',
                `bg-gradient-to-r ${c.accent} hover:opacity-90`
              )}
            >
              <Play className="w-4 h-4" />
              {completedIds.length > 0 ? 'Continue' : 'Start Adventure'}
            </Link>
          )}
          {!isPlayable && (
            <span className="px-3 py-1.5 rounded-lg bg-quest-surface border border-quest-border text-xs text-quest-text-3">
              Coming Soon
            </span>
          )}
        </div>

        <div className="relative">
          {levels.map((level, i) => {
            const status = getStatus(level)
            const isLast = i === levels.length - 1

            return (
              <div key={level.id} className="flex gap-5">
                {/* Left: number + connector */}
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 border transition-all',
                      status === 'completed' && 'bg-green-500/15 border-green-500/40 text-green-400',
                      status === 'active' && `bg-gradient-to-br ${c.accent} border-transparent text-white`,
                      status === 'locked' && 'bg-quest-surface-2 border-quest-border text-quest-text-3',
                    )}
                  >
                    {status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : status === 'locked' ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      level.id
                    )}
                  </motion.div>
                  {!isLast && (
                    <div className={cn('w-0.5 flex-1 my-1 min-h-[1.5rem]', status === 'completed' ? 'bg-green-500/30' : c.connector)} />
                  )}
                </div>

                {/* Right: level card */}
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    'flex-1 mb-3 p-4 rounded-xl border transition-all',
                    status === 'completed' && cn(c.levelDone),
                    status === 'active' && cn('cursor-pointer group', c.levelActive),
                    status === 'locked' && 'border-quest-border bg-quest-surface/40 opacity-50',
                  )}
                >
                  {status === 'active' ? (
                    <Link href={`${playHref}?level=${level.id}`} className="block">
                      <LevelCardInner level={level} status={status} c={c} />
                    </Link>
                  ) : (
                    <LevelCardInner level={level} status={status} c={c} />
                  )}
                </motion.div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA for coming soon */}
        {!isPlayable && (
          <div className="mt-8 p-6 rounded-2xl border border-dashed border-quest-border text-center">
            <Trophy className="w-8 h-8 text-quest-text-3 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-quest-text mb-1">This world is in development</h3>
            <p className="text-xs text-quest-text-3 mb-4">Try a playable adventure in the meantime.</p>
            <Link
              href="/adventures/sql-murder-mystery"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold transition-all"
            >
              Play SQL Murder Mystery
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

type ColorConfig = (typeof colorMap)[keyof typeof colorMap]

function LevelCardInner({
  level,
  status,
  c,
}: {
  level: WorldLevel
  status: 'completed' | 'active' | 'locked'
  c: ColorConfig
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={cn('text-sm font-bold', status === 'completed' ? 'text-green-400' : status === 'active' ? 'text-quest-text group-hover:text-white' : 'text-quest-text-2')}>
            {level.title}
          </span>
          <span className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded border', status === 'active' ? cn(c.accentBg, c.accentBorder, c.accentText) : 'bg-quest-surface border-quest-border text-quest-text-3')}>
            {level.concept}
          </span>
        </div>
        <p className="text-xs text-quest-text-3 leading-relaxed">{level.description}</p>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-1 text-xs font-semibold text-purple-400">
          <Zap className="w-3 h-3" />
          {level.xpReward}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-quest-text-3">
          <Clock className="w-3 h-3" />
          {level.duration}
        </div>
        {status === 'active' && (
          <div className={cn('flex items-center gap-1 text-[10px] font-semibold mt-1', c.accentText)}>
            Play
            <ChevronRight className="w-3 h-3" />
          </div>
        )}
      </div>
    </div>
  )
}

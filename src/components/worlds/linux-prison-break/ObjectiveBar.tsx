'use client'

import { motion } from 'framer-motion'
import { ChevronRight, Trophy } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Level } from './types'
import { LEVELS } from './levels'

interface ObjectiveBarProps {
  level: Level
  currentLevelIdx: number
  isFinished: boolean
  totalXP: number
}

export function ObjectiveBar({ level, currentLevelIdx, isFinished, totalXP }: ObjectiveBarProps) {
  return (
    <>
      {/* Level progress dots */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${LEVELS.length}, 1fr)` }}>
        {LEVELS.map((l, i) => (
          <div
            key={l.id}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i < currentLevelIdx
                ? 'bg-cyan-500'
                : i === currentLevelIdx
                ? 'bg-cyan-400 animate-pulse'
                : ''
            )}
            style={i >= currentLevelIdx && i !== currentLevelIdx
              ? { background: 'rgba(6,182,212,0.1)' }
              : undefined
            }
          />
        ))}
      </div>

      {/* Objective card */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.12)' }}
      >
        {isFinished ? (
          <Trophy className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        ) : (
          <div
            className="w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center"
            style={{ borderColor: 'rgba(6,182,212,0.4)', background: 'rgba(6,182,212,0.08)' }}
          >
            <ChevronRight className="w-3 h-3 text-cyan-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-cyan-400 mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {isFinished
              ? 'Mission Complete!'
              : `Room ${level.id}/${LEVELS.length}: ${level.room.split('/').pop()}`}
          </p>
          <p className="text-xs" style={{ color: 'rgba(6,182,212,0.45)', fontFamily: "'Space Grotesk', sans-serif" }}>
            {isFinished
              ? `You escaped! Total XP: ${totalXP}`
              : level.objective}
          </p>
        </div>
        {!isFinished && (
          <div
            className="text-xs font-mono shrink-0 ml-2"
            style={{ color: 'rgba(6,182,212,0.3)' }}
          >
            +{level.xp} XP
          </div>
        )}
      </div>
    </>
  )
}

interface CommandRefProps {
  onFill: (cmd: string) => void
}

export function CommandRef({ onFill }: CommandRefProps) {
  const QUICK_REF = [
    { cmd: 'pwd', desc: 'where am I?' },
    { cmd: 'ls', desc: "what's here?" },
    { cmd: 'cat file', desc: 'read a file' },
    { cmd: 'cd /path', desc: 'go somewhere' },
  ] as const

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {QUICK_REF.map(item => (
        <button
          key={item.cmd}
          onClick={() => onFill(item.cmd)}
          className="flex items-start gap-2 p-2.5 rounded-lg text-left group transition-colors"
          style={{ background: '#08081a', border: '1px solid rgba(6,182,212,0.1)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(6,182,212,0.25)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(6,182,212,0.1)' }}
        >
          <code
            className="text-[10px] font-mono text-cyan-400/70 group-hover:text-cyan-300 transition-colors"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {item.cmd}
          </code>
          <span className="text-[10px]" style={{ color: 'rgba(6,182,212,0.25)' }}>{item.desc}</span>
        </button>
      ))}
    </div>
  )
}

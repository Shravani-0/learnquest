'use client'

import { ChevronRight, Trophy } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { LinuxLevelContent } from '@/lib/quests/types'

interface ObjectiveBarProps {
  level: LinuxLevelContent
  levels: LinuxLevelContent[]
  currentLevelIdx: number
  isFinished: boolean
  totalXP: number
}

export function ObjectiveBar({ level, levels, currentLevelIdx, isFinished, totalXP }: ObjectiveBarProps) {
  return (
    <>
      {/* Level progress dots */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${levels.length}, 1fr)` }}>
        {levels.map((l, i) => (
          <div
            key={l.id}
            className={cn(
              'h-1.5 rounded-none transition-all duration-300',
              i < currentLevelIdx
                ? 'bg-[var(--c-accent)]'
                : i === currentLevelIdx
                ? 'bg-[var(--c-accent)] animate-pulse'
                : ''
            )}
            style={i >= currentLevelIdx && i !== currentLevelIdx
              ? { background: 'var(--c-line-2)' }
              : undefined
            }
          />
        ))}
      </div>

      {/* Objective card */}
      <div
        className="flex items-start gap-3 p-4 rounded-none"
        style={{ background: 'var(--c-elev)', border: '1px solid var(--c-line-2)' }}
      >
        {isFinished ? (
          <Trophy className="w-5 h-5 text-[var(--c-accent)] shrink-0 mt-0.5" />
        ) : (
          <div
            className="w-5 h-5 rounded-none border shrink-0 mt-0.5 flex items-center justify-center"
            style={{ borderColor: 'var(--c-accent)', background: 'rgb(var(--accent-rgb) / 0.08)' }}
          >
            <ChevronRight className="w-3 h-3 text-[var(--c-accent)]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-semibold text-[var(--c-ink)] mb-0.5">
            {isFinished
              ? 'Mission Complete!'
              : `Room ${level.id}/${levels.length}: ${level.room.split('/').pop()}`}
          </p>
          <p className="text-xs" style={{ color: 'var(--c-muted)' }}>
            {isFinished
              ? `You escaped! Total XP: ${totalXP}`
              : level.objective}
          </p>
        </div>
        {!isFinished && (
          <div
            className="text-xs font-mono shrink-0 ml-2"
            style={{ color: 'var(--c-accent)' }}
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
          className="flex items-start gap-2 p-2.5 rounded-none text-left group transition-colors"
          style={{ background: 'var(--c-elev)', border: '1px solid var(--c-line)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-accent)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-line)' }}
        >
          <code
            className="text-[11px] font-mono text-[var(--c-ink)] group-hover:text-[var(--c-accent)] transition-colors"
          >
            {item.cmd}
          </code>
          <span className="text-[11px] font-mono" style={{ color: 'var(--c-faint)' }}>{item.desc}</span>
        </button>
      ))}
    </div>
  )
}

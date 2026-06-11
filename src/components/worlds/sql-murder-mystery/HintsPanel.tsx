'use client'

import { useState } from 'react'
import { Eye, Lock, Fingerprint, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

interface HintGroup {
  title: string
  hints: string[]
}

interface HintsPanelProps {
  hints: HintGroup[]
}

export function HintsPanel({ hints }: HintsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [revealStep, setRevealStep] = useState(0)

  // Exclude the last entry per group — that's always the full SQL answer
  const current = hints[phaseIdx]
  const clues = current.hints.slice(0, -1)
  const canReveal = revealStep < clues.length - 1

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#0a0a15', border: '1px solid rgba(245,158,11,0.1)' }}
    >
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.01)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
      >
        <div className="flex items-center gap-2.5">
          <Eye className="w-3.5 h-3.5 text-amber-500/40" />
          <span className="text-[10px] font-semibold text-white/40 tracking-widest uppercase">
            Field Notes
          </span>
        </div>
        <ChevronDown
          className={cn('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180')}
          style={{ color: '#2a2a3a' }}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: '#14141f' }}>
          {/* Phase selector */}
          <div className="flex gap-1.5 pt-3 flex-wrap">
            {hints.map((_, i) => (
              <button
                key={i}
                onClick={() => { setPhaseIdx(i); setRevealStep(0) }}
                className="px-2.5 py-1 rounded text-[9px] font-bold tracking-wider uppercase transition-all"
                style={phaseIdx === i
                  ? { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#d97706' }
                  : { background: '#0c0c18', border: '1px solid #1a1a28', color: '#2e2e48' }
                }
              >
                Phase {i + 1}
              </button>
            ))}
          </div>

          {/* Clues */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Lock className="w-2.5 h-2.5" style={{ color: 'rgba(245,158,11,0.3)' }} />
              <p
                className="text-[9px] font-bold tracking-widest uppercase"
                style={{ color: 'rgba(245,158,11,0.4)' }}
              >
                {current.title}
              </p>
            </div>

            {clues.slice(0, revealStep + 1).map((clue, i) => (
              <div
                key={i}
                className="text-[11px] mb-2 py-2 px-3 rounded-lg leading-relaxed italic"
                style={{ background: '#0c0c18', border: '1px solid #1a1a28', color: '#4a4a6a' }}
              >
                {clue}
              </div>
            ))}

            {canReveal ? (
              <button
                className="text-[10px] font-semibold tracking-wider transition-colors"
                style={{ color: '#6a6a8a' }}
                onClick={() => setRevealStep(s => s + 1)}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#d97706' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6a6a8a' }}
              >
                dig deeper →
              </button>
            ) : (
              <div
                className="flex items-center gap-1.5 text-[9px] tracking-wider uppercase mt-1"
                style={{ color: '#252535' }}
              >
                <Fingerprint className="w-3 h-3" />
                No further guidance
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

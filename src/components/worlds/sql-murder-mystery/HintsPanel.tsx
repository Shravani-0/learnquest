'use client'

import { useState } from 'react'
import { Eye, Lock, Fingerprint, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { revealSqlHint } from '@/app/adventures/actions'

interface HintGroup {
  title: string
  /** How many clues this group has. The text is fetched one at a time from the server. */
  count: number
}

interface HintsPanelProps {
  level: number
  hints: HintGroup[]
}

/**
 * Field Notes. Clue text is never in the page: each clue is fetched through the
 * revealSqlHint action, which records the reveal server-side (the XP skill tax),
 * so the hint count can't be faked from the browser.
 */
export function HintsPanel({ level, hints }: HintsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [phaseIdx, setPhaseIdx] = useState(0)
  /** Revealed clue text per group, in order. */
  const [revealed, setRevealed] = useState<Record<number, string[]>>({})
  const [loading, setLoading] = useState(false)

  const current = hints[phaseIdx]
  const clues = revealed[phaseIdx] ?? []
  const canReveal = clues.length < current.count

  const revealNext = async (group: number) => {
    const have = revealed[group]?.length ?? 0
    if (loading || have >= (hints[group]?.count ?? 0)) return
    setLoading(true)
    try {
      const res = await revealSqlHint({ level, group, index: have })
      if (res.ok && res.text != null) {
        setRevealed(r => ({ ...r, [group]: [...(r[group] ?? []), res.text!] }))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="rounded-none overflow-hidden"
      style={{ background: 'var(--c-elev)', border: '1px solid var(--c-line)' }}
    >
      <button
        onClick={() => {
          const next = !isOpen
          setIsOpen(next)
          // opening Field Notes reveals the first clue of the phase — that is a hint
          if (next && !(revealed[phaseIdx]?.length)) void revealNext(phaseIdx)
        }}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--c-elev-2)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
      >
        <div className="flex items-center gap-2.5">
          <Eye className="w-3.5 h-3.5 text-[var(--c-accent)]" />
          <span className="font-mono text-[11px] font-semibold text-[var(--c-muted)] tracking-widest uppercase">
            Field Notes
          </span>
        </div>
        <ChevronDown
          className={cn('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180')}
          style={{ color: 'var(--c-faint)' }}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'var(--c-line)' }}>
          {/* Phase selector */}
          <div className="flex gap-1.5 pt-3 flex-wrap">
            {hints.map((_, i) => (
              <button
                key={i}
                onClick={() => { setPhaseIdx(i); if (!(revealed[i]?.length)) void revealNext(i) }}
                className="px-2.5 py-1 rounded-none font-mono text-[11px] font-bold tracking-wider uppercase transition-colors hover:!border-[var(--c-accent)]"
                style={phaseIdx === i
                  ? { background: 'rgb(var(--accent-rgb) / 0.08)', border: '1px solid var(--c-accent)', color: 'var(--c-accent)' }
                  : { background: 'var(--c-bg)', border: '1px solid var(--c-line)', color: 'var(--c-faint)' }
                }
              >
                Phase {i + 1}
              </button>
            ))}
          </div>

          {/* Clues */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Lock className="w-2.5 h-2.5" style={{ color: 'var(--c-accent)' }} />
              <p
                className="font-mono text-[11px] font-bold tracking-widest uppercase"
                style={{ color: 'var(--c-muted)' }}
              >
                {current.title}
              </p>
            </div>

            {clues.map((clue, i) => (
              <div
                key={i}
                className="text-[11px] mb-2 py-2 px-3 rounded-none leading-relaxed italic"
                style={{ background: 'var(--c-bg)', border: '1px solid var(--c-line)', borderLeft: '2px solid var(--c-accent)', color: 'var(--c-muted)' }}
              >
                {clue}
              </div>
            ))}

            {canReveal ? (
              <button
                className="font-mono text-[11px] font-semibold tracking-wider transition-colors"
                style={{ color: 'var(--c-muted)' }}
                disabled={loading}
                onClick={() => void revealNext(phaseIdx)}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--c-accent)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--c-muted)' }}
              >
                {loading ? 'decrypting…' : clues.length === 0 ? 'reveal clue →' : 'dig deeper →'}
              </button>
            ) : (
              <div
                className="flex items-center gap-1.5 font-mono text-[11px] tracking-wider uppercase mt-1"
                style={{ color: 'var(--c-faint)' }}
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

'use client'

import { useEffect } from 'react'
import { Terminal } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { TermLine } from './types'

interface TerminalPanelProps {
  lines: TermLine[]
  input: string
  currentRoom: string
  isFinished: boolean
  containerRef: React.RefObject<HTMLDivElement>
  bottomRef: React.RefObject<HTMLDivElement>
  inputRef: React.RefObject<HTMLInputElement>
  onInputChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onClick: () => void
}

export function TerminalPanel({
  lines, input, currentRoom, isFinished,
  containerRef, bottomRef, inputRef,
  onInputChange, onKeyDown, onClick,
}: TerminalPanelProps) {
  // Focus the prompt for mouse/keyboard users only: on phones autofocus would pop
  // the keyboard over the story before the player has read it.
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus({ preventScroll: true })
  }, [inputRef])

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className="flex-1 h-[62svh] min-h-[360px] max-h-[640px] rounded-none overflow-hidden flex flex-col cursor-text"
      style={{ background: '#141414', border: '1px solid var(--c-line-2)' }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 border-b shrink-0"
        style={{ background: 'var(--c-elev)', borderColor: 'var(--c-line)' }}
      >
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full border border-[var(--c-line-2)] bg-transparent" />
          <div className="w-2.5 h-2.5 rounded-full border border-[var(--c-line-2)] bg-transparent" />
          <div className="w-2.5 h-2.5 rounded-full border border-[var(--c-line-2)] bg-transparent" />
        </div>
        <span
          className="text-[11px] font-mono uppercase tracking-[0.12em] ml-1"
          style={{ color: 'var(--c-faint)' }}
        >
          bash — {currentRoom}
        </span>
        <Terminal className="w-3 h-3 ml-auto" style={{ color: 'var(--c-faint)' }} />
      </div>

      {/* Output area */}
      <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto overflow-x-auto font-mono text-xs leading-relaxed space-y-0.5">
        {lines.map(line => (
          <div
            key={line.id}
            className={cn(line.type === 'system' ? 'whitespace-pre' : 'whitespace-pre-wrap break-words', {
              'text-[var(--c-ink)]':                   line.type === 'input',
              'text-[var(--c-muted)]':                 line.type === 'output',
              'text-[#FF7D73]':                        line.type === 'error',
              'text-[var(--c-ink)] italic':            line.type === 'story',
              'text-[var(--c-accent)] font-semibold':  line.type === 'success',
              'text-[var(--c-faint)]':                 line.type === 'system',
            })}
          >
            {line.type === 'input' ? (
              <span>
                <span className="text-[var(--c-accent)]">prison@cell</span>
                <span style={{ color: 'var(--c-faint)' }}>:</span>
                <span className="text-[var(--c-muted)]">{currentRoom}</span>
                <span style={{ color: 'var(--c-faint)' }}>$ </span>
                <span className="text-[var(--c-ink)]">{line.content}</span>
              </span>
            ) : line.content}
          </div>
        ))}

        {/* Live input line */}
        {!isFinished && (
          <div className="flex flex-wrap items-center mt-1">
            <span className="text-[var(--c-accent)]">prison@cell</span>
            <span style={{ color: 'var(--c-faint)' }}>:</span>
            <span className="text-[var(--c-muted)]">{currentRoom}</span>
            <span style={{ color: 'var(--c-faint)' }}>$ </span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              className="flex-1 bg-transparent text-[var(--c-ink)] outline-none focus-visible:outline-none min-w-0"
              style={{ caretColor: 'var(--c-accent)' }}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
            />
            <span className="terminal-cursor" style={{ background: 'var(--c-accent)' }} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

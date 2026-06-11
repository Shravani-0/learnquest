'use client'

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
  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className="flex-1 min-h-[420px] rounded-xl overflow-hidden flex flex-col cursor-text"
      style={{ background: '#05050e', border: '1px solid rgba(6,182,212,0.12)' }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 border-b shrink-0"
        style={{ background: '#080812', borderColor: 'rgba(6,182,212,0.1)' }}
      >
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
        </div>
        <span
          className="text-[10px] font-mono ml-1"
          style={{ color: 'rgba(6,182,212,0.25)' }}
        >
          bash — {currentRoom}
        </span>
        <Terminal className="w-3 h-3 ml-auto" style={{ color: 'rgba(6,182,212,0.2)' }} />
      </div>

      {/* Output area */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed space-y-0.5">
        {lines.map(line => (
          <div
            key={line.id}
            className={cn('whitespace-pre-wrap break-all', {
              'text-cyan-400':                   line.type === 'input',
              'text-cyan-100/75':                line.type === 'output',
              'text-red-400':                    line.type === 'error',
              'text-purple-400/80 italic':       line.type === 'story',
              'text-green-400 font-semibold':    line.type === 'success',
              'text-cyan-900':                   line.type === 'system',
            })}
          >
            {line.type === 'input' ? (
              <span>
                <span className="text-green-400">prison@cell</span>
                <span style={{ color: 'rgba(6,182,212,0.4)' }}>:</span>
                <span className="text-blue-400">{currentRoom}</span>
                <span style={{ color: 'rgba(6,182,212,0.4)' }}>$ </span>
                <span className="text-cyan-200">{line.content}</span>
              </span>
            ) : line.content}
          </div>
        ))}

        {/* Live input line */}
        {!isFinished && (
          <div className="flex items-center mt-1">
            <span className="text-green-400">prison@cell</span>
            <span style={{ color: 'rgba(6,182,212,0.4)' }}>:</span>
            <span className="text-blue-400">{currentRoom}</span>
            <span style={{ color: 'rgba(6,182,212,0.4)' }}>$ </span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              className="flex-1 bg-transparent text-cyan-200 outline-none min-w-0"
              style={{ caretColor: '#22d3ee' }}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
            />
            <span className="terminal-cursor" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

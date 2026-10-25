'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Lightbulb, Lock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

import type { TermLine } from './types'
import type { LinuxLevelContent } from '@/lib/quests/types'
import { TerminalPanel } from './TerminalPanel'
import { ObjectiveBar, CommandRef } from './ObjectiveBar'
import { runLinuxCommand, revealLinuxHint } from '@/app/adventures/actions'

interface GameAppProps {
  levels: LinuxLevelContent[]
  startLevel: number
  isAuthed: boolean
}

const mkLine = (type: TermLine['type'], content: string): TermLine => ({
  id: Math.random().toString(36).slice(2), type, content,
})

export function GameApp({ levels, startLevel, isAuthed }: GameAppProps) {
  const startIdx = Math.max(0, Math.min(levels.length - 1, startLevel - 1))

  const [lines, setLines] = useState<TermLine[]>([])
  const [input, setInput] = useState('')
  const [levelIdx, setLevelIdx] = useState(startIdx)
  const [totalXP, setTotalXP] = useState(0)
  const [inputHistory, setInputHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [showXP, setShowXP] = useState<{ amount: number; id: number } | null>(null)
  const [currentRoom, setCurrentRoom] = useState(levels[startIdx].room)
  const [showHint, setShowHint] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [needAuth, setNeedAuth] = useState(false)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const level = levels[levelIdx]
  const progressPercent = Math.round((levelIdx / levels.length) * 100)

  // Boot sequence
  useEffect(() => {
    const l0 = levels[startIdx]
    setLines([
      mkLine('system', '╔══════════════════════════════════╗'),
      mkLine('system', '║   PRISON SECURITY SYSTEM v3.7   ║'),
      mkLine('system', '║   CELL BLOCK C — TERMINAL 42    ║'),
      mkLine('system', '╚══════════════════════════════════╝'),
      mkLine('story', ''),
      mkLine('story', l0.story),
      mkLine('story', ''),
      mkLine('success', `▸ OBJECTIVE: ${l0.objective}`),
    ])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Scroll only the terminal's own output, never the page: scrollIntoView would
    // also scroll the window and drop phone players past the story intro.
    const out = bottomRef.current?.parentElement
    if (out) out.scrollTo({ top: out.scrollHeight, behavior: 'smooth' })
  }, [lines])

  const handleSubmit = useCallback(async () => {
    const raw = input.trim()
    if (!raw || isRunning || needAuth || isFinished) return

    const newLines: TermLine[] = [mkLine('input', raw)]
    setInputHistory(prev => [raw, ...prev.slice(0, 49)])
    setHistoryIdx(-1)
    setInput('')
    setShowHint(false)
    setIsRunning(true)

    try {
      const res = await runLinuxCommand({ level: level.id, command: raw, room: currentRoom })

      if (!res.ok) {
        newLines.push(mkLine('error',
          res.reason === 'auth_required'
            ? 'bash: access denied — sign in to continue.'
            : res.reason === 'locked'
              ? 'bash: locked — finish the previous room first.'
              : res.reason === 'rate_limited'
                ? 'bash: too many commands — slow down a moment.'
                : 'bash: this world is not available yet.'))
        setLines(prev => [...prev, ...newLines])
        return
      }

      // Server asked to clear the screen.
      if (res.lines.some(l => l.content === '__CLEAR__')) {
        setLines([])
        return
      }

      for (const l of res.lines) newLines.push(mkLine(l.type, l.content))
      setCurrentRoom(res.newRoom)

      if (!res.correct) {
        if (res.lines.some(l => l.type === 'error') && wrongAttempts === 0) {
          newLines.push(mkLine('output', `💡 ${level.hint}`))
        }
        setWrongAttempts(n => n + 1)
        setLines(prev => [...prev, ...newLines])
        return
      }

      // Correct.
      setWrongAttempts(0)
      if (res.storyEvent) {
        newLines.push(mkLine('story', ''))
        newLines.push(mkLine('story', res.storyEvent))
        newLines.push(mkLine('story', ''))
      }
      if (res.xpAwarded > 0) {
        setTotalXP(xp => xp + res.xpAwarded)
        setShowXP({ amount: res.xpAwarded, id: Date.now() })
        setTimeout(() => setShowXP(null), 2500)
      }

      if (res.needAuthToContinue) {
        newLines.push(mkLine('success', `Trial level complete!`))
        newLines.push(mkLine('story', ''))
        newLines.push(mkLine('system', '🔒 Sign in to save your progress and unlock the rest of the escape.'))
        setNeedAuth(true)
        setLines(prev => [...prev, ...newLines])
        return
      }

      const nextIdx = levelIdx + 1
      if (res.nextLevel != null && nextIdx < levels.length) {
        const next = levels[nextIdx]
        // Anonymous trial completions earn no XP — don't show a "+0 XP" badge.
        const xpText = res.xpAwarded > 0 ? `+${res.xpAwarded} XP — ` : ''
        newLines.push(mkLine('success', `${xpText}Level ${level.id} Complete!`))
        newLines.push(mkLine('story', ''))
        newLines.push(mkLine('story', `⬛ ${next.story}`))
        newLines.push(mkLine('story', ''))
        newLines.push(mkLine('success', `▸ OBJECTIVE: ${next.objective}`))
        setLevelIdx(nextIdx)
      } else {
        newLines.push(mkLine('success', `+${res.xpAwarded} XP`))
        newLines.push(mkLine('story', ''))
        newLines.push(mkLine('success', `🏆 MISSION COMPLETE — All ${levels.length} levels cleared!`))
        setIsFinished(true)
      }
      setLines(prev => [...prev, ...newLines])
    } finally {
      setIsRunning(false)
    }
  }, [input, isRunning, needAuth, isFinished, level, currentRoom, wrongAttempts, levelIdx, levels])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { void handleSubmit(); return }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(historyIdx + 1, inputHistory.length - 1)
      setHistoryIdx(next)
      setInput(inputHistory[next] || '')
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(historyIdx - 1, -1)
      setHistoryIdx(next)
      setInput(next === -1 ? '' : inputHistory[next] || '')
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--c-bg)', color: 'var(--c-ink)' }}
    >
      {/* ── Sticky header ── */}
      <header
        className="border-b lg:sticky lg:top-16 z-30"
        style={{ background: 'var(--c-bg)', borderColor: 'var(--c-line-2)' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-5 py-3 flex items-center justify-between gap-x-4 gap-y-2 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔐</span>
            <div>
              <h1 className="font-display text-sm font-bold uppercase tracking-tight text-[var(--c-ink)]">Linux Prison Break</h1>
              <p className="text-[11px] font-mono" style={{ color: 'var(--c-muted)' }}>
                {currentRoom}$
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3 flex-1 max-w-xs">
            <span className="text-[11px] font-mono shrink-0" style={{ color: 'var(--c-muted)' }}>
              {Math.min(levelIdx + 1, levels.length)}/{levels.length}
            </span>
            <div
              className="flex-1 h-1.5 rounded-none overflow-hidden"
              style={{ background: 'var(--c-line)' }}
            >
              <motion.div
                className="h-full rounded-none"
                style={{ background: 'var(--c-accent)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-[11px] font-mono shrink-0 text-[var(--c-accent)]">{progressPercent}%</span>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-none font-mono text-xs font-bold"
              style={{ background: 'rgb(var(--accent-rgb) / 0.08)', border: '1px solid rgb(var(--accent-rgb) / 0.35)', color: 'var(--c-accent)' }}
            >
              <Zap className="w-3.5 h-3.5" />
              {totalXP} XP
            </div>
            <button
              onClick={() => {
                // A voluntary hint open is recorded server-side (the XP skill tax).
                if (!showHint) void revealLinuxHint({ level: level.id })
                setShowHint(!showHint)
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] lg:min-h-0 rounded-none border font-mono text-xs font-medium transition-colors hover:!border-[var(--c-accent)]'
              )}
              style={showHint
                ? { background: 'rgb(var(--accent-rgb) / 0.1)', borderColor: 'var(--c-accent)', color: 'var(--c-accent)' }
                : { background: 'var(--c-elev)', borderColor: 'var(--c-line-2)', color: 'var(--c-muted)' }
              }
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Hint
            </button>
          </div>
        </div>

        {/* Collapsible hint bar */}
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t overflow-hidden"
              style={{ borderColor: 'var(--c-line)' }}
            >
              <div className="max-w-5xl mx-auto px-5 py-3 text-xs" style={{ color: 'var(--c-muted)' }}>
                <span className="font-semibold text-[var(--c-accent)]">💡 </span>
                {level.hint}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── XP pop ── */}
      <AnimatePresence>
        {showXP && (
          <motion.div
            key={showXP.id}
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.8 }}
            className="fixed top-24 right-8 z-50 px-4 py-2 rounded-none font-mono text-xs font-bold"
            style={{ background: 'var(--c-accent)', color: '#181818' }}
          >
            +{showXP.amount} XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-5 py-6 gap-4">
        <ObjectiveBar
          level={level}
          levels={levels}
          currentLevelIdx={levelIdx}
          isFinished={isFinished}
          totalXP={totalXP}
        />

        {needAuth && !isAuthed && (
          <div
            className="flex items-center gap-3 rounded-none px-4 py-3"
            style={{ background: 'rgb(var(--accent-rgb) / 0.06)', border: '1px solid rgb(var(--accent-rgb) / 0.35)' }}
          >
            <Lock className="w-4 h-4 shrink-0 text-[var(--c-accent)]" />
            <p className="text-[13px] flex-1 text-[var(--c-ink)]">
              Trial complete — <strong>sign in</strong> to save your XP and continue the escape.
            </p>
            <Link
              href="/login?next=/adventures/linux-prison-break/play"
              className="px-3 py-1.5 rounded-none font-mono text-[12px] font-bold text-[#181818] shrink-0 hover:opacity-90 transition-opacity"
              style={{ background: 'var(--c-accent)' }}
            >
              Sign in
            </Link>
          </div>
        )}

        <TerminalPanel
          lines={lines}
          input={input}
          currentRoom={currentRoom}
          isFinished={isFinished || needAuth}
          containerRef={containerRef}
          bottomRef={bottomRef}
          inputRef={inputRef}
          onInputChange={setInput}
          onKeyDown={handleKeyDown}
          onClick={() => inputRef.current?.focus()}
        />

        <CommandRef onFill={cmd => { setInput(cmd); inputRef.current?.focus() }} />
      </div>
    </div>
  )
}

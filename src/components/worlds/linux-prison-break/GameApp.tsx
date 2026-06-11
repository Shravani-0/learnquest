'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/cn'

import type { TermLine } from './types'
import { LEVELS } from './levels'
import { TerminalPanel } from './TerminalPanel'
import { ObjectiveBar, CommandRef } from './ObjectiveBar'

// ── Progress persistence ───────────────────────────────────────────────────────

const STORAGE_KEY = 'skillquest:linux-prison-break-completed'

function readCompletedLevels(): number[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}

function saveCompletedLevel(levelId: number) {
  const done = readCompletedLevels()
  if (!done.includes(levelId)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...done, levelId]))
  }
}

function computeStartIdx(): number {
  const done = readCompletedLevels()
  const first = LEVELS.findIndex(l => !done.includes(l.id))
  return first === -1 ? LEVELS.length - 1 : first
}

// ── Command processor ──────────────────────────────────────────────────────────

function processCommand(
  input: string,
  levelIdx: number,
  currentRoom: string
): { lines: TermLine[]; levelComplete: boolean; newRoom: string } {
  const mkId = () => Math.random().toString(36).slice(2)
  const raw = input.trim()
  const cmd = raw.toLowerCase().replace(/\s+/g, ' ')
  const level = LEVELS[levelIdx]
  const lines: TermLine[] = []

  const allowed = Array.isArray(level.command)
    ? level.command.map(c => c.toLowerCase())
    : [level.command.toLowerCase()]

  const isCorrect = allowed.some(c => cmd === c)

  if (!isCorrect) {
    if (cmd === 'help' || cmd === 'man') {
      lines.push({ id: mkId(), type: 'output', content: 'Available: pwd, ls, cd, cat, chmod, grep, find, echo, clear' })
      return { lines, levelComplete: false, newRoom: currentRoom }
    }
    if (cmd === 'clear') {
      return { lines: [{ id: mkId(), type: 'system', content: '__CLEAR__' }], levelComplete: false, newRoom: currentRoom }
    }
    if (cmd.startsWith('ls')) {
      lines.push({
        id: mkId(), type: 'output',
        content: currentRoom.includes('security')
          ? 'backup.conf  door_codes.enc  emergency.sh  logs/'
          : 'bed  terminal  note.txt  vent_cover',
      })
      return { lines, levelComplete: false, newRoom: currentRoom }
    }
    if (cmd.startsWith('pwd')) {
      lines.push({ id: mkId(), type: 'output', content: currentRoom })
      return { lines, levelComplete: false, newRoom: currentRoom }
    }
    lines.push({ id: mkId(), type: 'error', content: `bash: ${raw.split(' ')[0]}: command not found, or not the objective right now.` })
    return { lines, levelComplete: false, newRoom: currentRoom }
  }

  let newRoom = currentRoom
  if (cmd.startsWith('cd ')) {
    const parts = cmd.split(' ')
    newRoom = parts[1].startsWith('/') ? parts[1] : `/prison/${parts[1]}`
  }
  if (cmd.includes('/hangar/pod_7')) newRoom = '/hangar/pod_7'
  if (cmd.includes('&&')) {
    const parts = cmd.split('&&').map(p => p.trim())
    if (parts[0].startsWith('cd ')) newRoom = parts[0].split(' ')[1]
  }

  for (const line of level.successLines) {
    if (line) lines.push({ id: mkId(), type: 'output', content: line })
  }

  return { lines, levelComplete: true, newRoom }
}

// ── Main game component ────────────────────────────────────────────────────────

export function GameApp() {
  const [completedLevels, setCompletedLevels] = useState<number[]>(() => readCompletedLevels())
  const [lines, setLines] = useState<TermLine[]>([])
  const [input, setInput] = useState('')
  const [levelIdx, setLevelIdx] = useState(0)
  const [totalXP, setTotalXP] = useState(0)
  const [inputHistory, setInputHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [showXP, setShowXP] = useState<{ amount: number; id: number } | null>(null)
  const [currentRoom, setCurrentRoom] = useState(LEVELS[0].room)
  const [showHint, setShowHint] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [wrongAttempts, setWrongAttempts] = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)


  const level = LEVELS[levelIdx]
  const progressPercent = Math.round((levelIdx / LEVELS.length) * 100)

  const mkLine = (type: TermLine['type'], content: string): TermLine => ({
    id: Math.random().toString(36).slice(2), type, content,
  })

  // Boot sequence
  useEffect(() => {
    setLines([
      mkLine('system', '╔══════════════════════════════════╗'),
      mkLine('system', '║   PRISON SECURITY SYSTEM v3.7   ║'),
      mkLine('system', '║   CELL BLOCK C — TERMINAL 42    ║'),
      mkLine('system', '╚══════════════════════════════════╝'),
      mkLine('story', ''),
      mkLine('story', LEVELS[0].story),
      mkLine('story', ''),
      mkLine('success', `▸ OBJECTIVE: ${LEVELS[0].objective}`),
    ])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const handleSubmit = useCallback(() => {
    const raw = input.trim()
    if (!raw) return

    const inputLine = mkLine('input', raw)
    const newLines: TermLine[] = [inputLine]

    setInputHistory(prev => [raw, ...prev.slice(0, 49)])
    setHistoryIdx(-1)
    setInput('')
    setShowHint(false)

    const { lines: resultLines, levelComplete, newRoom } = processCommand(raw, levelIdx, currentRoom)

    if (resultLines.some(l => l.content === '__CLEAR__')) {
      setLines([])
      return
    }

    newLines.push(...resultLines)

    if (!levelComplete && resultLines.some(l => l.type === 'error')) {
      if (wrongAttempts === 0) {
        newLines.push(mkLine('output', `💡 ${level.hint}`))
      }
      setWrongAttempts(n => n + 1)
    }

    if (levelComplete) {
      setWrongAttempts(0)
      // Persist this level as completed
      saveCompletedLevel(level.id)
      setCompletedLevels(readCompletedLevels())

      newLines.push(mkLine('story', ''))
      newLines.push(mkLine('story', level.storyEvent))
      newLines.push(mkLine('story', ''))
      setCurrentRoom(newRoom)
      setTotalXP(xp => xp + level.xp)
      setShowXP({ amount: level.xp, id: Date.now() })
      setTimeout(() => setShowXP(null), 2500)

      const nextIdx = levelIdx + 1
      if (nextIdx < LEVELS.length) {
        newLines.push(mkLine('success', `+${level.xp} XP — Level ${level.id} Complete!`))
        newLines.push(mkLine('story', ''))
        newLines.push(mkLine('story', `⬛ ${LEVELS[nextIdx].story}`))
        newLines.push(mkLine('story', ''))
        newLines.push(mkLine('success', `▸ OBJECTIVE: ${LEVELS[nextIdx].objective}`))
        setLevelIdx(nextIdx)
      } else {
        newLines.push(mkLine('success', `+${level.xp} XP`))
        newLines.push(mkLine('story', ''))
        newLines.push(mkLine('success', '🏆 MISSION COMPLETE — All 10 levels cleared!'))
        newLines.push(mkLine('success', `Total XP: ${totalXP + level.xp}`))
        setIsFinished(true)
      }
    }

    setLines(prev => [...prev, ...newLines])
  }, [input, levelIdx, currentRoom, level, totalXP, wrongAttempts])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { handleSubmit(); return }
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
    if (e.key === 'Tab') {
      e.preventDefault()
      setInput(Array.isArray(level.command) ? level.command[0] : level.command)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", background: '#05050e' }}
    >
      {/* ── Sticky header ── */}
      <header
        className="border-b sticky top-16 z-30"
        style={{ background: 'rgba(7,7,18,0.92)', backdropFilter: 'blur(20px)', borderColor: 'rgba(6,182,212,0.15)' }}
      >
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔐</span>
            <div>
              <h1 className="text-sm font-bold text-cyan-300">Linux Prison Break</h1>
              <p className="text-[10px] font-mono" style={{ color: 'rgba(6,182,212,0.35)' }}>
                {currentRoom}$
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3 flex-1 max-w-xs">
            <span className="text-[10px] font-mono shrink-0" style={{ color: 'rgba(6,182,212,0.35)' }}>
              {Math.min(levelIdx + 1, LEVELS.length)}/{LEVELS.length}
            </span>
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(6,182,212,0.08)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #22d3ee, #0891b2)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-[10px] font-mono shrink-0 text-cyan-500">{progressPercent}%</span>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)', color: '#22d3ee' }}
            >
              <Zap className="w-3.5 h-3.5" />
              {totalXP} XP
            </div>
            <button
              onClick={() => setShowHint(h => !h)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors'
              )}
              style={showHint
                ? { background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.25)', color: '#fbbf24' }
                : { background: '#0c0c18', borderColor: '#1a1a28', color: '#2e2e48' }
              }
              onMouseEnter={e => { if (!showHint) (e.currentTarget as HTMLElement).style.color = '#5a5a7a' }}
              onMouseLeave={e => { if (!showHint) (e.currentTarget as HTMLElement).style.color = '#2e2e48' }}
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
              style={{ borderColor: 'rgba(245,158,11,0.12)' }}
            >
              <div className="max-w-5xl mx-auto px-5 py-3 text-xs" style={{ color: 'rgba(251,191,36,0.7)' }}>
                <span className="font-semibold text-amber-400">💡 </span>
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
            className="fixed top-24 right-8 z-50 px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(6,182,212,0.9)', color: '#05050e' }}
          >
            +{showXP.amount} XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-5 py-6 gap-4">
        <ObjectiveBar
          level={level}
          currentLevelIdx={levelIdx}
          isFinished={isFinished}
          totalXP={totalXP}
        />

        <TerminalPanel
          lines={lines}
          input={input}
          currentRoom={currentRoom}
          isFinished={isFinished}
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

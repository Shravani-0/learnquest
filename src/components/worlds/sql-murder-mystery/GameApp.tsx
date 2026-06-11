'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Zap, Search } from 'lucide-react'
import Link from 'next/link'

import { executeSQL } from '@/lib/sql-engine'
import { getMystery, MYSTERY_COUNT } from '@/lib/data/murder-mystery-levels'
import type { QueryResult } from '@/lib/types'

import { MissionBrief } from './StoryPanel'
import { SchemaMap } from './SchemaMap'
import { SqlConsole } from './SqlConsole'
import { HintsPanel } from './HintsPanel'
import { VerdictBox } from './VerdictBox'

// ── Progress detection ─────────────────────────────────────────────────────────

type GameState = {
  completedStepIds: string[]
  totalXP: number
  queriesRun: number
}

function detectProgress(
  query: string,
  result: QueryResult,
  mystery: ReturnType<typeof getMystery>,
  completedStepIds: string[],
): { stepId: string | null; xpGained: number } {
  const q = query.toLowerCase()
  if (result.error || result.rowCount === 0) return { stepId: null, xpGained: 10 }
  for (let i = 0; i < mystery.progressSteps.length; i++) {
    const step = mystery.progressSteps[i]
    if (!completedStepIds.includes(step.id) && step.detect(q, result)) {
      return { stepId: step.id, xpGained: step.xp }
    }
  }
  return { stepId: null, xpGained: 10 }
}

// ── Progress persistence ───────────────────────────────────────────────────────

const STORAGE_KEY = 'skillquest:sql-murder-mystery-completed'

function readCompletedLevels(): number[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}

function saveCompletedLevel(level: number) {
  const done = readCompletedLevels()
  if (!done.includes(level)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...done, level]))
  }
}

// ── Main game ──────────────────────────────────────────────────────────────────

function MysteryGame() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Levels the user has already earned
  const [completedLevels, setCompletedLevels] = useState<number[]>(() => readCompletedLevels())

  // Cases 1 & 2 are always accessible; Case 3 unlocks after completing one of them
  const maxAccessible = completedLevels.length === 0
    ? 2
    : Math.min(MYSTERY_COUNT, Math.max(...completedLevels) + 1)

  const rawLevel = parseInt(searchParams.get('level') ?? '1', 10)
  const requestedLevel = Math.max(1, Math.min(MYSTERY_COUNT, isNaN(rawLevel) ? 1 : rawLevel))
  // Clamp to what's actually unlocked — prevents direct-URL skipping
  const levelNum = Math.min(requestedLevel, maxAccessible)

  const mystery = getMystery(levelNum)

  // Redirect if the URL asked for a locked level
  useEffect(() => {
    if (requestedLevel > maxAccessible) {
      router.replace(`/adventures/sql-murder-mystery/play?level=${levelNum}`)
    }
  }, [requestedLevel, maxAccessible, levelNum, router])

  const [query, setQuery] = useState(mystery.starterQuery)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [queryHistory, setQueryHistory] = useState<string[]>([])
  const [gameState, setGameState] = useState<GameState>({
    completedStepIds: [],
    totalXP: 0,
    queriesRun: 0,
  })
  const [showXP, setShowXP] = useState<{ amount: number; id: number } | null>(null)
  const [killerSolved, setKillerSolved] = useState(false)
  const [mastermindSolved, setMastermindSolved] = useState(false)

  const runQuery = useCallback(() => {
    if (!query.trim()) return
    setIsRunning(true)
    setTimeout(() => {
      const res = executeSQL(query, mystery.db as Parameters<typeof executeSQL>[1])
      setResult(res)
      const { stepId, xpGained } = detectProgress(
        query, res, mystery, gameState.completedStepIds
      )
      setGameState(prev => ({
        completedStepIds:
          stepId && !prev.completedStepIds.includes(stepId)
            ? [...prev.completedStepIds, stepId]
            : prev.completedStepIds,
        totalXP: prev.totalXP + (res.error ? 0 : xpGained),
        queriesRun: prev.queriesRun + 1,
      }))
      if (!res.error && xpGained > 10) {
        setShowXP({ amount: xpGained, id: Date.now() })
        setTimeout(() => setShowXP(null), 2000)
      }
      setQueryHistory(prev => [query, ...prev.slice(0, 9)])
      setIsRunning(false)
    }, 120)
  }, [query, gameState.completedStepIds, mystery])

  // Handle ERD table click → inject SELECT into editor
  const handleTablePick = useCallback((table: string) => {
    setQuery(`SELECT * FROM ${table}\nLIMIT 5`)
  }, [])

  return (
    <div
      className="min-h-screen"
      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      {/* ── Atmospheric background ── */}
      <div className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background: `
            radial-gradient(1100px 560px at 78% -10%, rgba(124,92,255,0.08) 0%, transparent 60%),
            radial-gradient(900px 520px at 0% 0%, rgba(255,68,56,0.05) 0%, transparent 55%),
            #0a0a0f
          `
        }}
      />

      {/* ── Case header ── */}
      <header
        className="sticky top-16 z-30 border-b"
        style={{
          background: 'rgba(10,10,15,0.85)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <div className="max-w-[1500px] mx-auto px-5 py-3 flex items-center gap-4 flex-wrap">

          {/* Case badge + title */}
          <div className="flex items-center gap-3">
            <Link
              href="/adventures/sql-murder-mystery"
              className="flex items-center gap-1 text-[10px] transition-colors"
              style={{ color: '#2e2e48' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(124,92,255,0.7)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#2e2e48' }}
            >
              <ChevronLeft className="w-3 h-3" /> Cases
            </Link>
            <div className="w-px h-4" style={{ background: '#1e1e2e' }} />
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 40,
                height: 40,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFB23E',
                flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2"/>
                <path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold" style={{ color: 'rgba(236,237,242,0.9)' }}>
                {mystery.title}
              </h1>
              <p className="text-[10px] tracking-wide" style={{ color: 'rgba(236,237,242,0.3)' }}>
                {mystery.setting}
              </p>
            </div>
          </div>

          {/* XP + query count */}
          <div className="flex items-center gap-2.5 ml-auto">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{
                background: 'rgba(124,92,255,0.1)',
                border: '1px solid rgba(124,92,255,0.22)',
                color: '#c0a8ff',
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              {gameState.totalXP} XP
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background: '#0c0c18', border: '1px solid #1a1a28' }}
            >
              <Search className="w-3 h-3" style={{ color: '#252535' }} />
              <span className="text-[11px] font-mono" style={{ color: '#2e2e48' }}>
                {gameState.queriesRun}
              </span>
            </div>
            {/* Next Case — only visible once the current case is fully solved */}
            {levelNum < MYSTERY_COUNT && completedLevels.includes(levelNum) && (
              <Link
                href={`/adventures/sql-murder-mystery/play?level=${levelNum + 1}`}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  background: 'rgba(255,178,62,0.1)',
                  border: '1px solid rgba(255,178,62,0.2)',
                  color: '#d97706',
                }}
              >
                Case {levelNum + 1} <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── XP pop ── */}
      <AnimatePresence>
        {showXP && (
          <motion.div
            key={showXP.id}
            initial={{ opacity: 0, y: -16, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.85 }}
            className="fixed top-24 right-8 z-50 px-4 py-2 rounded-xl text-white text-sm font-bold"
            style={{ background: 'rgba(124,92,255,0.9)', boxShadow: '0 0 24px rgba(124,92,255,0.4)' }}
          >
            +{showXP.amount} XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2-column workspace ── */}
      <div className="max-w-[1500px] mx-auto px-5 py-5 pb-16">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: '300px 1fr', alignItems: 'start' }}
        >
          {/* ① Left: Mission Brief + Hints (sticky) */}
          <div
            className="flex flex-col gap-4"
            style={{ position: 'sticky', top: '5.5rem' }}
          >
            <MissionBrief
              intro={mystery.intro}
              mastermindName={mystery.mastermindName}
            />
            <HintsPanel hints={mystery.hints} />
          </div>

          {/* ② Right: Schema ERD + Console + Verdict (stacked) */}
          <div className="flex flex-col gap-4 min-w-0">
            <SchemaMap
              schema={mystery.schema}
              relationships={mystery.schemaRelationships}
              onTablePick={handleTablePick}
            />

            <SqlConsole
              query={query}
              result={result}
              isRunning={isRunning}
              queryHistory={queryHistory}
              onQueryChange={setQuery}
              onRun={runQuery}
            />

            <VerdictBox
              killerName={mystery.killerName}
              mastermindName={mystery.mastermindName}
              killerSolved={killerSolved}
              mastermindSolved={mastermindSolved}
              onKillerSolved={() => {
                setKillerSolved(true)
                setGameState(prev => ({ ...prev, totalXP: prev.totalXP + 200 }))
                setShowXP({ amount: 200, id: Date.now() })
                setTimeout(() => setShowXP(null), 2000)
                // Levels with no mastermind are fully complete on killer solve
                if (!mystery.mastermindName) {
                  saveCompletedLevel(levelNum)
                  setCompletedLevels(readCompletedLevels())
                }
              }}
              onMastermindSolved={() => {
                setMastermindSolved(true)
                setGameState(prev => ({ ...prev, totalXP: prev.totalXP + 400 }))
                setShowXP({ amount: 400, id: Date.now() })
                setTimeout(() => setShowXP(null), 2000)
                // Mastermind step is always the final step
                saveCompletedLevel(levelNum)
                setCompletedLevels(readCompletedLevels())
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Suspense boundary needed because of useSearchParams
export function GameApp() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#0a0a0f' }} />}>
      <MysteryGame />
    </Suspense>
  )
}

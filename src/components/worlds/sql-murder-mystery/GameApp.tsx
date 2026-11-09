'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Zap, Search, Lock } from 'lucide-react'
import Link from 'next/link'

import type { QueryResult } from '@/lib/types'
import type { SqlLevelContent } from '@/lib/quests/types'
import { runSqlQuery, submitVerdict } from '@/app/adventures/actions'

import { MissionBrief } from './StoryPanel'
import { SchemaMap } from './SchemaMap'
import { SqlConsole } from './SqlConsole'
import { FieldNotes } from './FieldNotes'
import { VerdictBox } from './VerdictBox'

interface GameAppProps {
  content: SqlLevelContent
  level: number
  count: number
  isAuthed: boolean
  /** Whether the player can open the next case (free trial or owned) — from the server. */
  nextOpen?: boolean
}

function stripMd(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, '$1')
}

const BLOCKED_NOTICE = {
  evidence: 'Show your work first: query the records that point to this suspect, then accuse.',
  rate_limited: 'Too many wrong accusations. The evidence locker is sealed for a few minutes.',
} as const

export function GameApp({ content, level, count, isAuthed, nextOpen = false }: GameAppProps) {
  const [query, setQuery] = useState(content.starterQuery)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [queryHistory, setQueryHistory] = useState<string[]>([])
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([])
  const [queriesRun, setQueriesRun] = useState(0)
  const [earnedXP, setEarnedXP] = useState(0)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [killerSolved, setKillerSolved] = useState(false)
  const [mastermindSolved, setMastermindSolved] = useState(false)
  const [caseSolved, setCaseSolved] = useState(false)
  const [needSignIn, setNeedSignIn] = useState(false)
  const [needUnlock, setNeedUnlock] = useState(false)

  const popToast = (text: string) => {
    const id = Date.now()
    setToast({ id, text })
    setTimeout(() => setToast(t => (t?.id === id ? null : t)), 2400)
  }

  const runQuery = useCallback(async () => {
    if (!query.trim() || isRunning) return
    setIsRunning(true)
    try {
      const res = await runSqlQuery({ level, query, completedStepIds })
      if (!res.ok || !res.result) {
        setResult({
          columns: [], rows: [], rowCount: 0, executionTime: 0,
          error:
            res.reason === 'auth_required'
              ? 'Sign in to play this case.'
              : res.reason === 'payment_required'
                ? 'This case is locked. Unlock it from the case file to play.'
                : res.reason === 'rate_limited'
                  ? 'Too many queries at once. Wait a moment and try again.'
                  : 'This case is not available.',
        })
        return
      }
      setResult(res.result)
      setQueriesRun(n => n + 1)
      setQueryHistory(prev => [query, ...prev.slice(0, 9)])
      if (res.step && !completedStepIds.includes(res.step.id)) {
        setCompletedStepIds(prev => [...prev, res.step!.id])
        popToast(stripMd(res.step.storyEvent))
      }
    } finally {
      setIsRunning(false)
    }
  }, [query, isRunning, level, completedStepIds])

  const handleTablePick = useCallback((table: string) => {
    setQuery(`SELECT * FROM ${table}\nLIMIT 5`)
  }, [])

  // A solved case: show the XP, then either point at the next case or explain
  // what's needed to open it (sign in, or unlock it).
  const afterSolve = useCallback((xp: number, persisted: boolean, headline: string) => {
    setCaseSolved(true)
    setEarnedXP(xp)
    if (persisted) popToast(`${headline} +${xp} XP`)
    else if (nextOpen) popToast(`${headline} On to the next case.`)
    if (level < count && !nextOpen) {
      if (isAuthed) setNeedUnlock(true)
      else setNeedSignIn(true)
    }
  }, [level, count, nextOpen, isAuthed])

  const onSubmitKiller = useCallback(async (name: string) => {
    const res = await submitVerdict({ level, kind: 'killer', name })
    if (res.blocked) return BLOCKED_NOTICE[res.blocked]
    if (!res.ok || !res.correct) return false
    setKillerSolved(true)
    if (res.levelComplete) afterSolve(res.xpAwarded, res.persisted, 'Case closed!')
    return true
  }, [level, afterSolve])

  const onSubmitMastermind = useCallback(async (name: string) => {
    const res = await submitVerdict({ level, kind: 'mastermind', name })
    if (res.blocked) return BLOCKED_NOTICE[res.blocked]
    if (!res.ok || !res.correct) return false
    setMastermindSolved(true)
    if (res.levelComplete) afterSolve(res.xpAwarded, res.persisted, 'Mastermind exposed!')
    return true
  }, [level, afterSolve])

  // The next case is a link only when the player can actually open it.
  const canGoNext = caseSolved && level < count && nextOpen

  return (
    <div className="min-h-screen font-sans text-[var(--c-ink)]">
      {/* ── Atmospheric background ── */}
      <div className="fixed inset-0 pointer-events-none -z-10"
        style={{ background: 'var(--c-bg)' }}
      />

      {/* ── Case header ── */}
      <header
        className="lg:sticky lg:top-16 z-30 border-b"
        style={{
          background: 'var(--c-bg)',
          borderColor: 'var(--c-line)',
        }}
      >
        <div className="max-w-[1500px] mx-auto px-4 sm:px-5 py-3 flex items-center gap-x-4 gap-y-2 flex-wrap">

          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/adventures/sql-murder-mystery"
              className="flex items-center gap-1 min-h-[44px] font-mono text-[11px] uppercase tracking-[0.14em] transition-colors"
              style={{ color: 'var(--c-faint)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--c-accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--c-faint)' }}
            >
              <ChevronLeft className="w-3 h-3" /> Cases
            </Link>
            <div className="w-px h-4" style={{ background: 'var(--c-line-2)' }} />
            <div
              className="flex items-center justify-center rounded-none"
              style={{
                width: 40,
                height: 40,
                background: 'var(--c-elev)',
                border: '1px solid var(--c-line-2)',
                color: 'var(--c-accent)',
                flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2"/>
                <path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-sm font-semibold truncate" style={{ color: 'var(--c-ink)' }}>
                {content.title}
              </h1>
              <p className="font-mono text-[11px] tracking-wide truncate" style={{ color: 'var(--c-faint)' }}>
                {content.setting}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-none font-mono text-xs font-bold"
              style={{
                background: 'rgb(var(--accent-rgb) / 0.08)',
                border: '1px solid rgb(var(--accent-rgb) / 0.4)',
                color: 'var(--c-accent)',
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              {earnedXP} XP
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-none"
              style={{ background: 'var(--c-elev)', border: '1px solid var(--c-line)' }}
            >
              <Search className="w-3 h-3" style={{ color: 'var(--c-faint)' }} />
              <span className="text-[11px] font-mono" style={{ color: 'var(--c-muted)' }}>
                {queriesRun}
              </span>
            </div>
            {canGoNext && (
              <Link
                href={`/adventures/sql-murder-mystery/play?level=${level + 1}`}
                className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-none font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-colors bg-[var(--c-accent)] text-[var(--c-accent-ink)] border border-[var(--c-accent)] hover:bg-transparent hover:text-[var(--c-accent)]"
              >
                Case {level + 1} <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Toast (clue unlocked / XP) ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.85 }}
            className="fixed top-24 left-4 right-4 sm:left-auto sm:right-8 z-50 sm:max-w-xs px-4 py-2.5 rounded-none text-[13px] font-semibold leading-snug"
            style={{ background: 'var(--c-accent)', color: 'var(--c-accent-ink)', border: '1px solid var(--c-accent)' }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2-column workspace ── */}
      <div className="max-w-[1500px] mx-auto px-4 sm:px-5 py-4 sm:py-5 pb-16">
        <div className="grid gap-4 items-start grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Left: Mission Brief + Hints (sticky on desktop, stacked on top on phones) */}
          <div className="flex flex-col gap-4 min-w-0 lg:sticky lg:top-[9rem]">
            <MissionBrief intro={content.intro} hasMastermind={content.hasMastermind} />
            <FieldNotes level={level} />
          </div>

          {/* Right: Schema ERD + Console + Verdict (stacked) */}
          <div className="flex flex-col gap-4 min-w-0">
            <SchemaMap
              schema={content.schema}
              relationships={content.schemaRelationships}
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

            {needSignIn && (
              <div
                className="flex flex-wrap items-center gap-3 rounded-none px-4 py-3"
                style={{ background: 'rgb(var(--accent-rgb) / 0.08)', border: '1px solid rgb(var(--accent-rgb) / 0.4)' }}
              >
                <Lock className="w-4 h-4 shrink-0" style={{ color: 'var(--c-accent)' }} />
                <p className="text-[13px] flex-1 min-w-[12rem]" style={{ color: 'var(--c-ink)' }}>
                  Nicely solved! <strong>Sign in</strong> to save your progress and unlock the next case.
                </p>
                <Link
                  href={`/login?next=${encodeURIComponent(`/adventures/sql-murder-mystery/play?level=${level + 1 <= count ? level + 1 : level}`)}`}
                  className="px-3 py-1.5 rounded-none font-mono text-[12px] font-bold uppercase tracking-[0.1em] shrink-0 transition-colors bg-[var(--c-accent)] text-[var(--c-accent-ink)] border border-[var(--c-accent)] hover:bg-transparent hover:text-[var(--c-accent)]"
                >
                  Sign in
                </Link>
              </div>
            )}

            {needUnlock && (
              <div
                className="flex flex-wrap items-center gap-3 rounded-none px-4 py-3"
                style={{ background: 'rgb(var(--accent-rgb) / 0.08)', border: '1px solid rgb(var(--accent-rgb) / 0.4)' }}
              >
                <Lock className="w-4 h-4 shrink-0" style={{ color: 'var(--c-accent)' }} />
                <p className="text-[13px] flex-1 min-w-[12rem]" style={{ color: 'var(--c-ink)' }}>
                  Case closed! <strong>Case {level + 1}</strong> is locked. Unlock it, the whole world, or go Pro.
                </p>
                <Link
                  href={`/adventures/sql-murder-mystery?unlock=${level + 1}#unlock`}
                  className="px-3 py-1.5 rounded-none font-mono text-[12px] font-bold uppercase tracking-[0.1em] shrink-0 transition-colors bg-[var(--c-accent)] text-[var(--c-accent-ink)] border border-[var(--c-accent)] hover:bg-transparent hover:text-[var(--c-accent)]"
                >
                  Unlock
                </Link>
              </div>
            )}

            <VerdictBox
              hasMastermind={content.hasMastermind}
              killerSolved={killerSolved}
              mastermindSolved={mastermindSolved}
              onSubmitKiller={onSubmitKiller}
              onSubmitMastermind={onSubmitMastermind}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

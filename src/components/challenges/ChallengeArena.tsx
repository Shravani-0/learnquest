'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SqlConsole } from '@/components/worlds/sql-murder-mystery/SqlConsole'
import { TerminalPanel } from '@/components/worlds/linux-prison-break/TerminalPanel'
import type { TermLine } from '@/components/worlds/linux-prison-break/types'
import { startChallengeRun, submitChallengeMove, giveUpChallenge } from '@/app/challenges/actions'
import { formatDuration } from '@/lib/challenges/rules'
import type { QueryResult } from '@/lib/types'
import type { ClientPuzzle } from '@/lib/server/challenges/bank'

const mkLine = (type: TermLine['type'], content: string): TermLine => ({
  id: Math.random().toString(36).slice(2), type, content,
})

/**
 * One player's timed run. The puzzle is fetched only when the run starts (the
 * server starts the clock then); a reload resumes the same run. Every query or
 * command is graded on the server.
 */
export default function ChallengeArena({ code, started }: { code: string; started: boolean }) {
  const router = useRouter()
  const [run, setRun] = useState<{ puzzle: ClientPuzzle; startedAt: number; limitMs: number } | null>(null)
  const [moves, setMoves] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [solvedIn, setSolvedIn] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [confirmGiveUp, setConfirmGiveUp] = useState(false)

  // SQL state
  const [query, setQuery] = useState('SELECT * FROM customers\nLIMIT 5')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [history, setHistory] = useState<string[]>([])
  // Linux state
  const [lines, setLines] = useState<TermLine[]>([])
  const [input, setInput] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const begin = useCallback(async () => {
    setBusy(true)
    setError(null)
    const res = await startChallengeRun(code)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      router.refresh()
      return
    }
    setRun({ puzzle: res.puzzle, startedAt: res.startedAt, limitMs: res.limitMs })
    setMoves(res.moves)
    if (res.puzzle.skill === 'linux') {
      setLines([mkLine('system', `Connected. cwd: ${res.puzzle.cwd}`), mkLine('success', `▸ ${res.puzzle.prompt}`)])
    }
  }, [code, router])

  // Resume an already-started run on load.
  useEffect(() => {
    if (started) void begin()
  }, [started, begin])

  // Clock.
  useEffect(() => {
    if (!run || solvedIn != null) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [run, solvedIn])

  const left = run ? Math.max(0, run.startedAt + run.limitMs - now) : 0
  useEffect(() => {
    if (run && solvedIn == null && left === 0) router.refresh() // time's up; the server scores it
  }, [run, solvedIn, left, router])

  useEffect(() => {
    const out = bottomRef.current?.parentElement
    if (out) out.scrollTo({ top: out.scrollHeight, behavior: 'smooth' })
  }, [lines])

  async function submit(text: string) {
    if (!run || busy || solvedIn != null || !text.trim()) return
    setBusy(true)
    const res = await submitChallengeMove(code, text)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      router.refresh()
      return
    }
    setMoves(res.moves)
    if (res.kind === 'sql') {
      setResult(res.result)
      setHistory(h => [text, ...h.slice(0, 9)])
    } else {
      setLines(prev => [...prev, mkLine('input', text), ...res.lines.map(l => mkLine(l.type, l.content))])
    }
    if (res.solved) {
      setSolvedIn(Date.now() - run.startedAt)
      if (res.kind === 'linux') setLines(prev => [...prev, mkLine('success', '✓ Solved.')])
      setTimeout(() => router.refresh(), 1600)
    }
  }

  async function giveUp() {
    setBusy(true)
    await giveUpChallenge(code)
    router.refresh()
  }

  if (!run) {
    return (
      <div className="sq-panel sq-arena-start">
        <div className="sq-panel__body sq-stack" style={{ gap: '0.8rem', justifyItems: 'start' }}>
          {started ? (
            <p className="sq-panel__help" style={{ border: 0, padding: 0 }}>Resuming your run…</p>
          ) : (
            <>
              <p className="sq-arena-start__lead">
                You get <b>one run</b>. The clock starts when you press start and runs for 15 minutes,
                even if you close the tab.
              </p>
              <button type="button" className="sq-btn" onClick={begin} disabled={busy}>
                <span className="sq-btn__fill" aria-hidden="true" />
                {busy ? 'starting…' : 'start my run'}
                <span className="sq-arrow" aria-hidden="true">→</span>
              </button>
            </>
          )}
          {error && <p className="sq-buy__err" role="alert" style={{ textAlign: 'left' }}>{error}</p>}
        </div>
      </div>
    )
  }

  const p = run.puzzle
  return (
    <section className="sq-arena" aria-label="Your run">
      <div className="sq-arena__bar">
        <span className="sq-arena__title">{p.title}</span>
        <span className="sq-arena__stat sq-num">{moves} {p.skill === 'sql' ? 'queries' : 'commands'}</span>
        <span className={`sq-arena__clock sq-num${left < 60_000 && solvedIn == null ? ' is-low' : ''}`} aria-live="off">
          {solvedIn != null ? `solved in ${formatDuration(solvedIn)}` : formatDuration(left)}
        </span>
      </div>
      <p className="sq-arena__prompt">{p.prompt}</p>

      {p.skill === 'sql' ? (
        <>
          <p className="sq-arena__tables">
            {p.tables.map(t => (
              <span key={t.name}><b>{t.name}</b>({t.columns.join(', ')})</span>
            ))}
          </p>
          <SqlConsole
            query={query}
            result={result}
            isRunning={busy}
            queryHistory={history}
            onQueryChange={setQuery}
            onRun={() => submit(query)}
          />
        </>
      ) : (
        <TerminalPanel
          lines={lines}
          input={input}
          currentRoom={p.cwd}
          isFinished={solvedIn != null}
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
          bottomRef={bottomRef as React.RefObject<HTMLDivElement>}
          inputRef={inputRef as React.RefObject<HTMLInputElement>}
          onInputChange={setInput}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const text = input
              setInput('')
              void submit(text)
            }
          }}
          onClick={() => inputRef.current?.focus()}
        />
      )}

      {error && <p className="sq-buy__err" role="alert" style={{ textAlign: 'left' }}>{error}</p>}

      {solvedIn == null && (
        <div className="sq-arena__foot">
          {confirmGiveUp ? (
            <span className="sq-buy__row">
              <span className="sq-buy__note">End your run unsolved?</span>
              <button type="button" className="sq-link" onClick={giveUp} disabled={busy}>yes, give up</button>
              <button type="button" className="sq-link" onClick={() => setConfirmGiveUp(false)}>keep going</button>
            </span>
          ) : (
            <button type="button" className="sq-link" onClick={() => setConfirmGiveUp(true)}>give up</button>
          )}
        </div>
      )}
    </section>
  )
}

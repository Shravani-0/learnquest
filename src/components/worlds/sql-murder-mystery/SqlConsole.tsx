'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import Editor, { type OnMount } from '@monaco-editor/react'
import { Play, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import type { QueryResult } from '@/lib/types'

const SQL_KEYWORDS = ['SELECT', 'WHERE', 'JOIN', 'GROUP BY', 'ORDER BY', 'LIMIT']

function ResultTable({ result }: { result: QueryResult }) {
  if (result.error) {
    return (
      <div
        className="flex items-start gap-3 p-4 rounded-none"
        style={{ background: 'rgb(255 125 115 / 0.08)', border: '1px solid rgb(255 125 115 / 0.4)' }}
      >
        <XCircle className="w-4 h-4 text-[#FF7D73] shrink-0 mt-0.5" />
        <div>
          <p className="font-mono text-[11px] font-semibold text-[#FF7D73] mb-1 tracking-widest uppercase">
            Query Error
          </p>
          <p className="text-xs text-[var(--c-ink)] font-mono leading-relaxed">{result.error}</p>
        </div>
      </div>
    )
  }
  if (result.rowCount === 0) {
    return (
      <div
        className="flex items-center gap-2.5 p-4 rounded-none font-mono text-xs"
        style={{ background: '#141414', border: '1px solid var(--c-line)', color: 'var(--c-muted)' }}
      >
        <AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--c-accent)' }} />
        No records found — refine your query.
      </div>
    )
  }
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <CheckCircle2 className="w-3 h-3" style={{ color: 'var(--c-accent)' }} />
        <span
          className="text-[11px] font-mono tracking-wider uppercase"
          style={{ color: 'var(--c-muted)' }}
        >
          {result.rowCount} record{result.rowCount !== 1 ? 's' : ''} · {result.executionTime}ms
        </span>
      </div>
      <div
        className="overflow-auto rounded-none max-h-56 [&_th]:!bg-[var(--c-elev-2)] [&_th]:!text-[var(--c-accent)] [&_th]:!border-[var(--c-line-2)] [&_td]:!text-[var(--c-ink)] [&_td]:!border-[var(--c-line)] [&_tr:hover_td]:!bg-[rgb(var(--accent-rgb)/0.06)]"
        style={{ border: '1px solid var(--c-line)', background: '#141414' }}
      >
        <table className="sql-table">
          <thead>
            <tr>
              {result.columns.map(col => <th key={col}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, ri) => (
              <tr key={ri}>
                {result.columns.map(col => (
                  <td key={col}>
                    {row[col] === null
                      ? <span style={{ color: 'var(--c-faint)', fontStyle: 'italic' }}>NULL</span>
                      : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface SqlConsoleProps {
  query: string
  result: QueryResult | null
  isRunning: boolean
  queryHistory: string[]
  onQueryChange: (q: string) => void
  onRun: () => void
}

export function SqlConsole({
  query, result, isRunning, queryHistory, onQueryChange, onRun,
}: SqlConsoleProps) {
  const onRunRef = useRef(onRun)
  onRunRef.current = onRun

  const handleEditorMount: OnMount = (editor, monaco) => {
    // Cmd/Ctrl+Enter to run
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => onRunRef.current(),
    )

    // Dark theme matching the game UI
    monaco.editor.defineTheme('sql-mystery', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword.sql',   foreground: 'E4FF1A', fontStyle: 'bold' },
        { token: 'string.sql',    foreground: 'B7B7B0' },
        { token: 'number',        foreground: 'B7B7B0' },
        { token: 'comment',       foreground: '8C8C84', fontStyle: 'italic' },
        { token: 'operator.sql',  foreground: 'F2F0E6' },
        { token: 'identifier',    foreground: 'F2F0E6' },
      ],
      colors: {
        'editor.background':           '#141414',
        'editor.foreground':           '#F2F0E6',
        'editorLineNumber.foreground': '#8C8C84',
        'editorLineNumber.activeForeground': '#F2F0E6',
        'editorCursor.foreground':     '#E4FF1A',
        'editor.selectionBackground':  '#E4FF1A33',
        'editorWhitespace.foreground': '#292927',
        'editor.lineHighlightBackground': '#1F1F1F',
        'editorGutter.background':     '#141414',
        'scrollbar.shadow':            '#00000000',
        'scrollbarSlider.background':  '#29292788',
      },
    })
    monaco.editor.setTheme('sql-mystery')
  }

  return (
    <div className="space-y-4">
      {/* Editor panel */}
      <div
        className="rounded-none overflow-hidden"
        style={{ background: '#141414', border: '1px solid var(--c-line-2)' }}
      >
        {/* macOS-style title bar */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b"
          style={{ background: 'var(--c-elev)', borderColor: 'var(--c-line)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full border border-[var(--c-line-2)] bg-transparent" />
              <div className="w-2.5 h-2.5 rounded-full border border-[var(--c-line-2)] bg-transparent" />
              <div className="w-2.5 h-2.5 rounded-full border border-[var(--c-line-2)] bg-transparent" />
            </div>
            <span className="text-[11px] font-mono ml-1" style={{ color: 'var(--c-muted)' }}>
              query.sql
            </span>
          </div>

          <div className="flex items-center gap-3">
            {queryHistory.length > 0 && (
              <div className="relative group">
                <button
                  className="font-mono text-[11px] px-2 py-1 rounded-none transition-colors"
                  style={{ color: 'var(--c-faint)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--c-accent)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--c-faint)' }}
                >
                  history ↑
                </button>
                <div
                  className="absolute right-0 top-7 z-50 hidden group-hover:block w-80 rounded-none overflow-hidden"
                  style={{ background: 'var(--c-elev)', border: '1px solid var(--c-line-2)' }}
                >
                  {queryHistory.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => onQueryChange(q)}
                      className="w-full text-left px-3 py-2 text-[11px] font-mono truncate border-b last:border-none transition-colors"
                      style={{ color: 'var(--c-muted)', borderColor: 'var(--c-line)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--c-elev-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--c-ink)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--c-muted)' }}
                    >
                      {q.replace(/\s+/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <span className="font-mono text-[11px]" style={{ color: 'var(--c-faint)' }}>⌘↵ to run</span>
          </div>
        </div>

        {/* Monaco SQL editor */}
        <Editor
          height="168px"
          language="sql"
          value={query}
          onChange={v => onQueryChange(v ?? '')}
          onMount={handleEditorMount}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            lineDecorationsWidth: 0,
            renderLineHighlight: 'line',
            padding: { top: 16, bottom: 16 },
            scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            contextmenu: false,
            wordWrap: 'on',
            tabSize: 2,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
          }}
        />

        {/* Keyword chips + run button */}
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: 'var(--c-line)', background: 'var(--c-elev)' }}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            {SQL_KEYWORDS.map(kw => (
              <button
                key={kw}
                onClick={() => onQueryChange(query + (query.endsWith('\n') || query === '' ? '' : '\n') + kw + ' ')}
                className="px-2.5 py-0.5 min-h-[36px] lg:min-h-0 rounded-none text-[11px] font-mono font-bold tracking-wider transition-colors hover:!border-[var(--c-accent)] hover:!text-[var(--c-accent)]"
                style={{
                  color: 'var(--c-muted)',
                  background: 'transparent',
                  border: '1px solid var(--c-line-2)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgb(var(--accent-rgb) / 0.08)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {kw}
              </button>
            ))}
          </div>

          <button
            onClick={onRun}
            disabled={isRunning || !query.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-none font-mono text-xs font-bold tracking-wider uppercase border disabled:opacity-40 disabled:cursor-not-allowed transition-colors enabled:hover:!bg-transparent enabled:hover:!text-[var(--c-accent)]"
            style={{
              background: isRunning ? 'var(--c-elev-2)' : 'var(--c-accent)',
              color: isRunning ? 'var(--c-muted)' : 'var(--c-accent-ink)',
              borderColor: isRunning ? 'var(--c-line-2)' : 'var(--c-accent)',
              whiteSpace: 'nowrap',
            }}
          >
            {isRunning
              ? <><Clock className="w-3.5 h-3.5 animate-spin" /> Running…</>
              : <><Play className="w-3.5 h-3.5" /> Run Query</>
            }
          </button>
        </div>
      </div>

      {/* Results panel */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-none overflow-hidden"
          style={{ background: 'var(--c-elev)', border: '1px solid var(--c-line)' }}
        >
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 border-b"
            style={{ background: 'var(--c-elev)', borderColor: 'var(--c-line)' }}
          >
            <span className="font-mono text-[11px] font-semibold text-[var(--c-muted)] tracking-widest uppercase">
              Evidence Report
            </span>
            {!result.error && (
              <span className="text-[11px] font-mono ml-auto" style={{ color: 'var(--c-faint)' }}>
                {result.rowCount} rows · {result.executionTime}ms
              </span>
            )}
          </div>
          <div className="p-4">
            <ResultTable result={result} />
          </div>
        </motion.div>
      )}
    </div>
  )
}

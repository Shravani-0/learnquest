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
        className="flex items-start gap-3 p-4 rounded-lg"
        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
      >
        <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-semibold text-red-400 mb-1 tracking-widest uppercase">
            Query Error
          </p>
          <p className="text-xs text-red-300/70 font-mono leading-relaxed">{result.error}</p>
        </div>
      </div>
    )
  }
  if (result.rowCount === 0) {
    return (
      <div
        className="flex items-center gap-2.5 p-4 rounded-lg text-xs"
        style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', color: 'rgba(245,158,11,0.45)' }}
      >
        <AlertCircle className="w-4 h-4 shrink-0" />
        No records found — refine your query.
      </div>
    )
  }
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <CheckCircle2 className="w-3 h-3" style={{ color: 'rgba(16,185,129,0.6)' }} />
        <span
          className="text-[10px] font-mono tracking-wider uppercase"
          style={{ color: 'rgba(245,158,11,0.4)' }}
        >
          {result.rowCount} record{result.rowCount !== 1 ? 's' : ''} · {result.executionTime}ms
        </span>
      </div>
      <div
        className="overflow-auto rounded-lg max-h-56"
        style={{ border: '1px solid #1e1e2e' }}
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
                      ? <span style={{ color: '#2a2a3e', fontStyle: 'italic' }}>NULL</span>
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
        { token: 'keyword.sql',   foreground: '7C5CFF', fontStyle: 'bold' },
        { token: 'string.sql',    foreground: 'F59E0B' },
        { token: 'number',        foreground: '10B981' },
        { token: 'comment',       foreground: '3a3a5a', fontStyle: 'italic' },
        { token: 'operator.sql',  foreground: 'c084fc' },
        { token: 'identifier',    foreground: 'c8c8e0' },
      ],
      colors: {
        'editor.background':           '#06060e',
        'editor.foreground':           '#c8c8e0',
        'editorLineNumber.foreground': '#1e1e2e',
        'editorCursor.foreground':     '#d97706',
        'editor.selectionBackground':  '#7C5CFF33',
        'editorWhitespace.foreground': '#12121e',
        'editor.lineHighlightBackground': '#0c0c18',
        'editorGutter.background':     '#06060e',
        'scrollbar.shadow':            '#00000000',
        'scrollbarSlider.background':  '#1e1e2e88',
      },
    })
    monaco.editor.setTheme('sql-mystery')
  }

  return (
    <div className="space-y-4">
      {/* Editor panel */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: '#06060e', border: '1px solid #12121e' }}
      >
        {/* macOS-style title bar */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b"
          style={{ background: '#09091a', borderColor: '#12121e' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
            </div>
            <span className="text-[10px] font-mono ml-1" style={{ color: '#2a2a40' }}>
              query.sql
            </span>
          </div>

          <div className="flex items-center gap-3">
            {queryHistory.length > 0 && (
              <div className="relative group">
                <button
                  className="text-[10px] px-2 py-1 rounded transition-colors"
                  style={{ color: '#2a2a40' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#5a5a7a' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#2a2a40' }}
                >
                  history ↑
                </button>
                <div
                  className="absolute right-0 top-7 z-50 hidden group-hover:block w-80 rounded-xl shadow-2xl overflow-hidden"
                  style={{ background: '#09091a', border: '1px solid #14141f' }}
                >
                  {queryHistory.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => onQueryChange(q)}
                      className="w-full text-left px-3 py-2 text-[10px] font-mono truncate border-b last:border-none transition-colors"
                      style={{ color: '#3a3a5a', borderColor: '#12121e' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0f0f1e'; (e.currentTarget as HTMLElement).style.color = '#8a8aaa' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = '#3a3a5a' }}
                    >
                      {q.replace(/\s+/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <span className="text-[10px]" style={{ color: '#1e1e2e' }}>⌘↵ to run</span>
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
          style={{ borderColor: '#12121e', background: 'rgba(9,9,26,0.5)' }}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            {SQL_KEYWORDS.map(kw => (
              <button
                key={kw}
                onClick={() => onQueryChange(query + (query.endsWith('\n') || query === '' ? '' : '\n') + kw + ' ')}
                className="px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider transition-colors"
                style={{
                  color: '#4a8aaa',
                  background: 'rgba(6,182,212,0.06)',
                  border: '1px solid rgba(6,182,212,0.12)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(6,182,212,0.12)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(6,182,212,0.06)' }}
              >
                {kw}
              </button>
            ))}
          </div>

          <button
            onClick={onRun}
            disabled={isRunning || !query.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-xs font-bold tracking-wider uppercase disabled:opacity-40 transition-all"
            style={{
              background: isRunning ? '#1a1a28' : 'linear-gradient(150deg, rgba(124,92,255,0.86) 0%, #7C5CFF 100%)',
              boxShadow: isRunning ? 'none' : '0 6px 18px rgba(124,92,255,0.32)',
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
          className="rounded-xl overflow-hidden"
          style={{ background: '#0a0a15', border: '1px solid #14141f' }}
        >
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 border-b"
            style={{ background: '#09091a', borderColor: '#14141f' }}
          >
            <span className="text-[10px] font-semibold text-white/45 tracking-widest uppercase">
              Evidence Report
            </span>
            {!result.error && (
              <span className="text-[10px] font-mono ml-auto" style={{ color: '#2a2a40' }}>
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

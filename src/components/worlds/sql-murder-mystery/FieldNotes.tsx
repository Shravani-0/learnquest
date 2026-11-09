'use client'

import { useEffect, useState } from 'react'
import { NotebookPen } from 'lucide-react'

interface FieldNotesProps {
  level: number
}

const storageKey = (level: number) => `unrust:notes:sql-murder-mystery:${level}`

/**
 * The detective's own notepad: free text, no clues. Saved per case in this
 * browser so notes survive a refresh. Storage can be unavailable (private mode,
 * blocked site data), so every access is guarded and the pad still works.
 */
export function FieldNotes({ level }: FieldNotesProps) {
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(true)
  // Which case's notes are in state. Saving waits for this so a case switch can
  // never write the previous case's notes under the new case's key.
  const [loadedFor, setLoadedFor] = useState<number | null>(null)

  useEffect(() => {
    let stored = ''
    try {
      stored = localStorage.getItem(storageKey(level)) ?? ''
    } catch {
      /* storage unavailable */
    }
    setNotes(stored)
    setLoadedFor(level)
  }, [level])

  useEffect(() => {
    if (loadedFor !== level) return
    setSaved(false)
    const t = setTimeout(() => {
      try {
        if (notes) localStorage.setItem(storageKey(level), notes)
        else localStorage.removeItem(storageKey(level))
      } catch {
        /* storage unavailable: notes live for this visit only */
      }
      setSaved(true)
    }, 400)
    return () => clearTimeout(t)
  }, [notes, level, loadedFor])

  return (
    <div
      className="rounded-none overflow-hidden"
      style={{ background: 'var(--c-elev)', border: '1px solid var(--c-line)' }}
    >
      <label htmlFor="sq-field-notes" className="flex items-center justify-between gap-2.5 px-4 py-3">
        <span className="flex items-center gap-2.5">
          <NotebookPen className="w-3.5 h-3.5 text-[var(--c-accent)]" />
          <span className="font-mono text-[11px] font-semibold text-[var(--c-muted)] tracking-widest uppercase">
            Field Notes
          </span>
        </span>
        <span className="font-mono text-[11px]" style={{ color: 'var(--c-faint)' }} aria-live="polite">
          {notes ? (saved ? 'saved' : 'saving…') : ''}
        </span>
      </label>
      <div className="px-4 pb-4">
        <textarea
          id="sq-field-notes"
          value={notes}
          onChange={e => setNotes(e.target.value.slice(0, 5000))}
          placeholder={'Suspects, IDs, plates, leads…'}
          rows={6}
          spellCheck={false}
          className="w-full resize-y rounded-none px-3 py-2.5 font-mono text-[12px] leading-relaxed outline-none transition-colors placeholder:text-[var(--c-faint)] focus:!border-[var(--c-accent)]"
          style={{
            background: 'var(--c-bg)',
            border: '1px solid var(--c-line-2)',
            color: 'var(--c-ink)',
            caretColor: 'var(--c-accent)',
            minHeight: '7.5rem',
          }}
        />
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'

interface VerdictBoxProps {
  hasMastermind: boolean
  killerSolved: boolean
  mastermindSolved: boolean
  /**
   * Return true if the accusation was correct (verified on the server), false if
   * wrong, or a notice string when the server refused to grade it (no evidence
   * yet, or too many wrong guesses).
   */
  onSubmitKiller: (name: string) => Promise<boolean | string>
  onSubmitMastermind: (name: string) => Promise<boolean | string>
}

/**
 * The verdict form holds NO answers. It sends the accusation to the server,
 * which grades it; the returned boolean drives the right/wrong feedback.
 */
export function VerdictBox({
  hasMastermind,
  killerSolved,
  mastermindSolved,
  onSubmitKiller,
  onSubmitMastermind,
}: VerdictBoxProps) {
  const [killerInput, setKillerInput] = useState('')
  const [killerStatus, setKillerStatus] = useState<'right' | 'wrong' | null>(null)
  const [killerBusy, setKillerBusy] = useState(false)
  const [mastermindInput, setMastermindInput] = useState('')
  const [mastermindStatus, setMastermindStatus] = useState<'right' | 'wrong' | null>(null)
  const [mastermindBusy, setMastermindBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const submitKiller = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = killerInput.trim()
    if (!v || killerBusy) return
    setKillerBusy(true)
    try {
      const res = await onSubmitKiller(v)
      setNotice(typeof res === 'string' ? res : null)
      setKillerStatus(typeof res === 'string' ? null : res ? 'right' : 'wrong')
    } finally {
      setKillerBusy(false)
    }
  }

  const submitMastermind = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = mastermindInput.trim()
    if (!v || mastermindBusy) return
    setMastermindBusy(true)
    try {
      const res = await onSubmitMastermind(v)
      setNotice(typeof res === 'string' ? res : null)
      setMastermindStatus(typeof res === 'string' ? null : res ? 'right' : 'wrong')
    } finally {
      setMastermindBusy(false)
    }
  }

  const showMastermind = killerSolved && hasMastermind

  return (
    <div
      className="rounded-none overflow-hidden"
      style={{
        background: 'var(--c-elev)',
        border: '1px solid var(--c-line-2)',
        borderTop: '2px solid var(--c-accent)',
      }}
    >
      <div className="px-4 py-4">
        <div className="flex items-start gap-3 mb-4">
          <span
            className="flex items-center justify-center rounded-none text-lg flex-shrink-0"
            style={{
              width: 40,
              height: 40,
              background: 'rgb(var(--accent-rgb) / 0.08)',
              border: '1px solid rgb(var(--accent-rgb) / 0.4)',
              color: 'var(--c-accent)',
            }}
          >
            ⚖
          </span>
          <div>
            <h3 className="font-display text-sm font-semibold" style={{ color: 'var(--c-ink)' }}>
              Submit your verdict
            </h3>
            <p className="text-[12.5px] mt-0.5 leading-snug" style={{ color: 'var(--c-muted)' }}>
              {showMastermind ? (
                <>Found the mastermind? Name <strong style={{ color: 'var(--c-accent)' }}>the person behind it all</strong>.</>
              ) : (
                <>Found the killer? Name <strong style={{ color: 'var(--c-accent)' }}>the murderer</strong> to close the case.</>
              )}
            </p>
          </div>
        </div>

        {/* Killer verdict */}
        {!killerSolved && (
          <form onSubmit={submitKiller} className="flex gap-2">
            <input
              value={killerInput}
              onChange={e => { setKillerInput(e.target.value); setKillerStatus(null) }}
              placeholder="e.g. Firstname Lastname"
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-none font-mono text-sm outline-none transition-colors placeholder:text-[var(--c-faint)] focus:!border-[var(--c-accent)]"
              style={{
                background: '#141414',
                border: killerStatus === 'right'
                  ? '1px solid var(--c-accent)'
                  : killerStatus === 'wrong'
                    ? '1px solid #FF7D73'
                    : '1px solid var(--c-line-2)',
                color: 'var(--c-ink)',
              }}
            />
            <button
              type="submit"
              disabled={killerBusy}
              className="px-4 py-2.5 rounded-none font-mono text-sm font-bold uppercase tracking-[0.1em] transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--c-accent)] text-[var(--c-accent-ink)] border border-[var(--c-accent)] enabled:hover:bg-transparent enabled:hover:text-[var(--c-accent)]"
            >
              {killerBusy ? 'Checking…' : 'Accuse'}
            </button>
          </form>
        )}

        {killerStatus === 'right' && (
          <div
            className="mt-2 px-3.5 py-2.5 rounded-none text-[13px] leading-snug"
            style={{
              background: 'rgb(var(--accent-rgb) / 0.08)',
              border: '1px solid rgb(var(--accent-rgb) / 0.4)',
              color: 'var(--c-ink)',
            }}
          >
            ✓ Case cracked. <strong style={{ color: 'var(--c-accent)' }}>{killerInput.trim()}</strong> is the killer.
            {hasMastermind ? ' But who hired them?' : ' The mystery is solved.'}
          </div>
        )}

        {killerStatus === 'wrong' && (
          <div
            className="mt-2 px-3.5 py-2.5 rounded-none text-[13px]"
            style={{
              background: 'rgb(255 125 115 / 0.08)',
              border: '1px solid rgb(255 125 115 / 0.4)',
              color: '#FF7D73',
            }}
          >
            ✗ That&apos;s not the killer. Re-check the evidence.
          </div>
        )}

        {/* Mastermind verdict */}
        {showMastermind && !mastermindSolved && (
          <form onSubmit={submitMastermind} className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--c-line)' }}>
            <input
              value={mastermindInput}
              onChange={e => { setMastermindInput(e.target.value); setMastermindStatus(null) }}
              placeholder="Who hired the killer?"
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-none font-mono text-sm outline-none transition-colors placeholder:text-[var(--c-faint)] focus:!border-[var(--c-accent)]"
              style={{
                background: '#141414',
                border: mastermindStatus === 'right'
                  ? '1px solid var(--c-accent)'
                  : mastermindStatus === 'wrong'
                    ? '1px solid #FF7D73'
                    : '1px solid var(--c-line-2)',
                color: 'var(--c-ink)',
              }}
            />
            <button
              type="submit"
              disabled={mastermindBusy}
              className="px-4 py-2.5 rounded-none font-mono text-sm font-bold uppercase tracking-[0.1em] transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--c-accent)] text-[var(--c-accent-ink)] border border-[var(--c-accent)] enabled:hover:bg-transparent enabled:hover:text-[var(--c-accent)]"
            >
              {mastermindBusy ? 'Checking…' : 'Accuse'}
            </button>
          </form>
        )}

        {mastermindStatus === 'right' && (
          <div
            className="mt-2 px-3.5 py-2.5 rounded-none text-[13px] leading-snug"
            style={{
              background: 'rgb(var(--accent-rgb) / 0.08)',
              border: '1px solid rgb(var(--accent-rgb) / 0.4)',
              color: 'var(--c-ink)',
            }}
          >
            ✓ Mystery solved. <strong style={{ color: 'var(--c-accent)' }}>{mastermindInput.trim()}</strong> is the mastermind.
          </div>
        )}

        {mastermindStatus === 'wrong' && (
          <div
            className="mt-2 px-3.5 py-2.5 rounded-none text-[13px]"
            style={{
              background: 'rgb(255 125 115 / 0.08)',
              border: '1px solid rgb(255 125 115 / 0.4)',
              color: '#FF7D73',
            }}
          >
            ✗ That&apos;s not the mastermind. Follow the money.
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mt-2 px-3.5 py-2.5 rounded-none font-mono text-[12px] leading-snug"
            style={{ background: 'var(--c-bg)', border: '1px solid var(--c-line-2)', color: 'var(--c-muted)' }}
          >
            <span style={{ color: 'var(--c-accent)' }}>! </span>{notice}
          </div>
        )}
      </div>
    </div>
  )
}

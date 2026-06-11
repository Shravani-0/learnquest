'use client'

import { useState } from 'react'

interface VerdictBoxProps {
  killerName: string
  mastermindName?: string
  killerSolved: boolean
  mastermindSolved: boolean
  onKillerSolved: () => void
  onMastermindSolved: () => void
}

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function VerdictBox({
  killerName,
  mastermindName,
  killerSolved,
  mastermindSolved,
  onKillerSolved,
  onMastermindSolved,
}: VerdictBoxProps) {
  const [killerInput, setKillerInput] = useState('')
  const [killerStatus, setKillerStatus] = useState<'right' | 'wrong' | null>(null)
  const [mastermindInput, setMastermindInput] = useState('')
  const [mastermindStatus, setMastermindStatus] = useState<'right' | 'wrong' | null>(null)

  const submitKiller = (e: React.FormEvent) => {
    e.preventDefault()
    const v = normalize(killerInput)
    if (!v) return
    const correct = normalize(killerName) === v
    setKillerStatus(correct ? 'right' : 'wrong')
    if (correct) onKillerSolved()
  }

  const submitMastermind = (e: React.FormEvent) => {
    e.preventDefault()
    if (!mastermindName) return
    const v = normalize(mastermindInput)
    if (!v) return
    const aliases = [normalize(mastermindName), 'miranda priestley']
    const correct = aliases.includes(v)
    setMastermindStatus(correct ? 'right' : 'wrong')
    if (correct) onMastermindSolved()
  }

  const showMastermind = killerSolved && mastermindName

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'linear-gradient(150deg, rgba(124,92,255,0.07) 0%, #14141e 100%)',
        border: '1px solid rgba(124,92,255,0.28)',
      }}
    >
      <div className="px-4 py-4">
        <div className="flex items-start gap-3 mb-4">
          <span
            className="flex items-center justify-center rounded-xl text-lg flex-shrink-0"
            style={{
              width: 40,
              height: 40,
              background: 'rgba(124,92,255,0.18)',
              border: '1px solid rgba(124,92,255,0.38)',
            }}
          >
            ⚖
          </span>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'rgba(236,237,242,0.95)' }}>
              Submit your verdict
            </h3>
            <p className="text-[12.5px] mt-0.5 leading-snug" style={{ color: 'rgba(236,237,242,0.5)' }}>
              {showMastermind ? (
                <>Found the mastermind? Name <strong style={{ color: '#FFB23E' }}>the person behind it all</strong>.</>
              ) : (
                <>Found the killer? Name <strong style={{ color: '#FFB23E' }}>the murderer</strong> to close the case.</>
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
              className="flex-1 px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all"
              style={{
                background: '#0a0a14',
                border: killerStatus === 'right'
                  ? '1px solid #27C2A0'
                  : killerStatus === 'wrong'
                    ? '1px solid #FF4438'
                    : '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(236,237,242,0.9)',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-all flex-shrink-0"
              style={{
                background: 'linear-gradient(150deg, rgba(124,92,255,0.86) 0%, #7C5CFF 100%)',
                border: 'none',
                boxShadow: '0 6px 18px rgba(124,92,255,0.32)',
              }}
            >
              Accuse
            </button>
          </form>
        )}

        {killerStatus === 'right' && (
          <div
            className="mt-2 px-3.5 py-2.5 rounded-lg text-[13px] leading-snug"
            style={{
              background: 'rgba(39,194,160,0.1)',
              border: '1px solid rgba(39,194,160,0.3)',
              color: '#8af0d6',
            }}
          >
            ✓ Case cracked. <strong style={{ color: '#fff' }}>{killerInput.trim()}</strong> is the killer.
            {mastermindName ? ' But who hired them?' : ' The mystery is solved.'}
          </div>
        )}

        {killerStatus === 'wrong' && (
          <div
            className="mt-2 px-3.5 py-2.5 rounded-lg text-[13px]"
            style={{
              background: 'rgba(255,68,56,0.09)',
              border: '1px solid rgba(255,68,56,0.28)',
              color: '#ffb0a8',
            }}
          >
            ✗ That&apos;s not the killer. Re-check the evidence.
          </div>
        )}

        {/* Mastermind verdict */}
        {showMastermind && !mastermindSolved && (
          <form onSubmit={submitMastermind} className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <input
              value={mastermindInput}
              onChange={e => { setMastermindInput(e.target.value); setMastermindStatus(null) }}
              placeholder="Who hired the killer?"
              className="flex-1 px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all"
              style={{
                background: '#0a0a14',
                border: mastermindStatus === 'right'
                  ? '1px solid #27C2A0'
                  : mastermindStatus === 'wrong'
                    ? '1px solid #FF4438'
                    : '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(236,237,242,0.9)',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-all flex-shrink-0"
              style={{
                background: 'linear-gradient(150deg, rgba(255,178,62,0.9) 0%, #d97706 100%)',
                border: 'none',
                boxShadow: '0 6px 18px rgba(217,119,6,0.3)',
              }}
            >
              Accuse
            </button>
          </form>
        )}

        {mastermindStatus === 'right' && (
          <div
            className="mt-2 px-3.5 py-2.5 rounded-lg text-[13px] leading-snug"
            style={{
              background: 'rgba(39,194,160,0.1)',
              border: '1px solid rgba(39,194,160,0.3)',
              color: '#8af0d6',
            }}
          >
            ✓ Mystery solved. <strong style={{ color: '#fff' }}>{mastermindInput.trim()}</strong> is the mastermind.
          </div>
        )}

        {mastermindStatus === 'wrong' && (
          <div
            className="mt-2 px-3.5 py-2.5 rounded-lg text-[13px]"
            style={{
              background: 'rgba(255,68,56,0.09)',
              border: '1px solid rgba(255,68,56,0.28)',
              color: '#ffb0a8',
            }}
          >
            ✗ That&apos;s not the mastermind. Follow the money.
          </div>
        )}
      </div>
    </div>
  )
}

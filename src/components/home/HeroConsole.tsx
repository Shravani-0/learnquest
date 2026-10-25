'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { worlds, isPlayable } from '@/lib/worlds'
import { scramble } from '@/engine/scramble'
import { prefersReducedMotion } from '@/engine/env'

type Line = {
  id: number
  kind: 'cmd' | 'out' | 'ok' | 'err' | 'muted'
  text: string
  href?: string
  scramble?: boolean
}

const HINTS = [
  'run sql-murder-mystery',
  'ls worlds',
  'run linux-prison-break',
  'help',
  'whoami',
]

export type HeroSession = {
  handle: string
  clearance: string
  xp: number
  nextClearance: string | null
  xpToNext: number
} | null

let uid = 0
const line = (l: Omit<Line, 'id'>): Line => ({ id: ++uid, ...l })

function banner(): Line[] {
  return [
    line({ kind: 'muted', text: 'unrust OS 1.0 · 6 systems, 2 online. Type a command, or tap one below.' }),
    line({ kind: 'muted', text: "Try 'ls worlds' to list systems, 'whoami' for clearance, 'help' for commands." }),
  ]
}

export default function HeroConsole({ session }: { session: HeroSession }) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [lines, setLines] = useState<Line[]>(() => banner())
  const [focused, setFocused] = useState(false)
  const [hint, setHint] = useState(HINTS[0])
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Idle: rotate a scrambled hint while the prompt is empty and unfocused (the concept breathes).
  useEffect(() => {
    if (input || focused) return
    let i = 0
    const t = setInterval(() => {
      i = (i + 1) % HINTS.length
      setHint(HINTS[i])
    }, 2600)
    return () => clearInterval(t)
  }, [input, focused])

  // Keep the viewport pinned to the latest output.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight })
  }, [lines])

  const push = useCallback((next: Line[]) => setLines((prev) => [...prev, ...next]), [])

  const runCommand = useCallback(
    (raw: string) => {
      const cmd = raw.trim()
      if (!cmd) return
      push([line({ kind: 'cmd', text: cmd })])
      const [verb, ...rest] = cmd.toLowerCase().split(/\s+/)
      const arg = rest.join(' ')

      if (verb === 'clear') {
        setLines([])
        return
      }
      if (verb === 'help') {
        push([
          line({ kind: 'out', text: 'ls worlds        list every system and its status', scramble: true }),
          line({ kind: 'out', text: 'run <system>     boot a system (e.g. run sql-murder-mystery)', scramble: true }),
          line({ kind: 'out', text: 'whoami           show your clearance and XP', scramble: true }),
          line({ kind: 'out', text: 'clear            wipe the console', scramble: true }),
        ])
        return
      }
      if (verb === 'whoami' || verb === 'id') {
        if (session) {
          push([
            line({ kind: 'ok', text: `${session.handle}`, scramble: true }),
            line({ kind: 'out', text: `clearance: ${session.clearance} · ${session.xp.toLocaleString()} XP` }),
            session.nextClearance
              ? line({ kind: 'muted', text: `${session.xpToNext.toLocaleString()} XP to ${session.nextClearance} clearance` })
              : line({ kind: 'muted', text: 'root — maximum clearance. the whole box is yours.' }),
          ])
        } else {
          push([
            line({ kind: 'out', text: 'guest — clearance: trial only.', scramble: true }),
            line({ kind: 'out', text: 'sign in to earn clearance, save progress and unlock worlds.', href: '/login' }),
          ])
        }
        return
      }
      if (verb === 'ls' || verb === 'dir') {
        push(
          worlds.map((w) =>
            line({
              kind: isPlayable(w) ? 'ok' : 'muted',
              text: `${isPlayable(w) ? '● READY ' : '◌ LOCKED'}  ${w.title}  (${w.skill})`,
              href: isPlayable(w) ? `/adventures/${w.slug}` : undefined,
            }),
          ),
        )
        return
      }
      if (verb === 'run' || verb === 'cd' || verb === 'open') {
        const target = worlds.find((w) => w.slug === arg || w.slug === arg.replace(/\s+/g, '-'))
        if (!target) {
          push([line({ kind: 'err', text: `no such system: ${arg || '(none)'}. try 'ls worlds'.` })])
          return
        }
        if (!isPlayable(target)) {
          push([line({ kind: 'err', text: `ACCESS DENIED: ${target.title} is still locked. Coming soon.` })])
          return
        }
        push([
          line({ kind: 'ok', text: `booting ${target.title}…`, scramble: true }),
        ])
        setTimeout(() => router.push(`/adventures/${target.slug}`), 520)
        return
      }
      push([line({ kind: 'err', text: `command not found: ${verb}. type 'help'.` })])
    },
    [push, router, session],
  )

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    runCommand(input)
    setInput('')
  }

  return (
    <>
    {/* Brand poster — the wordmark leads the page, large and centered */}
    <section className="sq-hero" aria-labelledby="sq-hero-h">
      <div className="sq-shell sq-hero__center">
        <p className="sq-kicker">unrust · interactive skill worlds</p>
        <h1 id="sq-hero-h" className="sq-wordmark">
          <span className="sq-wordmark__a">un</span><span className="sq-wordmark__b">rust</span>
        </h1>
        <p className="sq-hero__tag">Learn by breaking in.</p>
        <p className="sq-hero__sub">
          Solve a murder in SQL. Escape a prison in the shell. On unrust you run real commands
          against real systems, and keep the skill after the story ends.
        </p>
        <div className="sq-hero__cta">
          <Link href="/adventures" className="sq-btn">
            <span className="sq-btn__fill" aria-hidden="true" />
            Start a world
            <span className="sq-arrow" aria-hidden="true">→</span>
          </Link>
          <Link href="/adventures" className="sq-btn sq-btn--ghost">
            <span className="sq-btn__fill" aria-hidden="true" />
            Browse all quests
          </Link>
        </div>
      </div>
    </section>

    {/* The live console (the signature), centered below the brand */}
    <section className="sq-console-section" aria-label="Interactive console">
      <div className="sq-shell sq-console-wrap">
        <p className="sq-kicker sq-console-label">live console · try a command</p>
        <div className="sq-term">
          <div className="sq-term__bar">
            <span className="sq-term__dots" aria-hidden="true">
              <i /><i /><i />
            </span>
            <span className="sq-term__name">guest@unrust: ~</span>
            <span className="sq-term__name sq-term__name--r">bash</span>
          </div>

          <div className="sq-term__body" ref={bodyRef}>
            <ul className="sq-term__log" aria-live="polite">
              {lines.map((l) => (
                <ConsoleLine key={l.id} line={l} />
              ))}
            </ul>

            <form className="sq-term__prompt" onSubmit={onSubmit}>
              <label htmlFor="sq-cmd" className="sq-term__ps1" aria-hidden="true">
                guest@unrust:~$
              </label>
              <span className="sr-only">
                <label htmlFor="sq-cmd">Type a command for the unrust console</label>
              </span>
              <input
                id="sq-cmd"
                ref={inputRef}
                className="sq-term__input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={!focused ? hint : ''}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
              />
              {!input && !focused && <span className="sq-caret" aria-hidden="true" />}
            </form>
          </div>

          <div className="sq-term__chips">
            {['help', 'ls worlds', 'run sql-murder-mystery', 'whoami'].map((c) => (
              <button
                key={c}
                type="button"
                className="sq-chip"
                onClick={() => {
                  runCommand(c)
                  inputRef.current?.focus()
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
    </>
  )
}

function ConsoleLine({ line: l }: { line: Line }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (l.scramble && ref.current && !prefersReducedMotion()) {
      scramble(ref.current, 0.6)
    }
    // run once on mount; the line's text never changes after creation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cls = `sq-term__line sq-term__line--${l.kind}`
  if (l.href) {
    return (
      <li className={cls}>
        {l.kind === 'cmd' && <span className="sq-term__ps1" aria-hidden="true">$</span>}
        <Link href={l.href} className="sq-term__a sq-draw">
          {l.text}
        </Link>
      </li>
    )
  }
  return (
    <li className={cls}>
      {l.kind === 'cmd' && <span className="sq-term__ps1" aria-hidden="true">$</span>}
      <span ref={ref}>{l.text}</span>
    </li>
  )
}

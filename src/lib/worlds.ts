import { adventures } from '@/lib/data/adventures'
import type { Adventure } from '@/lib/types'

// Map a world's legacy `color` to its signal CSS var (color comes from the work).
const SIGNAL: Record<string, string> = {
  amber: 'var(--w-sql)',
  cyan: 'var(--w-linux)',
  blue: 'var(--w-git)',
  red: 'var(--w-sec)',
  purple: 'var(--w-data)',
  yellow: 'var(--w-js)',
}

export const signalFor = (color: string) => SIGNAL[color] ?? 'var(--c-accent)'

export const isPlayable = (a: Adventure) => !a.isComingSoon

/** Worlds ordered playable-first, which is also how the index + console list them. */
export const worlds = [...adventures].sort(
  (a, b) => Number(isPlayable(b)) - Number(isPlayable(a)),
)

export const SKILL_ABBR: Record<string, string> = {
  SQL: 'SQL',
  Linux: 'SHELL',
  Git: 'GIT',
  Cybersecurity: 'SEC',
  JavaScript: 'JS',
  'Data Analysis': 'DATA',
  Python: 'PY',
}

export const DIFF_ABBR: Record<string, string> = {
  Beginner: 'BEG',
  Intermediate: 'INT',
  Advanced: 'ADV',
  Expert: 'EXP',
}

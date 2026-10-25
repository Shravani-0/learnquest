/**
 * Shared quest types — client-safe (pure types, no data, no answers).
 * These describe the *presentational* content the server hands to the browser
 * and the shapes returned by the server actions. The actual level data, win
 * conditions and correct answers live only in `src/lib/server/quests/*`.
 */
import type { QueryResult } from '@/lib/types'

export type SchemaRelationship = { from: string; fromCol: string; to: string; toCol: string }

/** SQL murder-mystery content safe to render in the browser (no db, no killer). */
export interface SqlLevelContent {
  id: number
  title: string
  setting: string
  intro: string
  hasMastermind: boolean
  schema: Record<string, string[]>
  schemaRelationships: SchemaRelationship[]
  starterQuery: string
  starterQueries: string[]
  /** Hint groups: titles + how many clues each has. Clue text comes from revealSqlHint. */
  hints: { title: string; count: number }[]
  xpReward: number
}

/** Linux level content safe to render in the browser (no command, no successLines). */
export interface LinuxLevelContent {
  id: number
  room: string
  story: string
  objective: string
  hint: string
  xp: number
  unlocks: string
}

export type AccessReason = 'coming_soon' | 'auth_required' | 'locked' | 'not_configured' | 'rate_limited'

export interface SqlRunResult {
  ok: boolean
  reason?: AccessReason
  result?: QueryResult
  step?: { id: string; storyEvent: string; isKiller: boolean; isMastermind: boolean } | null
}

export interface VerdictResult {
  ok: boolean
  reason?: AccessReason
  correct: boolean
  levelComplete: boolean
  xpAwarded: number
  /** false for anonymous players — nothing was saved; prompt them to sign in. */
  persisted: boolean
  nextLevel: number | null
  /** Why a verdict was refused before grading: no detected evidence, or too many wrong guesses. */
  blocked?: 'evidence' | 'rate_limited'
}

export interface HintResult {
  ok: boolean
  reason?: AccessReason
  text?: string
}

export interface TermLineDTO {
  type: 'input' | 'output' | 'error' | 'story' | 'success' | 'system'
  content: string
}

export interface LinuxRunResult {
  ok: boolean
  reason?: AccessReason
  correct: boolean
  lines: TermLineDTO[]
  storyEvent?: string | null
  newRoom: string
  levelComplete: boolean
  xpAwarded: number
  persisted: boolean
  nextLevel: number | null
  /** Anonymous player finished the free trial level — must sign in to continue. */
  needAuthToContinue: boolean
}

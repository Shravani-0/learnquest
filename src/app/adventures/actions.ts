'use server'

import { revalidatePath } from 'next/cache'
import { awardFor } from '@/lib/xp'
import { executeSQL } from '@/lib/sql-engine'
import * as sql from '@/lib/server/quests/sql-murder-mystery'
import {
  processCommand,
  getLinuxLevel,
  linuxLevelXp,
  LINUX_COUNT,
} from '@/lib/server/quests/linux-prison-break'
import * as access from '@/lib/server/quests/access'
import { allow, clientKey } from '@/lib/server/rate-limit'
import type { SqlRunResult, VerdictResult, LinuxRunResult, HintResult } from '@/lib/quests/types'

const SQL_ID = 'sql-murder-mystery'
const LINUX_ID = 'linux-prison-break'

const MINUTE = 60_000
/** Wrong accusations allowed per case in WRONG_VERDICT_WINDOW before guessing is paused. */
const MAX_WRONG_VERDICTS = 5
const WRONG_VERDICT_WINDOW = 15 * MINUTE

function clampLevel(level: unknown, count: number): number {
  const n = Math.floor(Number(level))
  if (!Number.isFinite(n)) return 1
  return Math.max(1, Math.min(count, n))
}

/**
 * Execute a SQL query for a case and grade it server-side. The seed database and
 * win conditions never leave the server; the browser only gets the query result
 * rows (the game content it is meant to explore) plus any story beat unlocked.
 * Steps carry no XP — XP is granted only when the case is solved (see submitVerdict).
 */
export async function runSqlQuery(input: {
  level: number
  query: string
  completedStepIds: string[]
}): Promise<SqlRunResult> {
  const level = clampLevel(input.level, sql.MYSTERY_COUNT)
  const gate = await access.checkAccess(SQL_ID, level)
  if (!gate.ok) return { ok: false, reason: gate.reason }
  if (!allow(await clientKey(gate.userId), 'sql', 60, MINUTE)) return { ok: false, reason: 'rate_limited' }

  const query = String(input.query ?? '').slice(0, 4000)
  const mystery = sql.getMystery(level)
  const result = executeSQL(query, mystery.db as Parameters<typeof executeSQL>[1])

  // The client's list only decides which story beat to show next. What gets
  // persisted is the single step the server itself just detected, so a forged
  // list can't plant evidence.
  const completed = Array.isArray(input.completedStepIds)
    ? input.completedStepIds.map(String).slice(0, 50)
    : []
  const step = sql.detectStep(level, query, result, completed)

  if (gate.userId) {
    if (step) await access.appendProgressKeys(gate.userId, SQL_ID, level, [step.id])
    await access.logAnswer(
      gate.userId, SQL_ID, level, step?.id ?? null, query,
      !result.error && result.rowCount > 0,
    )
    if (!result.error && result.rowCount > 0) {
      await access.unlockAchievement(gate.userId, 'first-query')
    }
  }

  return {
    ok: true,
    result,
    step: step
      ? {
          id: step.id,
          storyEvent: step.storyEvent,
          isKiller: !!step.isKillerStep,
          isMastermind: !!step.isMastermindStep,
        }
      : null,
  }
}

/**
 * Grade a killer/mastermind accusation server-side. The correct names live only
 * on the server. XP is awarded exactly once, atomically, when the case is fully
 * solved — and only for signed-in players.
 */
export async function submitVerdict(input: {
  level: number
  kind: 'killer' | 'mastermind'
  name: string
}): Promise<VerdictResult> {
  const level = clampLevel(input.level, sql.MYSTERY_COUNT)
  const gate = await access.checkAccess(SQL_ID, level)
  const locked: VerdictResult = {
    ok: false, reason: gate.reason, correct: false, levelComplete: false,
    xpAwarded: 0, persisted: false, nextLevel: null,
  }
  if (!gate.ok) return locked

  const kind = input.kind === 'mastermind' ? 'mastermind' : 'killer'
  const name = String(input.name ?? '').slice(0, 200)
  const refused = (blocked: 'evidence' | 'rate_limited'): VerdictResult => ({
    ok: true, correct: false, levelComplete: false, xpAwarded: 0, persisted: false, nextLevel: null, blocked,
  })

  if (!allow(await clientKey(gate.userId), 'verdict', 20, MINUTE)) return refused('rate_limited')

  // Signed-in players: no brute-forcing the suspect list, and no XP for a name you
  // never investigated (evidence = steps the server detected from your queries).
  const progress = gate.userId ? await access.getLevelProgress(gate.userId, SQL_ID, level) : null
  if (gate.userId && progress && !progress.completed) {
    const wrong = await access.recentWrongVerdicts(gate.userId, SQL_ID, level, WRONG_VERDICT_WINDOW)
    if (wrong >= MAX_WRONG_VERDICTS) return refused('rate_limited')
    const missing = sql.requiredEvidence(level, kind).filter(id => !progress.steps.includes(id))
    if (missing.length > 0) return refused('evidence')
  }

  const correct = sql.checkVerdict(level, kind, name)

  if (gate.userId) {
    await access.logAnswer(gate.userId, SQL_ID, level, `verdict-${kind}`, name, correct)
  }

  if (!correct) {
    return { ok: true, correct: false, levelComplete: false, xpAwarded: 0, persisted: false, nextLevel: null }
  }

  // Correct, but a killer accusation on a case that still needs its mastermind
  // does not finish the case (and grants nothing).
  if (!sql.isCaseCompletingVerdict(level, kind)) {
    return { ok: true, correct: true, levelComplete: false, xpAwarded: 0, persisted: false, nextLevel: null }
  }

  // Case fully solved.
  if (!gate.userId) {
    return { ok: true, correct: true, levelComplete: true, xpAwarded: 0, persisted: false, nextLevel: null }
  }

  const stepIds = sql.getMystery(level).progressSteps.map(s => s.id)
  const hintsUsed = progress?.hintsUsed ?? 0 // counted server-side by revealSqlHint
  const award = awardFor({ base: sql.levelXp(level), hintsUsed })
  const { xpAwarded } = await access.grantCompletion(gate.userId, SQL_ID, level, award.total, stepIds)
  await access.unlockAchievement(gate.userId, 'murder-solved')
  if (xpAwarded > 0 && hintsUsed === 0) await access.unlockAchievement(gate.userId, 'no-hints')
  revalidatePath('/', 'layout') // refresh the navbar clearance/XP pill
  const nextLevel = level < sql.MYSTERY_COUNT ? level + 1 : null
  return { ok: true, correct: true, levelComplete: true, xpAwarded, persisted: true, nextLevel }
}

/**
 * Grade a terminal command for a Linux level server-side. The winning command
 * and success output are known only on the server. XP is granted once, on level
 * completion, for signed-in players. Anonymous players may only clear the free
 * trial levels (see access.TRIAL_LEVEL).
 */
export async function runLinuxCommand(input: {
  level: number
  command: string
  room: string
}): Promise<LinuxRunResult> {
  const level = clampLevel(input.level, LINUX_COUNT)
  const gate = await access.checkAccess(LINUX_ID, level)
  const room = String(input.room ?? '').slice(0, 200) || (getLinuxLevel(level)?.room ?? '/prison/cell_42')
  if (!gate.ok) {
    return {
      ok: false, reason: gate.reason, correct: false, lines: [], storyEvent: null,
      newRoom: room, levelComplete: false, xpAwarded: 0, persisted: false,
      nextLevel: null, needAuthToContinue: false,
    }
  }

  if (!allow(await clientKey(gate.userId), 'linux', 60, MINUTE)) {
    return {
      ok: false, reason: 'rate_limited', correct: false, lines: [], storyEvent: null,
      newRoom: room, levelComplete: false, xpAwarded: 0, persisted: false,
      nextLevel: null, needAuthToContinue: false,
    }
  }

  const command = String(input.command ?? '').slice(0, 500)
  const { lines, levelComplete, newRoom, storyEvent } = processCommand(command, level, room)

  if (!levelComplete) {
    return {
      ok: true, correct: false, lines, storyEvent: null, newRoom,
      levelComplete: false, xpAwarded: 0, persisted: false, nextLevel: null, needAuthToContinue: false,
    }
  }

  const nextLevel = level < LINUX_COUNT ? level + 1 : null

  if (gate.userId) {
    await access.logAnswer(gate.userId, LINUX_ID, level, 'solved', command, true)
    const { hintsUsed } = await access.getLevelProgress(gate.userId, LINUX_ID, level)
    const award = awardFor({ base: linuxLevelXp(level), hintsUsed })
    const { xpAwarded } = await access.grantCompletion(gate.userId, LINUX_ID, level, award.total, ['solved'])
    if (level >= LINUX_COUNT) await access.unlockAchievement(gate.userId, 'prison-escape')
    if (xpAwarded > 0 && hintsUsed === 0) await access.unlockAchievement(gate.userId, 'no-hints')
    revalidatePath('/', 'layout') // refresh the navbar clearance/XP pill
    return {
      ok: true, correct: true, lines, storyEvent, newRoom,
      levelComplete: true, xpAwarded, persisted: true, nextLevel, needAuthToContinue: false,
    }
  }

  // Anonymous player cleared a trial level — no persistence. They may keep going
  // for free while still inside the trial; only gate once the next level is
  // beyond it.
  return {
    ok: true, correct: true, lines, storyEvent, newRoom,
    levelComplete: true, xpAwarded: 0, persisted: false, nextLevel,
    needAuthToContinue: nextLevel != null && nextLevel > access.TRIAL_LEVEL,
  }
}

/**
 * Reveal one SQL clue. Clue text never ships with the page; each reveal by a
 * signed-in player is recorded server-side and taxes that case's XP. The final
 * full-SQL hint of each group is never served.
 */
export async function revealSqlHint(input: { level: number; group: number; index: number }): Promise<HintResult> {
  const level = clampLevel(input.level, sql.MYSTERY_COUNT)
  const gate = await access.checkAccess(SQL_ID, level)
  if (!gate.ok) return { ok: false, reason: gate.reason }
  if (!allow(await clientKey(gate.userId), 'hint', 30, MINUTE)) return { ok: false, reason: 'rate_limited' }

  const group = Math.floor(Number(input.group))
  const index = Math.floor(Number(input.index))
  const text = sql.getHint(level, group, index)
  if (text == null) return { ok: false }

  if (gate.userId) await access.appendProgressKeys(gate.userId, SQL_ID, level, [`hint:${group}:${index}`])
  return { ok: true, text }
}

/** Record a voluntary Linux hint open (the XP skill tax). The hint text itself is level content. */
export async function revealLinuxHint(input: { level: number }): Promise<HintResult> {
  const level = clampLevel(input.level, LINUX_COUNT)
  const gate = await access.checkAccess(LINUX_ID, level)
  if (!gate.ok) return { ok: false, reason: gate.reason }
  if (!allow(await clientKey(gate.userId), 'hint', 30, MINUTE)) return { ok: false, reason: 'rate_limited' }
  if (gate.userId) await access.appendProgressKeys(gate.userId, LINUX_ID, level, ['hint:0'])
  return { ok: true, text: getLinuxLevel(level)?.hint ?? '' }
}

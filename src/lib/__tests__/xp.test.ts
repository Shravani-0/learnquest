import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── The game actions talk to the DB only through `access`; replace it with spies ──
const access = vi.hoisted(() => ({
  TRIAL_LEVEL: 2,
  checkAccess: vi.fn(),
  getLevelProgress: vi.fn(),
  grantCompletion: vi.fn(),
  appendProgressKeys: vi.fn(),
  logAnswer: vi.fn(),
  unlockAchievement: vi.fn(),
  recentWrongVerdicts: vi.fn(),
  canOpenLevel: vi.fn(),
}))
vi.mock('@/lib/server/quests/access', () => access)
vi.mock('@/lib/server/rate-limit', () => ({ allow: () => true, clientKey: async () => 'k' }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/server/quests/linux-prison-break', async orig => ({
  ...(await orig<typeof import('@/lib/server/quests/linux-prison-break')>()),
  processCommand: vi.fn(),
}))

import { awardFor, clearanceForXp, CLEARANCE } from '@/lib/xp'
import { runLinuxCommand, submitVerdict, revealLinuxHint } from '@/app/adventures/actions'
import { processCommand, linuxLevelXp, LINUX_COUNT } from '@/lib/server/quests/linux-prison-break'
import * as sql from '@/lib/server/quests/sql-murder-mystery'

// ═════════════════════════════════════════════════════════════════════════════
describe('awardFor — what one level pays', () => {
  it('pays the full base XP for a clean, hint-free solve', () => {
    expect(awardFor({ base: 200 })).toEqual({ total: 200, clean: true, fast: false, base: 200 })
  })

  it.each([
    [0, 200],
    [1, 150], // ×0.75
    [2, 110], // ×0.55
    [3, 80],  // ×0.40
  ])('applies the hint tax: %i hint(s) → %i XP', (hintsUsed, total) => {
    expect(awardFor({ base: 200, hintsUsed }).total).toBe(total)
  })

  it('caps the hint tax at three hints', () => {
    expect(awardFor({ base: 200, hintsUsed: 9 }).total).toBe(80)
  })

  it('treats negative or fractional hint counts safely', () => {
    expect(awardFor({ base: 200, hintsUsed: -4 }).total).toBe(200)
    expect(awardFor({ base: 200, hintsUsed: 0.4 }).total).toBe(200)
    expect(awardFor({ base: 200, hintsUsed: 1.6 }).total).toBe(110)
  })

  it('marks a solve clean only when no hints were used', () => {
    expect(awardFor({ base: 100 }).clean).toBe(true)
    expect(awardFor({ base: 100, hintsUsed: 1 }).clean).toBe(false)
  })

  it('adds a 15% speed bonus at or under par time', () => {
    expect(awardFor({ base: 200, elapsedMs: 60_000, parMs: 60_000 })).toMatchObject({ total: 230, fast: true })
    expect(awardFor({ base: 200, elapsedMs: 60_001, parMs: 60_000 })).toMatchObject({ total: 200, fast: false })
  })

  it('needs both elapsed and par time for the speed bonus', () => {
    expect(awardFor({ base: 200, elapsedMs: 1 }).fast).toBe(false)
    expect(awardFor({ base: 200, parMs: 1 }).fast).toBe(false)
  })

  it('always pays at least 40% of base for a real solve', () => {
    for (let h = 0; h <= 5; h++) expect(awardFor({ base: 75, hintsUsed: h }).total).toBeGreaterThanOrEqual(30)
  })

  it('returns whole-number XP', () => {
    expect(Number.isInteger(awardFor({ base: 33, hintsUsed: 1 }).total)).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('clearanceForXp — XP → rank', () => {
  it('starts every account at user with 750 XP to operator', () => {
    expect(clearanceForXp(0)).toMatchObject({
      current: { id: 'user' }, next: { id: 'operator' }, xpToNext: 750, percent: 0,
    })
  })

  it('promotes exactly at each threshold, not one XP before', () => {
    for (let i = 1; i < CLEARANCE.length; i++) {
      const { minXp, id } = CLEARANCE[i]
      expect(clearanceForXp(minXp - 1).current.id).toBe(CLEARANCE[i - 1].id)
      expect(clearanceForXp(minXp).current.id).toBe(id)
    }
  })

  it('reports progress between two ranks', () => {
    // operator 750 → sudo 2500: 1420 is 670 of 1750 in
    expect(clearanceForXp(1420)).toMatchObject({ current: { id: 'operator' }, xpToNext: 1080, percent: 38 })
  })

  it('tops out at root with nothing left to earn', () => {
    expect(clearanceForXp(30000)).toMatchObject({ current: { id: 'root' }, next: null, xpToNext: 0, percent: 100 })
    expect(clearanceForXp(1_000_000).current.id).toBe('root')
  })

  it('keeps thresholds strictly increasing', () => {
    for (let i = 1; i < CLEARANCE.length; i++) expect(CLEARANCE[i].minXp).toBeGreaterThan(CLEARANCE[i - 1].minXp)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('earning XP in Linux Prison Break', () => {
  const solved = { lines: [], levelComplete: true, newRoom: '/prison/yard', storyEvent: 'out' }

  beforeEach(() => {
    vi.clearAllMocks()
    access.checkAccess.mockResolvedValue({ ok: true, userId: 'u1' })
    access.getLevelProgress.mockResolvedValue({ steps: [], hintsUsed: 0, completed: false })
    access.grantCompletion.mockImplementation(async (_u, _a, _l, xp: number) => ({ xpAwarded: xp, alreadyDone: false }))
    vi.mocked(processCommand).mockReturnValue(solved)
    access.canOpenLevel.mockResolvedValue(true)
  })

  it('grants the level XP once the level is solved and reports it', async () => {
    const res = await runLinuxCommand({ level: 1, command: 'ls', room: '/prison/cell_42' })
    expect(access.grantCompletion).toHaveBeenCalledWith('u1', 'linux-prison-break', 1, linuxLevelXp(1), ['solved'])
    expect(res).toMatchObject({ levelComplete: true, xpAwarded: linuxLevelXp(1), persisted: true, nextLevel: 2 })
    expect(access.unlockAchievement).toHaveBeenCalledWith('u1', 'no-hints')
  })

  it('charges the hint tax using server-recorded hints, not anything the browser sends', async () => {
    access.getLevelProgress.mockResolvedValue({ steps: [], hintsUsed: 1, completed: false })
    await runLinuxCommand({ level: 3, command: 'x', room: '/r', hintsUsed: 0 } as never)
    const granted = access.grantCompletion.mock.calls[0][3]
    expect(granted).toBe(awardFor({ base: linuxLevelXp(3), hintsUsed: 1 }).total)
    expect(access.unlockAchievement).not.toHaveBeenCalledWith('u1', 'no-hints')
  })

  it('pays nothing on a replay (the RPC reports the level was already done)', async () => {
    access.grantCompletion.mockResolvedValue({ xpAwarded: 0, alreadyDone: true })
    const res = await runLinuxCommand({ level: 1, command: 'ls', room: '/r' })
    expect(res.xpAwarded).toBe(0)
    expect(access.unlockAchievement).not.toHaveBeenCalledWith('u1', 'no-hints')
  })

  it('grants nothing for a command that does not solve the level', async () => {
    vi.mocked(processCommand).mockReturnValue({ ...solved, levelComplete: false })
    const res = await runLinuxCommand({ level: 1, command: 'pwd', room: '/r' })
    expect(access.grantCompletion).not.toHaveBeenCalled()
    expect(res).toMatchObject({ levelComplete: false, xpAwarded: 0 })
  })

  it('grants nothing to an anonymous trial player and asks them to sign in past the trial', async () => {
    access.checkAccess.mockResolvedValue({ ok: true, userId: null })
    const res = await runLinuxCommand({ level: 2, command: 'ls', room: '/r' })
    expect(access.grantCompletion).not.toHaveBeenCalled()
    expect(res).toMatchObject({ xpAwarded: 0, persisted: false, needAuthToContinue: true })
  })

  it('refuses a locked level without grading it', async () => {
    access.checkAccess.mockResolvedValue({ ok: false, reason: 'locked', userId: 'u1' })
    const res = await runLinuxCommand({ level: 5, command: 'ls', room: '/r' })
    expect(processCommand).not.toHaveBeenCalled()
    expect(res).toMatchObject({ ok: false, reason: 'locked', xpAwarded: 0 })
  })

  it('clamps an out-of-range level number before granting', async () => {
    await runLinuxCommand({ level: 999, command: 'ls', room: '/r' })
    expect(access.checkAccess).toHaveBeenCalledWith('linux-prison-break', LINUX_COUNT)
  })

  it('still grants XP but asks the player to unlock the next level when they do not own it', async () => {
    access.canOpenLevel.mockResolvedValue(false)
    const res = await runLinuxCommand({ level: 2, command: 'ls', room: '/r' })
    expect(access.canOpenLevel).toHaveBeenCalledWith('u1', 'linux-prison-break', 3)
    expect(res).toMatchObject({ xpAwarded: linuxLevelXp(2), nextLevel: 3, needPurchaseToContinue: true, needAuthToContinue: false })
  })

  it('does not ask for a purchase when the next level is already owned', async () => {
    const res = await runLinuxCommand({ level: 3, command: 'ls', room: '/r' })
    expect(res.needPurchaseToContinue).toBe(false)
  })

  it('records a revealed hint as a server-side progress key', async () => {
    await revealLinuxHint({ level: 4 })
    expect(access.appendProgressKeys).toHaveBeenCalledWith('u1', 'linux-prison-break', 4, ['hint:0'])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('earning XP in SQL Murder Mystery', () => {
  // Use a real case whose killer verdict finishes it, and its real answer.
  const level = Array.from({ length: sql.MYSTERY_COUNT }, (_, i) => i + 1)
    .find(l => sql.isCaseCompletingVerdict(l, 'killer'))!
  const killer = sql.getMystery(level).killerName
  const evidence = sql.requiredEvidence(level, 'killer')

  beforeEach(() => {
    vi.clearAllMocks()
    access.checkAccess.mockResolvedValue({ ok: true, userId: 'u1' })
    access.recentWrongVerdicts.mockResolvedValue(0)
    access.grantCompletion.mockImplementation(async (_u, _a, _l, xp: number) => ({ xpAwarded: xp, alreadyDone: false }))
  })

  it('pays the case XP for the right killer once the evidence was found', async () => {
    access.getLevelProgress.mockResolvedValue({ steps: evidence, hintsUsed: 0, completed: false })
    const res = await submitVerdict({ level, kind: 'killer', name: `  ${killer.toUpperCase()} ` })
    expect(access.grantCompletion).toHaveBeenCalledWith(
      'u1', 'sql-murder-mystery', level, sql.levelXp(level), expect.any(Array),
    )
    expect(res).toMatchObject({ correct: true, levelComplete: true, xpAwarded: sql.levelXp(level) })
  })

  it('refuses XP for the right name when the player never investigated', async () => {
    access.getLevelProgress.mockResolvedValue({ steps: [], hintsUsed: 0, completed: false })
    const res = await submitVerdict({ level, kind: 'killer', name: killer })
    expect(res).toMatchObject({ correct: false, xpAwarded: 0, blocked: 'evidence' })
    expect(access.grantCompletion).not.toHaveBeenCalled()
  })

  it('pays nothing for a wrong accusation', async () => {
    access.getLevelProgress.mockResolvedValue({ steps: evidence, hintsUsed: 0, completed: false })
    const res = await submitVerdict({ level, kind: 'killer', name: 'Definitely Not The Killer' })
    expect(res).toMatchObject({ correct: false, xpAwarded: 0 })
    expect(access.grantCompletion).not.toHaveBeenCalled()
  })

  it('pauses guessing after too many wrong accusations', async () => {
    access.getLevelProgress.mockResolvedValue({ steps: evidence, hintsUsed: 0, completed: false })
    access.recentWrongVerdicts.mockResolvedValue(5)
    const res = await submitVerdict({ level, kind: 'killer', name: killer })
    expect(res).toMatchObject({ blocked: 'rate_limited', xpAwarded: 0 })
  })

  it('solves but pays nothing for an anonymous player', async () => {
    access.checkAccess.mockResolvedValue({ ok: true, userId: null })
    const res = await submitVerdict({ level, kind: 'killer', name: killer })
    expect(res).toMatchObject({ correct: true, levelComplete: true, xpAwarded: 0, persisted: false })
    expect(access.grantCompletion).not.toHaveBeenCalled()
  })
})

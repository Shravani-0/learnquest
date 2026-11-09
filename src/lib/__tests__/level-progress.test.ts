import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fakeSupabase } from './helpers/fake-supabase'

// ── Real access.ts against a fake service-role client ───────────────────────
const state = vi.hoisted(() => ({
  admin: null as unknown as ReturnType<typeof import('./helpers/fake-supabase').fakeSupabase>,
  user: null as { id: string } | null,
}))
vi.mock('@/lib/supabase/admin', () => ({
  serviceConfigured: true,
  createAdminClient: () => state.admin.client,
}))
vi.mock('@/lib/db/queries', () => ({ getUser: async () => state.user }))

import * as access from '@/lib/server/quests/access'
import { summarizeProgress } from '@/lib/progress'

beforeEach(() => {
  state.admin = fakeSupabase()
  state.user = { id: 'u1' }
})

// ═════════════════════════════════════════════════════════════════════════════
describe('reading a level’s progress', () => {
  it('splits stored keys into investigation steps and hint reveals', async () => {
    state.admin = fakeSupabase({
      tables: {
        user_quest_progress: {
          data: { steps_completed: ['crime-report', 'hint:0', 'witness', 'hint:2'], status: 'in_progress' },
        },
      },
    })
    expect(await access.getLevelProgress('u1', 'sql-murder-mystery', 1)).toEqual({
      steps: ['crime-report', 'witness'],
      hintsUsed: 2,
      completed: false,
    })
  })

  it('reports a completed level', async () => {
    state.admin = fakeSupabase({ tables: { user_quest_progress: { data: { steps_completed: ['solved'], status: 'completed' } } } })
    expect((await access.getLevelProgress('u1', 'linux-prison-break', 4)).completed).toBe(true)
  })

  it('returns empty progress for a level never started', async () => {
    expect(await access.getLevelProgress('u1', 'linux-prison-break', 4)).toEqual({ steps: [], hintsUsed: 0, completed: false })
  })

  it('looks the row up by user, world and level', async () => {
    await access.getLevelProgress('u1', 'linux-prison-break', 4)
    const eqs = state.admin.calls.filter(c => c.method === 'eq').map(c => c.args)
    expect(eqs).toEqual([['user_id', 'u1'], ['adventure_id', 'linux-prison-break'], ['level_number', 4]])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('recording progress during a level', () => {
  it('appends new keys atomically through the append_progress_keys RPC', async () => {
    await access.appendProgressKeys('u1', 'sql-murder-mystery', 2, ['witness'])
    expect(state.admin.client.rpc).toHaveBeenCalledWith('append_progress_keys', {
      p_user: 'u1', p_adventure: 'sql-murder-mystery', p_level: 2, p_keys: ['witness'],
    })
    expect(state.admin.client.rpc).toHaveBeenCalledTimes(1)
  })

  it('does nothing when there is nothing to record', async () => {
    await access.appendProgressKeys('u1', 'sql-murder-mystery', 2, [])
    expect(state.admin.client.rpc).not.toHaveBeenCalled()
  })

  it('falls back to a merged write (keeping earlier keys) if the RPC is unavailable', async () => {
    state.admin = fakeSupabase({
      rpc: { append_progress_keys: { error: { message: 'function does not exist' } } },
      tables: { user_quest_progress: { data: { steps_completed: ['crime-report', 'hint:0'], status: 'in_progress' } } },
    })
    await access.appendProgressKeys('u1', 'sql-murder-mystery', 2, ['witness', 'crime-report'])
    expect(state.admin.client.rpc).toHaveBeenLastCalledWith('record_step_progress', {
      p_user: 'u1', p_adventure: 'sql-murder-mystery', p_level: 2,
      p_steps: ['crime-report', 'hint:0', 'witness'],
    })
  })

  it('never rewrites a level that is already completed', async () => {
    state.admin = fakeSupabase({
      rpc: { append_progress_keys: { error: { message: 'missing' } } },
      tables: { user_quest_progress: { data: { steps_completed: ['solved'], status: 'completed' } } },
    })
    await access.appendProgressKeys('u1', 'linux-prison-break', 1, ['hint:0'])
    expect(state.admin.client.rpc).not.toHaveBeenCalledWith('record_step_progress', expect.anything())
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('completing a level', () => {
  it('calls complete_level with the XP and steps, and returns what was awarded', async () => {
    state.admin = fakeSupabase({ rpc: { complete_level: { data: [{ xp_awarded: 150, already_completed: false }] } } })
    const res = await access.grantCompletion('u1', 'linux-prison-break', 3, 150, ['solved'])
    expect(state.admin.client.rpc).toHaveBeenCalledWith('complete_level', {
      p_user: 'u1', p_adventure: 'linux-prison-break', p_level: 3, p_xp: 150, p_steps: ['solved'],
    })
    expect(res).toEqual({ xpAwarded: 150, alreadyDone: false })
  })

  it('reports a replay as already done with no XP', async () => {
    state.admin = fakeSupabase({ rpc: { complete_level: { data: [{ xp_awarded: 0, already_completed: true }] } } })
    expect(await access.grantCompletion('u1', 'linux-prison-break', 3, 150, ['solved'])).toEqual({ xpAwarded: 0, alreadyDone: true })
  })

  it('awards nothing if the database call fails', async () => {
    state.admin = fakeSupabase({ rpc: { complete_level: { error: { message: 'boom' } } } })
    expect(await access.grantCompletion('u1', 'linux-prison-break', 3, 150, [])).toEqual({ xpAwarded: 0, alreadyDone: false })
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('which levels a player can open', () => {
  type Ent = { kind: string; adventure_id?: string | null; level_number?: number | null; plan?: string | null; expires_at?: string | null }
  const world = (opts: { done?: number[]; owns?: Ent[] } = {}) => {
    state.admin = fakeSupabase({
      tables: {
        user_quest_progress: { data: (opts.done ?? []).map(n => ({ level_number: n, status: 'completed' })) },
        entitlements: {
          data: (opts.owns ?? []).map(e => ({
            adventure_id: null, level_number: null, plan: null, expires_at: null, status: 'active', ...e,
          })),
        },
      },
    })
  }

  it('lets anyone play the free trial levels', async () => {
    state.user = null
    expect(await access.checkAccess('linux-prison-break', access.TRIAL_LEVEL)).toEqual({ ok: true, userId: null })
  })

  it('asks anonymous players to sign in past the trial', async () => {
    state.user = null
    expect(await access.checkAccess('linux-prison-break', access.TRIAL_LEVEL + 1)).toMatchObject({ ok: false, reason: 'auth_required' })
  })

  it('asks signed-in players to pay past the trial, even with earlier levels cleared', async () => {
    world({ done: [1, 2, 3] })
    expect(await access.checkAccess('linux-prison-break', 4)).toMatchObject({ ok: false, reason: 'payment_required', userId: 'u1' })
  })

  it('opens a bought level straight away, without clearing the ones before it', async () => {
    world({ owns: [{ kind: 'level', adventure_id: 'linux-prison-break', level_number: 7 }] })
    expect(await access.checkAccess('linux-prison-break', 7)).toEqual({ ok: true, userId: 'u1' })
    expect(await access.checkAccess('linux-prison-break', 6)).toMatchObject({ reason: 'payment_required' })
  })

  it('opens every level of a bought world, and nothing in other worlds', async () => {
    world({ owns: [{ kind: 'world', adventure_id: 'linux-prison-break' }] })
    expect(await access.checkAccess('linux-prison-break', 10)).toMatchObject({ ok: true })
    expect(await access.checkAccess('sql-murder-mystery', 3)).toMatchObject({ reason: 'payment_required' })
  })

  it('opens every world with Pro', async () => {
    world({ owns: [{ kind: 'plan', plan: 'pro', expires_at: new Date(Date.now() + 86_400_000).toISOString() }] })
    expect(await access.checkAccess('linux-prison-break', 10)).toMatchObject({ ok: true })
    expect(await access.checkAccess('sql-murder-mystery', 3)).toMatchObject({ ok: true })
  })

  it('closes paid levels again once a plan has run out', async () => {
    world({ owns: [{ kind: 'plan', plan: 'pro', expires_at: new Date(Date.now() - 1000).toISOString() }] })
    expect(await access.checkAccess('linux-prison-break', 5)).toMatchObject({ reason: 'payment_required' })
  })

  it('refuses worlds that are still in build', async () => {
    expect(await access.checkAccess('git-time-traveler', 1)).toMatchObject({ ok: false, reason: 'coming_soon' })
  })

  it('lists the open levels: the trial plus whatever is owned', async () => {
    world({ owns: [{ kind: 'level', adventure_id: 'linux-prison-break', level_number: 5 }] })
    expect(await access.accessibleLevels('u1', 'linux-prison-break', 10)).toEqual([1, 2, 5])
    expect(await access.accessibleLevels(null, 'linux-prison-break', 10)).toEqual([1, 2])
  })

  it('resumes at the first open level not yet cleared', async () => {
    world({ done: [1], owns: [{ kind: 'world', adventure_id: 'linux-prison-break' }] })
    expect(await access.resumeLevel('u1', 'linux-prison-break', 10)).toBe(2)
    world({ done: [1, 2] })
    expect(await access.resumeLevel('u1', 'linux-prison-break', 10)).toBe(2) // nothing else open: replay the last
    expect(await access.resumeLevel(null, 'linux-prison-break', 10)).toBe(1)
  })

  it('sends a play page to the right place for a requested level', async () => {
    world()
    expect(await access.resolvePlayLevel('u1', 'linux-prison-break', 10, '2')).toEqual({ level: 2 })
    expect(await access.resolvePlayLevel('u1', 'linux-prison-break', 10, '4')).toEqual({
      redirect: '/adventures/linux-prison-break?unlock=4#unlock',
    })
    expect(await access.resolvePlayLevel(null, 'linux-prison-break', 10, '4')).toEqual({
      redirect: `/login?next=${encodeURIComponent('/adventures/linux-prison-break/play?level=4')}`,
    })
    expect(await access.resolvePlayLevel('u1', 'linux-prison-break', 10, '99')).toEqual({
      redirect: '/adventures/linux-prison-break?unlock=10#unlock',
    })
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('dashboard progress summary', () => {
  const counts = { 'sql-murder-mystery': 3, 'linux-prison-break': 10 }
  const row = (adventure_id: string, level_number: number, status: string, xp_earned = 0) =>
    ({ adventure_id, level_number, status, xp_earned })

  it('counts cleared levels and XP per world', () => {
    const { byWorld, levelsCleared, xpEarned } = summarizeProgress(
      [
        row('linux-prison-break', 1, 'completed', 100),
        row('linux-prison-break', 2, 'completed', 120),
        row('linux-prison-break', 3, 'in_progress'),
        row('sql-murder-mystery', 1, 'completed', 300),
      ],
      counts,
    )
    expect(byWorld.get('linux-prison-break')).toEqual({ levelsCleared: 2, xpEarned: 220, status: 'in_progress' })
    expect(byWorld.get('sql-murder-mystery')).toEqual({ levelsCleared: 1, xpEarned: 300, status: 'in_progress' })
    expect(levelsCleared).toBe(3)
    expect(xpEarned).toBe(520)
  })

  it('marks a world cleared only when every level is done', () => {
    const rows = [1, 2, 3].map(n => row('sql-murder-mystery', n, 'completed', 100))
    expect(summarizeProgress(rows, counts).byWorld.get('sql-murder-mystery')?.status).toBe('completed')
    expect(summarizeProgress(rows.slice(0, 2), counts).byWorld.get('sql-murder-mystery')?.status).toBe('in_progress')
  })

  it('shows a world with only started levels as in progress', () => {
    const { byWorld, levelsCleared } = summarizeProgress([row('linux-prison-break', 1, 'in_progress')], counts)
    expect(byWorld.get('linux-prison-break')?.status).toBe('in_progress')
    expect(levelsCleared).toBe(0)
  })

  it('leaves untouched worlds out (shown as not started)', () => {
    expect(summarizeProgress([], counts).byWorld.size).toBe(0)
  })
})

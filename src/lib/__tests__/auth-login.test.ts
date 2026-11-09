import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { fakeSupabase, RedirectSignal } from './helpers/fake-supabase'

// ── Module mocks: Supabase clients + Next's request-scoped helpers ─────────────
const state = vi.hoisted(() => ({
  configured: true,
  serviceConfigured: true,
  db: null as unknown as ReturnType<typeof import('./helpers/fake-supabase').fakeSupabase>,
  admin: null as unknown as ReturnType<typeof import('./helpers/fake-supabase').fakeSupabase>,
}))

vi.mock('@/lib/supabase/env', () => ({
  get supabaseConfigured() { return state.configured },
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.db.client }))
vi.mock('@/lib/supabase/admin', () => ({
  get serviceConfigured() { return state.serviceConfigured },
  createAdminClient: () => state.admin.client,
}))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => state.db.client }))
vi.mock('next/navigation', async () => {
  const { RedirectSignal } = await import('./helpers/fake-supabase')
  return { redirect: (url: string) => { throw new RedirectSignal(url) } }
})
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

import { signIn, signUp, chooseUsername } from '@/app/auth/actions'
import { updateSession } from '@/lib/supabase/middleware'
import { safeNext } from '@/lib/safe-next'
import { usernameError } from '@/lib/username'

function form(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

/** Run a server action that may redirect; returns either its state or the redirect target. */
async function run<T>(p: Promise<T>): Promise<{ state?: T; redirect?: string }> {
  try {
    return { state: await p }
  } catch (e) {
    if (e instanceof RedirectSignal) return { redirect: e.url }
    throw e
  }
}

beforeEach(() => {
  state.configured = true
  state.serviceConfigured = true
  state.db = fakeSupabase()
  state.admin = fakeSupabase()
})

// ═════════════════════════════════════════════════════════════════════════════
describe('user login (signIn)', () => {
  it('signs in with the submitted credentials and redirects to the dashboard', async () => {
    const res = await run(signIn({}, form({ email: 'ada@example.com', password: 'hunter22!' })))
    expect(state.db.client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'hunter22!',
    })
    expect(res.redirect).toBe('/dashboard')
  })

  it('honours a same-site ?next= target after login', async () => {
    const res = await run(signIn({}, form({ email: 'a@b.co', password: 'x', next: '/adventures/sql-murder-mystery/play' })))
    expect(res.redirect).toBe('/adventures/sql-murder-mystery/play')
  })

  it.each(['https://evil.com', '//evil.com', '/\\evil.com', '@evil.com'])(
    'ignores an off-site next target (%s) and falls back to /dashboard',
    async next => {
      const res = await run(signIn({}, form({ email: 'a@b.co', password: 'x', next })))
      expect(res.redirect).toBe('/dashboard')
    },
  )

  it('returns the Supabase error and does not redirect on bad credentials', async () => {
    state.db.client.auth.signInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } })
    const res = await run(signIn({}, form({ email: 'a@b.co', password: 'wrong' })))
    expect(res.redirect).toBeUndefined()
    expect(res.state).toEqual({ error: 'Invalid login credentials' })
  })

  it('reports a configuration error instead of calling Supabase when it is not set up', async () => {
    state.configured = false
    const res = await run(signIn({}, form({ email: 'a@b.co', password: 'x' })))
    expect(res.state?.error).toMatch(/not configured/i)
    expect(state.db.client.auth.signInWithPassword).not.toHaveBeenCalled()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('sign-up requires a valid username', () => {
  const base = { email: 'new@example.com', password: 'longenough1' }

  it.each([
    ['', /at least 2/],
    ['   ', /at least 2/],
    ['a', /at least 2/],
    ['x'.repeat(25), /at most 24/],
    ['bad name', /letters, numbers and underscores/],
    ['emoji🙂', /letters, numbers and underscores/],
  ])('rejects username %j before contacting Supabase', async (username, msg) => {
    const res = await run(signUp({}, form({ ...base, username })))
    expect(res.state?.error).toMatch(msg)
    expect(state.db.client.auth.signUp).not.toHaveBeenCalled()
  })

  it('rejects a short password', async () => {
    const res = await run(signUp({}, form({ ...base, username: 'sherlock', password: 'short' })))
    expect(res.state?.error).toMatch(/at least 8/)
  })

  it('creates the account with the username in metadata and a username_set profile', async () => {
    state.db.client.auth.signUp.mockResolvedValueOnce({
      data: { user: { id: 'f4f0f40a-0000-4000-8000-000000000000' }, session: null },
      error: null,
    })
    const res = await run(signUp({}, form({ ...base, username: '  sherlock  ' })))

    const call = state.db.client.auth.signUp.mock.calls[0][0] as { options: { data: Record<string, string> } }
    expect(call.options.data).toEqual({ username: 'sherlock', display_name: 'sherlock' })

    const upsert = state.admin.calls.find(c => c.table === 'profiles' && c.method === 'upsert')
    expect(upsert?.args[0]).toMatchObject({
      username: 'sherlock_f4f0',
      display_name: 'sherlock',
      avatar: 'SH',
      username_set: true,
    })
    // Email confirmation on → a message, no redirect, and it names the address.
    expect(res.state?.message).toContain('new@example.com')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('choosing a username on /welcome', () => {
  it('sends signed-out visitors to login', async () => {
    const res = await run(chooseUsername({}, form({ username: 'sherlock' })))
    expect(res.redirect).toBe('/login?next=/welcome')
  })

  it('saves the username and continues to next', async () => {
    state.db.client.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'abcd1234-x' } } })
    const res = await run(chooseUsername({}, form({ username: 'watson', next: '/dashboard' })))
    const upsert = state.admin.calls.find(c => c.method === 'upsert')
    expect(upsert?.args[0]).toMatchObject({ id: 'abcd1234-x', username: 'watson_abcd', display_name: 'watson', username_set: true })
    expect(res.redirect).toBe('/dashboard')
  })

  it('explains when the username is taken', async () => {
    state.db.client.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'abcd1234-x' } } })
    state.admin = fakeSupabase({ tables: { profiles: { error: { code: '23505' } } } })
    const res = await run(chooseUsername({}, form({ username: 'watson' })))
    expect(res.state?.error).toMatch(/taken/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('auth middleware', () => {
  const req = (path: string) => new NextRequest(new URL(path, 'http://localhost:3000'))
  const signedIn = (usernameSet: boolean | null) => {
    state.db = fakeSupabase({
      tables: { profiles: { data: usernameSet == null ? null : { username_set: usernameSet } } },
    })
    state.db.client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  }
  const location = (res: Response) => {
    const loc = res.headers.get('location')
    return loc ? new URL(loc).pathname + new URL(loc).search : null
  }

  it('sends anonymous visitors from /dashboard to login with a return path', async () => {
    const res = await updateSession(req('/dashboard'))
    expect(location(res)).toBe('/login?next=%2Fdashboard')
  })

  it('lets anonymous visitors load the homepage', async () => {
    expect(location(await updateSession(req('/')))).toBeNull()
  })

  it('moves a signed-in player off /login to their next page', async () => {
    signedIn(true)
    expect(location(await updateSession(req('/login?next=/adventures')))).toBe('/adventures')
  })

  it.each(['/dashboard', '/adventures/linux-prison-break/play', '/challenges/abc123'])(
    'sends a signed-in player without a username from %s to /welcome',
    async path => {
      signedIn(false)
      const res = await updateSession(req(path))
      expect(location(res)).toBe(`/welcome?next=${encodeURIComponent(path)}`)
    },
  )

  it.each(['/', '/adventures', '/adventures/sql-murder-mystery'])(
    'still loads public page %s for a player without a username',
    async path => {
      signedIn(false)
      expect(location(await updateSession(req(path)))).toBeNull()
    },
  )

  it('lets a player with a username into the dashboard', async () => {
    signedIn(true)
    expect(location(await updateSession(req('/dashboard')))).toBeNull()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('login helpers', () => {
  it('safeNext keeps same-site paths and rejects everything else', () => {
    expect(safeNext('/dashboard?tab=1')).toBe('/dashboard?tab=1')
    expect(safeNext(undefined)).toBe('/dashboard')
    expect(safeNext('javascript:alert(1)')).toBe('/dashboard')
    expect(safeNext('/ok\u0000bad')).toBe('/dashboard')
  })

  it('usernameError accepts the documented alphabet and length', () => {
    expect(usernameError('ab')).toBeNull()
    expect(usernameError('Detective_42')).toBeNull()
    expect(usernameError('x'.repeat(24))).toBeNull()
  })
})

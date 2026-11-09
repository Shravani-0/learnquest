import { vi } from 'vitest'

/**
 * A minimal stand-in for a supabase-js client: every query-builder call chains,
 * and the terminal calls (`maybeSingle`, `single`, awaiting the builder) resolve
 * to whatever the test queued for that table. `rpc` resolves per function name.
 * Every call is recorded so tests can assert on what was written.
 */
/** `data` answers single-row reads (maybeSingle/single); `rows`, if given, answers list reads (awaiting the builder). */
export type FakeResult = { data?: unknown; rows?: unknown[]; error?: unknown; count?: number | null }

export function fakeSupabase(opts: {
  tables?: Record<string, FakeResult>
  rpc?: Record<string, FakeResult>
} = {}) {
  const calls: { table: string; method: string; args: unknown[] }[] = []

  function builder(table: string) {
    const result = () => opts.tables?.[table] ?? { data: null, error: null }
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'like', 'gte', 'order', 'limit', 'or', 'in', 'insert', 'upsert', 'update', 'delete']) {
      b[m] = (...args: unknown[]) => {
        calls.push({ table, method: m, args })
        return b
      }
    }
    b.maybeSingle = async () => result()
    b.single = async () => result()
    b.then = (resolve: (v: FakeResult) => unknown, reject?: (e: unknown) => unknown) => {
      const r = result()
      return Promise.resolve(r.rows !== undefined ? { ...r, data: r.rows } : r).then(resolve, reject)
    }
    return b
  }

  const client = {
    from: vi.fn((table: string) => builder(table)),
    rpc: vi.fn(async (fn: string, _args?: unknown) => opts.rpc?.[fn] ?? { data: null, error: null }),
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null as { id: string } | null } })),
      signInWithPassword: vi.fn(async (_c: { email: string; password: string }) => ({ error: null as null | { message: string } })),
      signUp: vi.fn(async (_c: unknown) => ({
        data: { user: null as { id: string } | null, session: null as unknown },
        error: null as null | { message: string },
      })),
      signOut: vi.fn(async () => ({ error: null })),
    },
  }
  return { client, calls }
}

/** next/navigation's redirect() throws to stop rendering; mirror that so tests can catch it. */
export class RedirectSignal extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT ${url}`)
  }
}

import 'server-only'

import { headers } from 'next/headers'

/**
 * Fixed-window, in-memory rate limiter for the game server actions. It stops
 * scripted spam (query/command flooding, answer-log bloat) from one client.
 * Per server instance only: on a multi-instance deploy put a shared limiter
 * (e.g. Upstash/Redis or the platform's WAF) in front for a hard global cap.
 */
const buckets = new Map<string, { count: number; resetAt: number }>()

export async function clientKey(userId: string | null): Promise<string> {
  if (userId) return `u:${userId}`
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'anon'
  return `ip:${ip}`
}

/** true = allowed. `limit` calls per `windowMs` per key+scope. */
export function allow(key: string, scope: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const k = `${scope}:${key}`
  const b = buckets.get(k)
  if (!b || b.resetAt <= now) {
    buckets.set(k, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 10_000) {
      for (const [id, v] of buckets) if (v.resetAt <= now) buckets.delete(id)
    }
    return true
  }
  b.count++
  return b.count <= limit
}

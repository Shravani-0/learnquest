'use server'

import { revalidatePath } from 'next/cache'
import { getUser } from '@/lib/db/queries'
import { serviceConfigured } from '@/lib/supabase/admin'
import { allow, clientKey } from '@/lib/server/rate-limit'
import { isChallengeSkill, type ChallengeSkill } from '@/lib/challenges/rules'
import * as duel from '@/lib/server/challenges/service'
import type { QueryResult } from '@/lib/types'

const MINUTE = 60_000

type Fail = { ok: false; error: string; needLogin?: boolean }

const RUN_ERRORS: Record<duel.RunError, string> = {
  not_found: 'This challenge doesn’t exist.',
  not_player: 'This challenge is between two other players.',
  not_active: 'This challenge isn’t live.',
  over: 'Your run is over.',
  not_started: 'Start your run first.',
}

const ACCEPT_ERRORS: Record<duel.AcceptError, string> = {
  not_found: 'This challenge doesn’t exist.',
  own_challenge: 'You can’t accept your own challenge. Send the link to a friend.',
  taken: 'Someone already accepted this challenge.',
  expired: 'This invite has expired. Ask your friend for a new one.',
  no_puzzle: 'No puzzle is available to both of you for this skill yet.',
}

async function signedIn() {
  if (!serviceConfigured) return null
  return getUser()
}

export async function createChallenge(skill: ChallengeSkill): Promise<{ ok: true; code: string } | Fail> {
  const user = await signedIn()
  if (!user) return { ok: false, error: 'Sign in to challenge a friend.', needLogin: true }
  if (!isChallengeSkill(skill)) return { ok: false, error: 'Pick a skill.' }
  if (!allow(await clientKey(user.id), 'duel-create', 10, 10 * MINUTE)) {
    return { ok: false, error: 'That’s a lot of challenges. Try again in a few minutes.' }
  }
  try {
    const code = await duel.createChallenge(user.id, skill)
    revalidatePath('/challenges')
    return { ok: true, code }
  } catch {
    return { ok: false, error: 'Couldn’t create the challenge. Try again.' }
  }
}

export async function acceptChallenge(code: string): Promise<{ ok: true } | Fail> {
  const user = await signedIn()
  if (!user) return { ok: false, error: 'Sign in to accept.', needLogin: true }
  const res = await duel.acceptChallenge(String(code), user.id)
  if (!res.ok) return { ok: false, error: ACCEPT_ERRORS[res.error] }
  revalidatePath(`/challenges/${code}`)
  return { ok: true }
}

export async function startChallengeRun(code: string) {
  const user = await signedIn()
  if (!user) return { ok: false as const, error: 'Sign in first.', needLogin: true }
  const res = await duel.startRun(String(code), user.id)
  if (!res.ok) return { ok: false as const, error: RUN_ERRORS[res.error] }
  return res
}

export type MoveResult =
  | { ok: true; kind: 'sql'; result: QueryResult; solved: boolean; moves: number }
  | { ok: true; kind: 'linux'; lines: { type: 'output' | 'error'; content: string }[]; solved: boolean; moves: number }
  | Fail

/** One query (SQL) or command (Linux) inside a live run. Graded on the server. */
export async function submitChallengeMove(code: string, input: string): Promise<MoveResult> {
  const user = await signedIn()
  if (!user) return { ok: false, error: 'Sign in first.', needLogin: true }
  if (!allow(await clientKey(user.id), 'duel-move', 60, MINUTE)) return { ok: false, error: 'Slow down a moment.' }
  const res = await duel.submitMove(String(code), user.id, String(input ?? ''))
  if (!res.ok) return { ok: false, error: RUN_ERRORS[res.error] }
  return res
}

export async function giveUpChallenge(code: string): Promise<{ ok: boolean }> {
  const user = await signedIn()
  if (!user) return { ok: false }
  const ok = await duel.giveUp(String(code), user.id)
  revalidatePath(`/challenges/${code}`)
  return { ok }
}

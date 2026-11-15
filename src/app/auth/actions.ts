'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/env'
import { createAdminClient, serviceConfigured } from '@/lib/supabase/admin'
import { safeNext } from '@/lib/safe-next'
import { usernameError } from '@/lib/username'

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

/**
 * Base URL for links we email out. Prefer the origin the player is actually on
 * (so a deploy never mails out a localhost link), falling back to SITE_URL.
 * Supabase only honours it if it's in Auth → URL Configuration → Redirect URLs.
 */
async function requestOrigin() {
  return (await headers()).get('origin') ?? siteUrl()
}

const ALREADY_REGISTERED = 'You already have an account with this email. Sign in instead.'

/**
 * Shown to players when auth can't run because the deployment is missing its
 * Supabase env vars. The setup detail goes to the server log, never the page.
 * (Production builds refuse to run without them — see next.config.ts.)
 */
const NOT_CONFIGURED = 'Accounts are unavailable right now. Please try again in a little while.'

function unavailable(): AuthState {
  console.error(
    '[auth] Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and ' +
      'SUPABASE_SERVICE_ROLE_KEY in the hosting environment, then rebuild.',
  )
  return { error: NOT_CONFIGURED }
}

/**
 * Guarantee a profiles row exists for a new user so their XP/progress/answers
 * have somewhere to attach (user_quest_progress.user_id → profiles.id). The DB
 * trigger normally creates this on sign-up; this is an idempotent fallback that
 * mirrors the trigger's username scheme, so it's a no-op if the trigger ran.
 */
async function ensureProfile(userId: string, username: string) {
  if (!serviceConfigured) return
  const admin = createAdminClient()
  await admin.from('profiles').upsert(
    {
      id: userId,
      username: `${username}_${userId.slice(0, 4)}`,
      display_name: username,
      avatar: username.slice(0, 2).toUpperCase(),
      username_set: true,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  )
}

export type AuthState = {
  error?: string
  message?: string
  alreadyRegistered?: boolean
  /** Signed in with the right password but never clicked the verification link. */
  unconfirmed?: boolean
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured) return unavailable()
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const next = safeNext(formData.get('next'))

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.code === 'email_not_confirmed')
      return { error: 'Your email isn’t verified yet. Send yourself a fresh link below.', unconfirmed: true }
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured) return unavailable()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const username = String(formData.get('username') ?? '').trim()
  const next = safeNext(formData.get('next'))
  const badUsername = usernameError(username)
  if (badUsername) return { error: badUsername }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await requestOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { username, display_name: username },
    },
  })
  if (error) {
    // Email confirmation disabled → Supabase rejects a duplicate outright.
    if (error.code === 'user_already_exists' || /already registered/i.test(error.message))
      return { error: ALREADY_REGISTERED, alreadyRegistered: true }
    return { error: error.message }
  }

  // Email confirmation enabled → Supabase hides duplicates by returning a
  // placeholder user with no identities (and sends no email). Its id is fake,
  // so stop here before creating a profile for it.
  if (data.user && data.user.identities?.length === 0)
    return { error: ALREADY_REGISTERED, alreadyRegistered: true }

  // Persist their profile so progress/actions can be stored for this account.
  if (data.user) await ensureProfile(data.user.id, username)

  // Email confirmation disabled → Supabase returned a session and set the auth
  // cookie, so they're already signed in. Send them straight on.
  if (data.session) {
    revalidatePath('/', 'layout')
    redirect(next)
  }

  // Confirmation required → account is created but they must verify via email.
  return {
    message: `Account created. We sent a confirmation link to ${email} — open it to activate your account.`,
  }
}

/**
 * Re-send the sign-up verification email, e.g. after the original link expired.
 * Reports success for unknown or already-verified emails too, so it can't be
 * used to probe which addresses have accounts.
 */
export async function resendConfirmation(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured) return unavailable()
  const email = String(formData.get('email') ?? '').trim()
  const next = safeNext(formData.get('next'))
  if (!email) return { error: 'Enter your email address above first.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${await requestOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
  })
  if (error && (error.status === 429 || /rate limit|security purposes/i.test(error.message)))
    return { error: 'Too many emails sent. Wait a few minutes, then try again.' }
  if (error) console.error('[auth] resend confirmation failed:', error.message)

  return { message: `If ${email} needs verifying, a fresh link is on its way. Check spam too.` }
}

/**
 * /welcome picker: sets the username for a signed-in player who doesn't have
 * one yet (OAuth sign-ups, or accounts created before usernames were enforced).
 * Middleware keeps them on /welcome until profiles.username_set is true.
 */
export async function chooseUsername(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured || !serviceConfigured) return unavailable()
  const username = String(formData.get('username') ?? '').trim()
  const next = safeNext(formData.get('next'))
  const badUsername = usernameError(username)
  if (badUsername) return { error: badUsername }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/welcome')

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').upsert(
    {
      id: user.id,
      username: `${username}_${user.id.slice(0, 4)}`,
      display_name: username,
      avatar: username.slice(0, 2).toUpperCase(),
      username_set: true,
    },
    { onConflict: 'id' },
  )
  if (error) {
    if (error.code === '23505') return { error: 'That username is taken. Try another.' }
    return { error: 'Could not save your username. Try again.' }
  }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signInWithOAuth(provider: 'google' | 'github', rawNext = '/dashboard') {
  if (!supabaseConfigured) return
  if (provider !== 'google' && provider !== 'github') return
  const next = safeNext(rawNext)
  const supabase = await createClient()
  const origin = await requestOrigin()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  })
  if (error) return
  if (data.url) redirect(data.url)
}

/**
 * Send a password-reset email. The link routes through /auth/callback (which
 * exchanges the PKCE code for a recovery session) and lands on /reset-password.
 * Always reports success so it can't be used to probe which emails have accounts.
 */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!supabaseConfigured) return unavailable()
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Enter your email address.' }

  const supabase = await createClient()
  const origin = await requestOrigin()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  return {
    message: 'If an account exists for that email, a password reset link is on its way.',
  }
}

/**
 * Set a new password for the user in the recovery session established by the
 * reset link. On success they stay signed in (auto-login) and go to /dashboard.
 */
export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!supabaseConfigured) return unavailable()
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }
  if (password !== confirm) return { error: 'Passwords do not match.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signOut() {
  if (!supabaseConfigured) redirect('/')
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

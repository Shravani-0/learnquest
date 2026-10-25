'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/env'
import { createAdminClient, serviceConfigured } from '@/lib/supabase/admin'
import { safeNext } from '@/lib/safe-next'

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

const NOT_CONFIGURED =
  'Supabase is not configured yet. Add your credentials to .env.local and restart.'

/**
 * Guarantee a profiles row exists for a new user so their XP/progress/answers
 * have somewhere to attach (user_quest_progress.user_id → profiles.id). The DB
 * trigger normally creates this on sign-up; this is an idempotent fallback that
 * mirrors the trigger's username scheme, so it's a no-op if the trigger ran.
 */
async function ensureProfile(userId: string, username: string, email: string) {
  if (!serviceConfigured) return
  const base = (username || email.split('@')[0] || 'quester').trim() || 'quester'
  const admin = createAdminClient()
  await admin.from('profiles').upsert(
    {
      id: userId,
      username: `${base}_${userId.slice(0, 4)}`,
      display_name: username || base,
      avatar: base.slice(0, 2).toUpperCase(),
    },
    { onConflict: 'id', ignoreDuplicates: true },
  )
}

export type AuthState = { error?: string; message?: string }

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured) return { error: NOT_CONFIGURED }
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const next = safeNext(formData.get('next'))

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured) return { error: NOT_CONFIGURED }
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const username = String(formData.get('username') ?? '').trim().slice(0, 32)
  const next = safeNext(formData.get('next'))
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { username, display_name: username },
    },
  })
  if (error) return { error: error.message }

  // Persist their profile so progress/actions can be stored for this account.
  if (data.user) await ensureProfile(data.user.id, username, email)

  // Email confirmation disabled → Supabase returned a session and set the auth
  // cookie, so they're already signed in. Send them straight on.
  if (data.session) {
    revalidatePath('/', 'layout')
    redirect(next)
  }

  // Confirmation required → account is created but they must verify via email.
  return {
    message:
      'Account created! Check your email to confirm, then sign in. ' +
      '(If email confirmation is disabled in Supabase, just sign in now.)',
  }
}

export async function signInWithOAuth(provider: 'google' | 'github', rawNext = '/dashboard') {
  if (!supabaseConfigured) return
  if (provider !== 'google' && provider !== 'github') return
  const next = safeNext(rawNext)
  const supabase = await createClient()
  const origin = (await headers()).get('origin') ?? siteUrl()
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
  if (!supabaseConfigured) return { error: NOT_CONFIGURED }
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Enter your email address.' }

  const supabase = await createClient()
  const origin = (await headers()).get('origin') ?? siteUrl()
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
  if (!supabaseConfigured) return { error: NOT_CONFIGURED }
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

'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signIn, signUp, signInWithOAuth, type AuthState } from '@/app/auth/actions'
import { AuthShell, AuthField, SubmitButton, FormError, FormMessage } from './ui'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8

export default function AuthForm({ mode, next }: { mode: 'login' | 'signup'; next?: string }) {
  const action = mode === 'login' ? signIn : signUp
  const [state, formAction] = useActionState<AuthState, FormData>(action, {})
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [clientError, setClientError] = useState<string | null>(null)

  // Client-side validation for sign-up. Runs before the server action; calling
  // preventDefault() cancels the action so the request never leaves the browser.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (mode !== 'signup') return
    let err: string | null = null
    if (!EMAIL_RE.test(email)) err = 'Enter a valid email address.'
    else if (password.length < MIN_PASSWORD)
      err = `Password must be at least ${MIN_PASSWORD} characters.`
    else if (password !== confirm) err = 'Passwords do not match.'

    if (err) {
      e.preventDefault()
      setClientError(err)
    } else {
      setClientError(null)
    }
  }

  return (
    <AuthShell
      title={mode === 'login' ? 'Welcome back, operator.' : 'Get an account.'}
      subtitle={
        mode === 'login'
          ? 'Sign in to keep your XP, clearance and progress.'
          : 'Start at guest. Earn your way to root.'
      }
      command={mode === 'login' ? 'login' : 'useradd'}
      footer={
        mode === 'login' ? (
          <>
            no account?{' '}
            <Link href={`/signup${nextQuery}`} className="sq-link">sign up</Link>
          </>
        ) : (
          <>
            already have one?{' '}
            <Link href={`/login${nextQuery}`} className="sq-link">sign in</Link>
          </>
        )
      }
    >
      {/* OAuth */}
      <div className="sq-oauth">
        <button onClick={() => signInWithOAuth('google', next ?? '/dashboard')} className="sq-btn sq-btn--ghost">
          <span className="sq-btn__fill" aria-hidden="true" />
          google
        </button>
        <button onClick={() => signInWithOAuth('github', next ?? '/dashboard')} className="sq-btn sq-btn--ghost">
          <span className="sq-btn__fill" aria-hidden="true" />
          github
        </button>
      </div>

      <div className="sq-or">or</div>

      <form action={formAction} onSubmit={handleSubmit} className="sq-stack" style={{ gap: '0.9rem' }} noValidate>
        <input type="hidden" name="next" value={next ?? '/dashboard'} />

        {mode === 'signup' && (
          <AuthField
            label="Username"
            name="username"
            required
            minLength={2}
            autoComplete="username"
            placeholder="detective_you"
          />
        )}

        <AuthField
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <AuthField
          label="Password"
          name="password"
          type="password"
          required
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          minLength={mode === 'signup' ? MIN_PASSWORD : undefined}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {mode === 'signup' && (
          <AuthField
            label="Confirm password"
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        )}

        {mode === 'login' && (
          <Link href="/forgot-password" className="sq-auth__forgot">
            forgot password?
          </Link>
        )}

        {clientError && <FormError>{clientError}</FormError>}
        {state.error && <FormError>{state.error}</FormError>}
        {state.message && <FormMessage>{state.message}</FormMessage>}

        <SubmitButton label={mode === 'login' ? 'sign in' : 'create account'} />
      </form>
    </AuthShell>
  )
}

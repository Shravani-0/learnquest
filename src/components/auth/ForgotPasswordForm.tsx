'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset, type AuthState } from '@/app/auth/actions'
import { AuthShell, AuthField, SubmitButton, FormError, FormMessage } from './ui'

export default function ForgotPasswordForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(requestPasswordReset, {})

  return (
    <AuthShell
      title="Reset your password."
      subtitle="Enter your email and we'll send you a link to set a new password."
      command="passwd --reset"
      footer={
        <>
          remembered it?{' '}
          <Link href="/login" className="sq-link">sign in</Link>
        </>
      }
    >
      <form action={formAction} className="sq-stack" style={{ gap: '0.9rem' }}>
        <AuthField
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />

        {state.error && <FormError>{state.error}</FormError>}
        {state.message && <FormMessage>{state.message}</FormMessage>}

        <SubmitButton label="send reset link" />
      </form>
    </AuthShell>
  )
}

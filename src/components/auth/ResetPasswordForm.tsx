'use client'

import { useActionState, useState } from 'react'
import { updatePassword, type AuthState } from '@/app/auth/actions'
import { AuthShell, AuthField, SubmitButton, FormError } from './ui'

const MIN_PASSWORD = 8

export default function ResetPasswordForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(updatePassword, {})
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [clientError, setClientError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    let err: string | null = null
    if (password.length < MIN_PASSWORD)
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
    <AuthShell title="Set a new password." subtitle="Choose a new password for your account." command="passwd">
      <form action={formAction} onSubmit={handleSubmit} className="sq-stack" style={{ gap: '0.9rem' }} noValidate>
        <AuthField
          label="New password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <AuthField
          label="Confirm new password"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="••••••••"
        />

        {clientError && <FormError>{clientError}</FormError>}
        {state.error && <FormError>{state.error}</FormError>}

        <SubmitButton label="update password" />
      </form>
    </AuthShell>
  )
}

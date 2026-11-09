'use client'

import { useActionState, useState } from 'react'
import { chooseUsername, signOut, type AuthState } from '@/app/auth/actions'
import { usernameError, USERNAME_MAX, USERNAME_MIN } from '@/lib/username'
import { AuthShell, AuthField, SubmitButton, FormError } from './ui'

export default function ChooseUsernameForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(chooseUsername, {})
  const [username, setUsername] = useState('')
  const [clientError, setClientError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const err = usernameError(username)
    if (err) e.preventDefault()
    setClientError(err)
  }

  return (
    <AuthShell
      title="Pick a username."
      subtitle="It's how you show up on the leaderboard. Letters, numbers and underscores."
      command="usermod"
      footer={
        <form action={signOut}>
          wrong account?{' '}
          <button type="submit" className="sq-link">sign out</button>
        </form>
      }
    >
      <form action={formAction} onSubmit={handleSubmit} className="sq-stack" style={{ gap: '0.9rem' }} noValidate>
        <input type="hidden" name="next" value={next} />
        <AuthField
          label="Username"
          name="username"
          required
          autoFocus
          minLength={USERNAME_MIN}
          maxLength={USERNAME_MAX}
          autoComplete="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="detective_you"
        />

        {clientError && <FormError>{clientError}</FormError>}
        {state.error && <FormError>{state.error}</FormError>}

        <SubmitButton label="continue" />
      </form>
    </AuthShell>
  )
}

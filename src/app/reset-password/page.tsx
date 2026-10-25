import Link from 'next/link'
import { getUser } from '@/lib/db/queries'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'
import { AuthShell } from '@/components/auth/ui'

export const metadata = { title: 'Set new password — unrust' }
export const dynamic = 'force-dynamic'

/**
 * The reset link routes through /auth/callback, which exchanges the recovery
 * code for a session and forwards here. If that succeeded, getUser() returns the
 * user and we show the new-password form. If the link was expired/invalid, the
 * callback forwards with ?error=expired (or there's simply no session), and we
 * show a graceful "request a new link" notice instead.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const user = await getUser()

  if (error || !user) {
    return (
      <AuthShell
        title="Link expired."
        subtitle="This password reset link is no longer valid. Request a fresh one to continue."
        command="passwd"
      >
        <p className="sq-msg sq-msg--err">reset token expired or invalid</p>
        <Link href="/forgot-password" className="sq-btn">
          <span className="sq-btn__fill" aria-hidden="true" />
          request a new link
          <span className="sq-arrow" aria-hidden="true">→</span>
        </Link>
      </AuthShell>
    )
  }

  return <ResetPasswordForm />
}

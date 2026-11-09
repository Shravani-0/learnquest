import { redirect } from 'next/navigation'
import { getUser } from '@/lib/db/queries'
import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/safe-next'
import ChooseUsernameForm from '@/components/auth/ChooseUsernameForm'

export const metadata = { title: 'Pick a username — unrust' }
export const dynamic = 'force-dynamic'

/**
 * Mandatory username step. Middleware sends signed-in players here until their
 * profile has username_set; once it does, this page just forwards them on.
 */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const next = safeNext((await searchParams).next)
  const user = await getUser()
  if (!user) redirect('/login?next=/welcome')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('username_set')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.username_set) redirect(next)

  return <ChooseUsernameForm next={next} />
}

import AuthForm from '@/components/auth/AuthForm'

export const metadata = { title: 'Sign in — unrust' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams
  return <AuthForm mode="login" next={next} linkExpired={error === 'auth'} />
}

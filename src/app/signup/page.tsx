import AuthForm from '@/components/auth/AuthForm'

export const metadata = { title: 'Sign up — unrust' }

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return <AuthForm mode="signup" next={next} />
}

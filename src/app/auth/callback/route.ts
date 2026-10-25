import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/safe-next'

/**
 * OAuth + email-confirmation callback. Supabase redirects here with a `code`
 * that we exchange for a session cookie, then forward the user onward.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Same-site paths only: `${origin}${next}` with next='@evil.com' would leave the site.
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Exchange failed (expired/invalid link). Keep reset links on their own page
  // so they can show a reset-specific "link expired" message; everything else
  // falls back to the generic login error.
  if (next === '/reset-password') {
    return NextResponse.redirect(`${origin}/reset-password?error=expired`)
  }
  return NextResponse.redirect(`${origin}/login?error=auth`)
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './types'
import { supabaseConfigured } from './env'
import { safeNext } from '@/lib/safe-next'

/**
 * Refreshes the Supabase auth session on every request and forwards the
 * updated auth cookies to both the browser and downstream Server Components.
 * Must run in middleware so expired tokens are rotated before pages render.
 */
export async function updateSession(request: NextRequest) {
  // Before Supabase is configured, skip auth entirely so the app still runs.
  if (!supabaseConfigured) return NextResponse.next({ request })

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getClaims()/getUser() must be called to trigger token refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Gate the dashboard behind auth; send anonymous visitors to login.
  if (!user && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Keep already-authenticated users off the auth entry pages. /reset-password is
  // intentionally excluded — a signed-in recovery session legitimately needs it.
  if (
    user &&
    (pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password')
  ) {
    const url = request.nextUrl.clone()
    const next = new URL(safeNext(request.nextUrl.searchParams.get('next')), request.nextUrl.origin)
    url.pathname = next.pathname
    url.search = next.search
    return NextResponse.redirect(url)
  }

  // A username is mandatory before anything that records progress: signed-in
  // players who haven't picked one (OAuth sign-ups, older accounts) are sent to
  // /welcome from the dashboard and the play screens (whose server actions post
  // to the same paths). Public pages — home, catalog, world detail — always load.
  const needsUsername =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/challenges') || // your name is shown to your opponent
    /^\/adventures\/[^/]+\/play(\/|$)/.test(pathname)
  if (user && needsUsername) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username_set')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile?.username_set) {
      const url = request.nextUrl.clone()
      url.pathname = '/welcome'
      url.search = ''
      url.searchParams.set('next', pathname + request.nextUrl.search)
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

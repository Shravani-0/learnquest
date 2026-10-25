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

  return supabaseResponse
}

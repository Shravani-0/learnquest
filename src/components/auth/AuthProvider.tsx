'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
})

/**
 * Bridges Supabase client auth into React context. The app is server-authoritative
 * (Server Components read the user and pass it down), so this provider's job is to
 * (a) expose the live user/session/loading to any Client Component via useAuth(),
 * and (b) re-render the server tree on auth changes so SSR-derived UI (Navbar,
 * dashboard) stays in sync without a manual reload.
 */
export default function AuthProvider({
  initialUser = null,
  children,
}: {
  initialUser?: User | null
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(initialUser)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setLoading(false)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        router.refresh()
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [router])

  return <AuthContext.Provider value={{ user, session, loading }}>{children}</AuthContext.Provider>
}

/** Access the current auth state from any Client Component. */
export function useAuth() {
  return useContext(AuthContext)
}

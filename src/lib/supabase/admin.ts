import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Service-role Supabase client — bypasses Row-Level Security.
 *
 * This is the ONLY path that may write XP, quest progress, achievements, or
 * answer logs. It uses the secret SUPABASE_SERVICE_ROLE_KEY, so it must never be
 * imported by a Client Component. The `server-only` guard above makes the build
 * fail if that ever happens.
 */
export const serviceConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref')

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

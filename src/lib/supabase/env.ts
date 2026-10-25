/**
 * True when both public Supabase env vars are present. Lets the app build and
 * run before a Supabase project is created — auth/persistence simply no-op until
 * .env.local is filled in.
 */
export const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref')

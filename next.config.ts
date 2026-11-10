import type { NextConfig } from 'next'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'

const nextConfig: NextConfig = {
  reactStrictMode: true,
}

/**
 * Env vars a production deploy cannot work without. NEXT_PUBLIC_* values are
 * baked into the browser bundle at build time, so a build without them ships a
 * site where nobody can sign in — fail the build instead, and the host keeps
 * serving the last good deploy. Local `next dev` is unaffected.
 *
 * Set SKIP_ENV_CHECK=1 only for builds that intentionally run without secrets
 * (e.g. a CI type-check job).
 */
const REQUIRED_IN_PRODUCTION = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD && process.env.SKIP_ENV_CHECK !== '1') {
    const missing = REQUIRED_IN_PRODUCTION.filter(
      k => !process.env[k] || process.env[k]!.includes('your-project-ref'),
    )
    if (missing.length) {
      throw new Error(
        `Missing environment variables for a production build: ${missing.join(', ')}.\n` +
          'Add them in your host’s environment settings (Netlify: Site configuration → Environment ' +
          'variables, scope "All scopes" so builds can read them), then redeploy.',
      )
    }
  }
  return nextConfig
}

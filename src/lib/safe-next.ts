/**
 * Sanitize a post-auth `next` redirect target. Only same-site paths survive:
 * absolute URLs, protocol-relative `//host`, backslash tricks (`/\host`) and
 * `@host` userinfo tricks (`origin + '@evil.com'`) all fall back to `fallback`.
 */
export function safeNext(next: unknown, fallback = '/dashboard'): string {
  const v = typeof next === 'string' ? next.trim() : ''
  if (!v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\')) return fallback
  if (/[\u0000-\u001f\\]/.test(v)) return fallback
  return v
}

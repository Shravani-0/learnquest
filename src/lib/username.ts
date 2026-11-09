/**
 * Username rules shared by the sign-up form, the /welcome picker and the server
 * actions behind them. The stored profile username gets a short uuid suffix for
 * uniqueness (see handle_new_user / chooseUsername); this validates the part
 * the player types.
 */
export const USERNAME_MIN = 2
export const USERNAME_MAX = 24
const USERNAME_RE = /^[A-Za-z0-9_]+$/

export function usernameError(raw: string): string | null {
  const v = raw.trim()
  if (v.length < USERNAME_MIN) return `Username must be at least ${USERNAME_MIN} characters.`
  if (v.length > USERNAME_MAX) return `Username must be at most ${USERNAME_MAX} characters.`
  if (!USERNAME_RE.test(v)) return 'Username can only use letters, numbers and underscores.'
  return null
}

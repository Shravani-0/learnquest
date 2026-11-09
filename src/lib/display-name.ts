/**
 * How a player's name and avatar are shown (navbar pill, dashboard header,
 * leaderboard). One rule everywhere: the chosen display name, else the stored
 * username, else a neutral fallback — blank/whitespace values count as missing.
 */
type NameSource = { display_name?: string | null; username?: string | null } | null | undefined

export function displayNameFor(profile: NameSource): string {
  return profile?.display_name?.trim() || profile?.username?.trim() || 'Quester'
}

export function avatarFor(profile: (NameSource & { avatar?: string | null }) | null | undefined): string {
  return profile?.avatar?.trim() || displayNameFor(profile).slice(0, 2).toUpperCase()
}

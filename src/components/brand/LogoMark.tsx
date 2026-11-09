/**
 * The unrust "un" monogram: a chalk u whose right stem is the hazard-yellow left
 * half of an n. Pure geometry on a 40-unit stroke (bowls r 35/75), so it stays
 * crisp at any size. The same paths are in src/app/icon.svg.
 */
export const LOGO_PATHS = {
  /** u, full shape (its right stem is painted over in yellow). */
  u: 'M87 97H127V227A35 35 0 0 0 197 227V97H237V227A75 75 0 0 1 87 227Z',
  /** n, full arch (its left half is painted over in yellow). */
  n: 'M197 302V172A75 75 0 0 1 347 172V302H307V172A35 35 0 0 0 237 172V302Z',
  /** Shared stem + left half of the n's arch. */
  // The stem's right edge meets the outer arc at y = 172 − √(75² − 35²) ≈ 105.67.
  accent: 'M197 302V97H237V105.67A75 75 0 0 1 272 97V137A35 35 0 0 0 237 172V302Z',
} as const

export default function LogoMark({
  size = 24,
  className,
  title,
}: {
  size?: number
  className?: string
  /** Pass when the mark stands alone; omit when visible text already names it. */
  title?: string
}) {
  return (
    <svg
      viewBox="87 97 260 205"
      width={(size * 260) / 205}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <path d={LOGO_PATHS.u} fill="var(--c-ink, #F2F0E6)" />
      <path d={LOGO_PATHS.n} fill="var(--c-ink, #F2F0E6)" />
      <path d={LOGO_PATHS.accent} fill="var(--c-accent, #E4FF1A)" />
    </svg>
  )
}

// Environment helpers + the shared easing vocabulary. Call these client-side only.
export const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
export const isTouch = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(hover: none), (pointer: coarse)').matches
export const isMobile = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(max-width: 767px)').matches

// One easing family for the whole site. Use these names; never invent per-component curves.
export const ease = {
  out: 'expo.out', // default entrance
  inOut: 'expo.inOut', // big moves
  soft: 'power3.out', // small UI
  spring: 'back.out(1.6)', // playful pops, rare
} as const

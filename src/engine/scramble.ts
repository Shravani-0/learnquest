// Text scramble/decode — the motion verb. The final text always lands in the DOM and in
// aria-label, so screen readers never see glyph noise. Returns a GSAP tween.
import { gsap } from 'gsap'

const GLYPHS = '!<>-_\\/[]{}=+*^?#01'

export function scramble(el: HTMLElement, duration = 0.9, delay = 0) {
  const final = el.textContent || ''
  el.setAttribute('aria-label', final)
  const o = { p: 0 }
  return gsap.to(o, {
    p: 1,
    duration,
    delay,
    ease: 'none',
    onUpdate: () => {
      const n = Math.floor(o.p * final.length)
      el.textContent =
        final.slice(0, n) +
        [...final.slice(n)]
          .map((c) => (c === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
          .join('')
    },
    onComplete: () => {
      el.textContent = final
    },
  })
}

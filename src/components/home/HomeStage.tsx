'use client'

import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { initReveals } from '@/engine/reveal'
import { prefersReducedMotion } from '@/engine/env'

gsap.registerPlugin(ScrollTrigger)

export default function HomeStage() {
  useEffect(() => {
    const reduced = prefersReducedMotion()
    const root = document.querySelector<HTMLElement>('.sq')
    const loaderEl = document.getElementById('loader')
    const depthEl = document.querySelector<HTMLElement>('[data-depth]')

    // The boot loader is owned by a vanilla inline script (covers first paint without waiting on
    // hydration). On a client-side re-visit that script does not re-run, so kill any stale loader.
    if (document.documentElement.classList.contains('is-loaded') && loaderEl) loaderEl.hidden = true

    // Fade the bottom HUD once past the hero so it never overlaps section content (works with or
    // without smooth scroll).
    const onNativeScroll = () => {
      document.documentElement.classList.toggle('sq-scrolled', window.scrollY > 80)
    }
    onNativeScroll()
    window.addEventListener('scroll', onNativeScroll, { passive: true })

    if (reduced) return () => window.removeEventListener('scroll', onNativeScroll) // content visible; no smooth scroll

    let lenis: Lenis | null = null
    let rafFn: ((t: number) => void) | null = null
    let fallback: ReturnType<typeof setTimeout> | null = null
    let started = false

    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, anchors: true })
    lenis.stop()
    lenis.on('scroll', (l: Lenis) => {
      ScrollTrigger.update()
      if (depthEl) {
        const p = l.limit > 0 ? Math.min(1, l.scroll / l.limit) : 0
        depthEl.textContent = `depth ${String(Math.round(p * 100)).padStart(3, '0')}%`
      }
    })
    rafFn = (t: number) => lenis?.raf(t * 1000)
    gsap.ticker.add(rafFn)
    gsap.ticker.lagSmoothing(0)

    const ctx = gsap.context(() => {
      initReveals(root ?? document)
    }, root ?? undefined)

    const start = () => {
      if (started) return
      started = true
      lenis?.start()
      requestAnimationFrame(() => ScrollTrigger.refresh())
    }

    const onLoaded = () => {
      window.removeEventListener('sq:loaded', onLoaded)
      start()
    }

    if (document.documentElement.classList.contains('is-loaded')) {
      start()
    } else {
      window.addEventListener('sq:loaded', onLoaded)
      fallback = setTimeout(start, 2200) // never leave scroll locked if the signal is missed
    }

    return () => {
      window.removeEventListener('sq:loaded', onLoaded)
      window.removeEventListener('scroll', onNativeScroll)
      if (fallback) clearTimeout(fallback)
      if (rafFn) gsap.ticker.remove(rafFn)
      lenis?.destroy()
      ctx.revert()
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return null
}

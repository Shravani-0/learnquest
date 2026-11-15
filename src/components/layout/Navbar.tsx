'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { signOut } from '@/app/auth/actions'
import LogoMark from '@/components/brand/LogoMark'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/adventures', label: 'Quests' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/challenges', label: 'Challenges' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/dashboard', label: 'Dashboard' },
]

export interface NavUser {
  displayName: string
  xp: number
  clearance: string
}

export function matchActive(href: string, pathname: string) {
  if (href === '/') return pathname === '/'
  if (href === '/adventures') return pathname === '/adventures' || pathname.startsWith('/adventures/')
  if (href === '/dashboard') return pathname.startsWith('/dashboard')
  if (href === '/pricing') return pathname === '/pricing'
  if (href === '/challenges') return pathname.startsWith('/challenges')
  return false
}

export default function Navbar({ user }: { user: NavUser | null }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close the menu on navigation (incl. back/forward), and on Escape.
  useEffect(() => setMobileOpen(false), [pathname])
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false)
    document.addEventListener('keydown', onKey)
    // Keep the page underneath from scrolling while the menu is open.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  return (
    <header className="sq-nav">
      <div className="sq-nav__in">
        <Link href="/" className="sq-brand" aria-label="unrust home">
          <LogoMark size={26} className="sq-brand__mark" />
        </Link>

        <nav className="sq-nav__links" aria-label="Primary">
          {navLinks.map((link) => {
            const active = matchActive(link.href, pathname)
            return (
              <Link
                key={link.href}
                href={link.href}
                className="sq-nav__link sq-draw"
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="sq-nav__right">
          <span className="sq-xp" title={user ? `clearance: ${user.clearance}` : 'not signed in'}>
            <span className="sq-xp__dot" aria-hidden="true" />
            <b>{user?.clearance ?? 'guest'}</b>
            <span className="sq-xp__sep" aria-hidden="true">·</span>
            <span className="sq-num">{(user?.xp ?? 0).toLocaleString()}</span> XP
          </span>
          {user ? (
            <form action={signOut}>
              <button type="submit" className="sq-signout" title="Sign out">
                <span aria-hidden="true">⏻</span>
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.displayName}
                </span>
              </button>
            </form>
          ) : (
            <Link href="/login" className="sq-btn sq-signin">
              <span className="sq-btn__fill" aria-hidden="true" />
              Sign in
            </Link>
          )}
        </div>

        <button
          className="sq-burger"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="sq-mobile-menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="sq-drawer" id="sq-mobile-menu">
          <span className="sq-xp sq-drawer__xp">
            <span className="sq-xp__dot" aria-hidden="true" />
            <b>{user?.clearance ?? 'guest'}</b>
            <span className="sq-xp__sep" aria-hidden="true">·</span>
            <span className="sq-num">{(user?.xp ?? 0).toLocaleString()}</span> XP
          </span>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={matchActive(link.href, pathname) ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <form action={signOut}>
              <button type="submit">Sign out ({user.displayName})</button>
            </form>
          ) : (
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  )
}

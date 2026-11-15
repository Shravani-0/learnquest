'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Home, Compass, Swords, LayoutDashboard } from 'lucide-react'
import { matchActive } from './Navbar'

/** Thumb-reach tab bar on phones: the four places people move between most. */
const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/adventures', label: 'Quests', icon: Compass },
  { href: '/challenges', label: 'Duels', icon: Swords },
  { href: '/dashboard', label: 'Me', icon: LayoutDashboard },
]

/** Game screens need every pixel (and room for the on-screen keyboard), so no tab bar there. */
function isPlayScreen(pathname: string) {
  return pathname.endsWith('/play') || /^\/challenges\/[^/]+/.test(pathname)
}

export default function MobileTabBar() {
  const pathname = usePathname()
  const show = !isPlayScreen(pathname)

  // Reserve space at the bottom of the page so the bar never covers content.
  useEffect(() => {
    document.body.classList.toggle('has-tabbar', show)
    return () => document.body.classList.remove('has-tabbar')
  }, [show])

  if (!show) return null
  return (
    <nav className="sq-tabbar" aria-label="Quick">
      {tabs.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="sq-tabbar__a"
          aria-current={matchActive(href, pathname) ? 'page' : undefined}
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  )
}

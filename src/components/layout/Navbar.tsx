'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, Zap } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/adventures', label: 'Quests' },
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/dashboard', label: 'Dashboard' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#121212] border-b border-[#2A2A2A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-xl bg-[#FF3C3C] flex items-center justify-center shadow-[0_3px_0_#881A1A] group-hover:shadow-[0_1px_0_#881A1A] group-hover:translate-y-[2px] transition-all duration-[70ms]">
              <Zap className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <span className="font-black text-lg tracking-tight text-white">
              Skill<span className="text-[#FF3C3C]">Quest</span>
            </span>
          </Link>

          {/* Desktop nav — tactile pill buttons */}
          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map(link => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`cursor-target px-4 py-2 rounded-xl text-sm font-bold tracking-wide transition-all duration-[70ms] ${
                    active
                      ? 'bg-[#FF3C3C] text-white shadow-[0_3px_0_#881A1A] hover:shadow-[0_1px_0_#881A1A] hover:translate-y-[2px] active:shadow-none active:translate-y-[3px]'
                      : 'bg-[#1E1E1E] text-[#A0A0A0] border border-[#2A2A2A] shadow-[0_3px_0_#0A0A0A] hover:text-[#F0F0F0] hover:shadow-[0_1px_0_#0A0A0A] hover:translate-y-[2px] active:shadow-none active:translate-y-[3px]'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Right: XP tracker + CTA */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {/* XP pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1E1E1E] border border-[#2A2A2A] shadow-[0_2px_0_#0A0A0A]">
              <div className="relative flex items-center justify-center w-4 h-4">
                <div className="w-2 h-2 rounded-full bg-[#00A0E0]" />
                <div className="absolute inset-0 rounded-full bg-[#00A0E0] opacity-30 animate-ping" style={{ animationDuration: '2.5s' }} />
              </div>
              <span className="text-[11px] font-black font-mono text-white tracking-widest">0 XP</span>
            </div>

            {/* Play Free CTA — red tactile */}
            <Link
              href="/adventures"
              className="cursor-target px-5 py-2 rounded-xl bg-[#FF3C3C] text-white font-black text-sm tracking-wide shadow-[0_4px_0_#881A1A] hover:shadow-[0_2px_0_#881A1A] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all duration-[70ms]"
            >
              Play Free
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl bg-[#1E1E1E] border border-[#2A2A2A] shadow-[0_3px_0_#0A0A0A] text-[#A0A0A0] hover:text-[#F0F0F0] hover:shadow-[0_1px_0_#0A0A0A] hover:translate-y-[2px] active:shadow-none active:translate-y-[3px] transition-all duration-[70ms]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#2A2A2A] bg-[#191919]">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                  pathname === link.href
                    ? 'bg-[#FF3C3C] text-white'
                    : 'bg-[#252525] border border-[#333333] text-[#A0A0A0] hover:text-[#F0F0F0]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/adventures"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 rounded-xl bg-[#FF3C3C] text-white font-black text-sm text-center shadow-[0_3px_0_#881A1A] mt-1"
            >
              Play Free
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

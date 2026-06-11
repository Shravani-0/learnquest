import Link from 'next/link'
import { Zap } from 'lucide-react'

const footerLinks = {
  Worlds: [
    { label: 'SQL Murder Mystery', href: '/adventures/sql-murder-mystery' },
    { label: 'Linux Prison Break', href: '/adventures/linux-prison-break' },
    { label: 'Git Time Traveler',  href: '/adventures/git-time-traveler' },
  ],
  Platform: [
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Dashboard',    href: '/dashboard' },
    { label: 'All Quests',   href: '/adventures' },
  ],
}

export default function Footer() {
  return (
    <footer className="border-t border-[#2A2A2A] bg-[#121212]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Top row: brand + link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">

          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4 w-fit">
              <div className="w-8 h-8 rounded-xl bg-[#FF3C3C] flex items-center justify-center shadow-[0_3px_0_#881A1A]">
                <Zap className="w-4 h-4 text-white" fill="currentColor" />
              </div>
              <span className="font-black text-lg text-white">
                Skill<span className="text-[#FF3C3C]">Quest</span>
              </span>
            </Link>
            <p className="text-sm text-[#606060] leading-relaxed max-w-[260px]">
              Learn SQL, Linux, and Git through story-driven adventures.
              No fluff. No filler.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-[10px] font-black tracking-[0.22em] uppercase text-[#606060] mb-4">
                {section}
              </h4>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#A0A0A0] hover:text-[#F0F0F0] transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#2A2A2A]">
          <p className="text-xs text-[#606060]">
            © {new Date().getFullYear()} SkillQuest. Learn by playing.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-xs text-[#606060] hover:text-[#A0A0A0] transition-colors">Privacy</Link>
            <Link href="#" className="text-xs text-[#606060] hover:text-[#A0A0A0] transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

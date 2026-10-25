import type { Metadata, Viewport } from 'next'
import './globals.css'
import { sans, display, mono, brand } from './fonts'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import AuthProvider from '@/components/auth/AuthProvider'
import { getUser, getProfile } from '@/lib/db/queries'
import { clearanceForXp } from '@/lib/xp'

export const metadata: Metadata = {
  metadataBase: new URL('https://unrust.app'),
  title: {
    default: 'unrust: learn by operating real systems',
    template: '%s · unrust',
  },
  description:
    'Learn real tech by operating real systems. Solve a murder in SQL, break out of a Linux prison, fix a timeline with Git. You run the commands, the skill sticks.',
  keywords: ['learn SQL', 'learn Linux', 'learn Git', 'interactive coding', 'terminal game', 'learn by doing', 'unrust'],
  alternates: { canonical: './' },
  openGraph: {
    type: 'website',
    siteName: 'unrust',
    title: 'unrust: learn by operating real systems',
    description: 'Solve a murder in SQL. Break out of a Linux prison. You operate real systems to learn.',
    images: ['/og.png'],
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  themeColor: '#181818',
  colorScheme: 'dark',
}

// Runs before first paint: hidden-until-revealed styles only apply when JS + motion are on.
const flags = `document.documentElement.classList.add('js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion')`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  const profile = user ? await getProfile(user.id) : null
  const navUser =
    user && profile
      ? {
          displayName: profile.display_name || profile.username,
          xp: profile.xp,
          clearance: clearanceForXp(profile.xp).current.title,
        }
      : null

  return (
    <html lang="en" className={`dark ${sans.variable} ${display.variable} ${mono.variable} ${brand.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: flags }} />
      </head>
      <body className="bg-quest-bg text-quest-text antialiased">
        <a className="sq-skip" href="#main">Skip to content</a>
        <AuthProvider initialUser={user}>
          <Navbar user={navUser} />
          <main id="main" tabIndex={-1} className="pt-16">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}

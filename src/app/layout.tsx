import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'SkillQuest — Learn Skills Through Adventure',
  description: 'Escape prisons. Solve murders. Save timelines. Learn SQL, Linux, Git, and more through immersive story-driven adventures.',
  keywords: ['learning', 'SQL', 'Linux', 'Git', 'interactive', 'games', 'programming'],
  openGraph: {
    title: 'SkillQuest — Learn Skills Through Adventure',
    description: 'Escape prisons. Solve murders. Save timelines. Learn real skills while playing.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-quest-bg text-quest-text antialiased">
        <Navbar />
        <main className="pt-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}

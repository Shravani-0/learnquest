import { Inter, Space_Grotesk, JetBrains_Mono, Anton } from 'next/font/google'

// Brand wordmark only — a condensed industrial poster face, distinct from the body.
export const brand = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-brand',
  display: 'swap',
})

// App-wide neutral body (keeps the untouched auth/game pages on their existing face).
export const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

// Display / headings for the marketing surface. The proportional sibling of a mono.
export const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-display',
  display: 'swap',
})

// The console: commands, data, labels, the systems index. Also the project's `font-mono`.
export const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
})

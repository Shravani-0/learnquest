import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }))
vi.mock('@/app/auth/actions', () => ({ signOut: async () => {} }))

import { displayNameFor, avatarFor } from '@/lib/display-name'
import Navbar from '@/components/layout/Navbar'
import DashboardView, { type DashboardViewProps } from '@/components/dashboard/DashboardView'

// ═════════════════════════════════════════════════════════════════════════════
describe('displayNameFor', () => {
  it('prefers the chosen display name', () => {
    expect(displayNameFor({ display_name: 'Sherlock', username: 'sherlock_f4f0' })).toBe('Sherlock')
  })

  it('falls back to the username when the display name is blank', () => {
    // The original bug: an empty display name rendered as "_f4f0"-style junk or nothing.
    expect(displayNameFor({ display_name: '', username: 'sherlock_f4f0' })).toBe('sherlock_f4f0')
    expect(displayNameFor({ display_name: '   ', username: 'sherlock_f4f0' })).toBe('sherlock_f4f0')
    expect(displayNameFor({ display_name: null, username: 'sherlock_f4f0' })).toBe('sherlock_f4f0')
  })

  it('trims surrounding whitespace', () => {
    expect(displayNameFor({ display_name: '  Watson ', username: 'w_1' })).toBe('Watson')
  })

  it('uses a neutral fallback when there is no profile at all', () => {
    expect(displayNameFor(null)).toBe('Quester')
    expect(displayNameFor({ display_name: '', username: '' })).toBe('Quester')
  })
})

describe('avatarFor', () => {
  it('uses the stored avatar when present', () => {
    expect(avatarFor({ avatar: 'SH', display_name: 'Ada' })).toBe('SH')
  })

  it('derives initials from the shown name when the avatar is blank', () => {
    expect(avatarFor({ avatar: '', display_name: 'watson' })).toBe('WA')
    expect(avatarFor({ avatar: ' ', display_name: '', username: 'moriarty_1a2b' })).toBe('MO')
    expect(avatarFor(null)).toBe('QU')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('navbar shows the signed-in name', () => {
  it('renders the display name, clearance and XP for a signed-in player', () => {
    const html = renderToStaticMarkup(
      <Navbar user={{ displayName: 'sherlock', xp: 1420, clearance: 'operator' }} />,
    )
    // The desktop sign-out button carries the name (the mobile menu renders only when opened).
    expect(html).toMatch(/class="sq-signout"[^>]*>.*>sherlock<\/span><\/button>/)
    expect(html).toContain('operator')
    expect(html).toContain('1,420')
  })

  it('shows a guest pill and a sign-in link when signed out', () => {
    const html = renderToStaticMarkup(<Navbar user={null} />)
    expect(html).toContain('guest')
    expect(html).toMatch(/Sign in/)
    expect(html).not.toContain('Sign out')
  })

  it('escapes a hostile display name instead of rendering markup', () => {
    const html = renderToStaticMarkup(
      <Navbar user={{ displayName: '<img src=x onerror=alert(1)>', xp: 0, clearance: 'user' }} />,
    )
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('dashboard shows the signed-in name', () => {
  const props = (over: Partial<DashboardViewProps['profile']> = {}, rank: number | null = 12): DashboardViewProps => ({
    profile: {
      displayName: 'sherlock', avatar: 'SH', xp: 1420, streak: 3, rank, levelsCleared: 7,
      clearance: 'operator', nextClearance: 'sudo', clearancePercent: 38, xpToNext: 1080,
      nextClearanceAt: 2500, nextUnlocks: ['Hacker Academy'], ...over,
    },
    achievements: [],
    unlockedIds: [],
    worlds: [],
    recentActivity: [],
    leaderboard: [
      { id: 'a', display_name: 'ada', avatar: 'AD', xp: 5000, rank: 1 },
      { id: 'b', display_name: 'grace', avatar: 'GR', xp: 4000, rank: 2 },
    ],
    currentUserId: 'me',
  })

  it('puts the name in the page heading and the avatar initials beside it', () => {
    const html = renderToStaticMarkup(<DashboardView {...props()} />)
    expect(html).toMatch(/<h1[^>]*>sherlock<\/h1>/)
    expect(html).toMatch(/sq-avatar[^>]*>SH</)
  })

  it('appends the player to the leaderboard as "(you)" when outside the top list', () => {
    const html = renderToStaticMarkup(<DashboardView {...props()} />)
    expect(html).toContain('sherlock (you)')
    expect(html).toContain('#12')
  })

  it('marks the player in place when they are already on the board', () => {
    const p = props({}, 2)
    p.leaderboard[1] = { id: 'me', display_name: 'sherlock', avatar: 'SH', xp: 4000, rank: 2 }
    const html = renderToStaticMarkup(<DashboardView {...p} />)
    expect(html.match(/sherlock \(you\)/g)).toHaveLength(1)
  })
})

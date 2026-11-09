import { redirect } from 'next/navigation'
import { getUser, getDashboardData } from '@/lib/db/queries'
import { worlds, isPlayable } from '@/lib/worlds'
import { getLevelsForAdventure } from '@/lib/data/levels'
import { clearanceForXp, WORLD_CLEARANCE } from '@/lib/xp'
import { displayNameFor, avatarFor } from '@/lib/display-name'
import { summarizeProgress } from '@/lib/progress'
import { recordFor } from '@/lib/server/challenges/service'
import DashboardView from '@/components/dashboard/DashboardView'

export const metadata = { title: 'Dashboard — unrust' }
export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const user = await getUser()
  if (!user) redirect('/login?next=/dashboard')

  const [{ profile, achievements, unlockedIds, progress, leaderboard, rank }, duels] = await Promise.all([
    getDashboardData(user.id),
    recordFor(user.id),
  ])

  // A profile row is auto-created by the DB trigger; guard just in case.
  const xp = profile?.xp ?? 0
  const clr = clearanceForXp(xp)

  const levelCounts = Object.fromEntries(
    worlds.map(a => [a.id, getLevelsForAdventure(a.slug).length || a.chapters]),
  )
  const summary = summarizeProgress(progress, levelCounts)

  // Playable worlds first, then the ones still in build with their clearance gate.
  const worldRows = worlds.map(a => {
    const w = summary.byWorld.get(a.id)
    return {
      id: a.id,
      slug: a.slug,
      title: a.title,
      subtitle: a.subtitle,
      icon: a.icon,
      skill: a.skill,
      estimatedTime: a.estimatedTime,
      levelCount: levelCounts[a.id],
      levelsCleared: w?.levelsCleared ?? 0,
      xpEarned: w?.xpEarned ?? 0,
      status: w?.status ?? 'not_started',
      live: isPlayable(a),
      gate: WORLD_CLEARANCE[a.slug] ?? null,
    }
  })

  const recentActivity = progress.slice(0, 6).map(p => {
    const a = worlds.find(ad => ad.id === p.adventure_id)
    return {
      icon: a?.icon ?? '⚡',
      text:
        p.status === 'completed'
          ? `Cleared level ${p.level_number} of ${a?.title ?? p.adventure_id}`
          : `Started level ${p.level_number} of ${a?.title ?? p.adventure_id}`,
      time: new Date(p.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      xp: p.xp_earned,
    }
  })

  return (
    <DashboardView
      profile={{
        displayName: displayNameFor(profile),
        avatar: avatarFor(profile),
        xp,
        streak: profile?.streak ?? 0,
        rank,
        levelsCleared: summary.levelsCleared,
        clearance: clr.current.title,
        nextClearance: clr.next?.title ?? null,
        clearancePercent: clr.percent,
        xpToNext: clr.xpToNext,
        nextClearanceAt: clr.next?.minXp ?? null,
        nextUnlocks: clr.next?.unlocks ?? clr.current.unlocks,
      }}
      achievements={achievements}
      unlockedIds={unlockedIds}
      worlds={worldRows}
      recentActivity={recentActivity}
      leaderboard={leaderboard}
      currentUserId={user.id}
      duels={duels}
    />
  )
}

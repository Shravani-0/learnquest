import { redirect } from 'next/navigation'
import { getUser, getDashboardData } from '@/lib/db/queries'
import { adventures } from '@/lib/data/adventures'
import { levelFromXp, clearanceForXp } from '@/lib/xp'
import DashboardView from '@/components/dashboard/DashboardView'

export const metadata = { title: 'Dashboard — unrust' }
export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const user = await getUser()
  if (!user) redirect('/login?next=/dashboard')

  const { profile, achievements, unlockedIds, progress, leaderboard, rank, completedAdventures } =
    await getDashboardData(user.id)

  // A profile row is auto-created by the DB trigger; guard just in case.
  const xp = profile?.xp ?? 0
  const lvl = levelFromXp(xp)
  const clr = clearanceForXp(xp)

  // Aggregate per-adventure status + XP from the level-grained progress rows.
  const byAdventure = new Map<string, { status: string; xp: number }>()
  for (const p of progress) {
    const cur = byAdventure.get(p.adventure_id) ?? { status: 'in_progress', xp: 0 }
    cur.xp += p.xp_earned
    if (p.status === 'completed') cur.status = 'completed'
    byAdventure.set(p.adventure_id, cur)
  }

  const adventureCards = adventures.slice(0, 4).map(a => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    icon: a.icon,
    skill: a.skill,
    estimatedTime: a.estimatedTime,
    status: byAdventure.get(a.id)?.status ?? 'not_started',
  }))

  // Skill XP = sum of xp earned across each skill's adventures.
  const skillXp = new Map<string, number>()
  for (const a of adventures) {
    const earned = byAdventure.get(a.id)?.xp ?? 0
    skillXp.set(a.skill, (skillXp.get(a.skill) ?? 0) + earned)
  }
  const skills = [...new Set(adventures.map(a => a.skill))].slice(0, 5).map(name => {
    const sx = skillXp.get(name) ?? 0
    return { name, xp: sx, level: Math.floor(sx / 500), max: 10 }
  })

  const recentActivity = progress.slice(0, 6).map(p => {
    const a = adventures.find(ad => ad.id === p.adventure_id)
    return {
      icon: a?.icon ?? '⚡',
      text:
        p.status === 'completed'
          ? `Completed ${a?.title ?? p.adventure_id}`
          : `Progress on ${a?.title ?? p.adventure_id} — Level ${p.level_number}`,
      time: new Date(p.updated_at).toLocaleDateString(),
      xp: p.xp_earned,
    }
  })

  return (
    <DashboardView
      profile={{
        displayName: profile?.display_name || profile?.username || 'Quester',
        avatar: profile?.avatar || 'YO',
        xp,
        streak: profile?.streak ?? 0,
        level: lvl.level,
        xpIntoLevel: lvl.xpIntoLevel,
        xpForLevel: lvl.xpForLevel,
        percent: lvl.percent,
        rank,
        completedAdventures,
        clearance: clr.current.title,
        nextClearance: clr.next?.title ?? null,
        clearancePercent: clr.percent,
        xpToNext: clr.xpToNext,
        nextUnlocks: clr.next?.unlocks ?? clr.current.unlocks,
      }}
      achievements={achievements}
      unlockedIds={unlockedIds}
      adventures={adventureCards}
      skills={skills}
      recentActivity={recentActivity}
      leaderboard={leaderboard}
      currentUserId={user.id}
    />
  )
}

import { notFound } from 'next/navigation'
import { getAdventureBySlug } from '@/lib/data/adventures'
import { getLevelsForAdventure } from '@/lib/data/levels'
import { getUser } from '@/lib/db/queries'
import { accessibleLevels, completedLevels, TRIAL_LEVEL } from '@/lib/server/quests/access'
import { getOwnership } from '@/lib/server/billing/store'
import { ownsWorld, worldsPlan } from '@/lib/billing/entitlements'
import WorldLevelsPage from '@/components/adventures/WorldLevelsPage'

export const dynamic = 'force-dynamic'

export default async function AdventureSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ unlock?: string }>
}) {
  const { slug } = await params
  const adventure = getAdventureBySlug(slug)
  if (!adventure) notFound()

  const levels = getLevelsForAdventure(slug)
  const user = await getUser()
  const userId = user?.id ?? null
  // Completion and ownership come from the server, never localStorage.
  const [done, owned] = await Promise.all([completedLevels(userId, slug), getOwnership(userId)])
  const open = await accessibleLevels(userId, slug, levels.length, owned)

  const unlockRaw = parseInt((await searchParams).unlock ?? '', 10)
  const unlockLevel = levels.some(l => l.id === unlockRaw) && !open.includes(unlockRaw) ? unlockRaw : null

  return (
    <WorldLevelsPage
      adventure={adventure}
      levels={levels}
      completedLevelIds={done}
      openLevelIds={open}
      isAuthed={!!user}
      trialLevel={TRIAL_LEVEL}
      ownsWorld={ownsWorld(owned, slug)}
      hasPlan={worldsPlan(owned) != null}
      unlockLevel={unlockLevel}
    />
  )
}

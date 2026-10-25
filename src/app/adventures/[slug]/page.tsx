import { notFound } from 'next/navigation'
import { getAdventureBySlug } from '@/lib/data/adventures'
import { getLevelsForAdventure } from '@/lib/data/levels'
import { getUser } from '@/lib/db/queries'
import { completedLevels, TRIAL_LEVEL } from '@/lib/server/quests/access'
import WorldLevelsPage from '@/components/adventures/WorldLevelsPage'

export const dynamic = 'force-dynamic'

export default async function AdventureSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const adventure = getAdventureBySlug(slug)
  if (!adventure) notFound()

  const levels = getLevelsForAdventure(slug)
  const user = await getUser()
  // Completion comes from the server (RLS-protected), never localStorage.
  const done = await completedLevels(user?.id ?? null, slug)

  return (
    <WorldLevelsPage
      adventure={adventure}
      levels={levels}
      completedLevelIds={done}
      isAuthed={!!user}
      trialLevel={TRIAL_LEVEL}
    />
  )
}

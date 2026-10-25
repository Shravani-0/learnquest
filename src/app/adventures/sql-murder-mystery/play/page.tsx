import { notFound, redirect } from 'next/navigation'
import { getAdventureBySlug } from '@/lib/data/adventures'
import { getUser } from '@/lib/db/queries'
import { MYSTERY_COUNT, toClientContent } from '@/lib/server/quests/sql-murder-mystery'
import { TRIAL_LEVEL, unlockedMax } from '@/lib/server/quests/access'
import { GameApp } from '@/components/worlds/sql-murder-mystery/GameApp'

export const dynamic = 'force-dynamic'

export default async function SQLMurderMysteryPlay({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>
}) {
  const adventure = getAdventureBySlug('sql-murder-mystery')
  if (!adventure || adventure.isComingSoon) notFound()

  const sp = await searchParams
  const raw = parseInt(sp.level ?? '1', 10)
  const requested = Math.max(1, Math.min(MYSTERY_COUNT, Number.isNaN(raw) ? 1 : raw))

  const user = await getUser()

  // Anything beyond the free trial requires an account.
  if (requested > TRIAL_LEVEL && !user) {
    redirect(`/login?next=${encodeURIComponent(`/adventures/sql-murder-mystery/play?level=${requested}`)}`)
  }

  // Enforce sequential unlock: bounce a request for a locked case down to the
  // highest one the player has actually unlocked.
  const maxAccessible = await unlockedMax(user?.id ?? null, 'sql-murder-mystery', MYSTERY_COUNT)
  const level = Math.min(requested, maxAccessible)
  if (requested > level) {
    redirect(`/adventures/sql-murder-mystery/play?level=${level}`)
  }

  // Only answer-free presentational content crosses to the browser.
  const content = toClientContent(level)
  return (
    <GameApp
      content={content}
      level={level}
      count={MYSTERY_COUNT}
      isAuthed={!!user}
      trialLevel={TRIAL_LEVEL}
    />
  )
}

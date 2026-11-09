import { notFound, redirect } from 'next/navigation'
import { getAdventureBySlug } from '@/lib/data/adventures'
import { getUser } from '@/lib/db/queries'
import { MYSTERY_COUNT, toClientContent } from '@/lib/server/quests/sql-murder-mystery'
import { canOpenLevel, resolvePlayLevel } from '@/lib/server/quests/access'
import { GameApp } from '@/components/worlds/sql-murder-mystery/GameApp'

export const dynamic = 'force-dynamic'

export default async function SQLMurderMysteryPlay({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>
}) {
  const adventure = getAdventureBySlug('sql-murder-mystery')
  if (!adventure || adventure.isComingSoon) notFound()

  const user = await getUser()
  const userId = user?.id ?? null

  // Free trial levels open for everyone; the rest need sign-in + ownership.
  const entry = await resolvePlayLevel(userId, 'sql-murder-mystery', MYSTERY_COUNT, (await searchParams).level)
  if ('redirect' in entry) redirect(entry.redirect)
  const { level } = entry

  const nextOpen = level < MYSTERY_COUNT && (await canOpenLevel(userId, 'sql-murder-mystery', level + 1))

  // Only answer-free presentational content crosses to the browser.
  const content = toClientContent(level)
  return (
    <GameApp
      content={content}
      level={level}
      count={MYSTERY_COUNT}
      isAuthed={!!user}
      nextOpen={nextOpen}
    />
  )
}

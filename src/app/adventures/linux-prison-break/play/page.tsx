import { notFound, redirect } from 'next/navigation'
import { getAdventureBySlug } from '@/lib/data/adventures'
import { getUser } from '@/lib/db/queries'
import { LINUX_CONTENT, LINUX_COUNT } from '@/lib/server/quests/linux-prison-break'
import { resolvePlayLevel } from '@/lib/server/quests/access'
import { GameApp } from '@/components/worlds/linux-prison-break/GameApp'

export const dynamic = 'force-dynamic'

export default async function LinuxPrisonBreakPlay({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>
}) {
  const adventure = getAdventureBySlug('linux-prison-break')
  // A "coming soon" world is a locked world — not enterable.
  if (!adventure || adventure.isComingSoon) notFound()

  const user = await getUser()
  // ?level= opens that level if the player may; otherwise resume at the first
  // open level they haven't cleared (fresh and anonymous players start at 1).
  const entry = await resolvePlayLevel(user?.id ?? null, 'linux-prison-break', LINUX_COUNT, (await searchParams).level)
  if ('redirect' in entry) redirect(entry.redirect)

  return <GameApp levels={LINUX_CONTENT} startLevel={entry.level} isAuthed={!!user} />
}

import { notFound } from 'next/navigation'
import { getAdventureBySlug } from '@/lib/data/adventures'
import { getUser } from '@/lib/db/queries'
import { LINUX_CONTENT, LINUX_COUNT } from '@/lib/server/quests/linux-prison-break'
import { resumeLevel } from '@/lib/server/quests/access'
import { GameApp } from '@/components/worlds/linux-prison-break/GameApp'

export const dynamic = 'force-dynamic'

export default async function LinuxPrisonBreakPlay() {
  const adventure = getAdventureBySlug('linux-prison-break')
  // A "coming soon" world is a locked world — not enterable.
  if (!adventure || adventure.isComingSoon) notFound()

  const user = await getUser()
  // Resume at the first not-yet-cleared level the player is allowed into.
  // Fresh and anonymous players start at level 1 (the beginning of the trial).
  const startLevel = await resumeLevel(user?.id ?? null, 'linux-prison-break', LINUX_COUNT)

  return <GameApp levels={LINUX_CONTENT} startLevel={startLevel} isAuthed={!!user} />
}

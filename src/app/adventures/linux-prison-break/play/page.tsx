import { notFound } from 'next/navigation'
import { getAdventureBySlug } from '@/lib/data/adventures'
import { GameApp } from '@/components/worlds/linux-prison-break/GameApp'

export default function LinuxPrisonBreakPlay() {
  const adventure = getAdventureBySlug('linux-prison-break')
  if (!adventure || adventure.isComingSoon) notFound()
  return <GameApp />
}

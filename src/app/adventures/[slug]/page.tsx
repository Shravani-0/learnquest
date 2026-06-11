import { notFound } from 'next/navigation'
import { adventures, getAdventureBySlug } from '@/lib/data/adventures'
import { getLevelsForAdventure } from '@/lib/data/levels'
import WorldLevelsPage from '@/components/adventures/WorldLevelsPage'

export async function generateStaticParams() {
  return adventures.map(a => ({ slug: a.slug }))
}

export default async function AdventureSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const adventure = getAdventureBySlug(slug)
  if (!adventure) notFound()
  const levels = getLevelsForAdventure(slug)
  return <WorldLevelsPage adventure={adventure} levels={levels} />
}

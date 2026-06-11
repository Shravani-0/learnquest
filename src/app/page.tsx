import Hero from '@/components/home/Hero'
import WorldsCarousel from '@/components/home/WorldsCarousel'
import Stats from '@/components/home/Stats'
import HowItWorks from '@/components/home/HowItWorks'
import Community from '@/components/home/Community'
import TargetCursor from '@/components/ui/TargetCursor'

export default function HomePage() {
  return (
    <>
      <TargetCursor />
      <Hero />
      <WorldsCarousel />
      <Stats />
      <HowItWorks />
      <Community />
    </>
  )
}

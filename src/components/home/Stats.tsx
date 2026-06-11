'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { TrendingUp, Award, Users, BookOpen } from 'lucide-react'

function useCounter(target: number, duration: number, inView: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(target * ease))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, inView])
  return count
}

const stats = [
  { icon: Users, value: 18420, suffix: '+', label: 'Active Learners', description: 'Learners completing adventures every month', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { icon: BookOpen, value: 6, suffix: '', label: 'Adventure Worlds', description: 'Fully playable story-driven learning worlds', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { icon: TrendingUp, value: 95, suffix: '%', label: 'Completion Rate', description: 'Players who start finish their first adventure', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  { icon: Award, value: 50, suffix: '+', label: 'Skills Covered', description: 'Concepts taught through hands-on gameplay', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
]

function StatCard({ stat, inView }: { stat: typeof stats[0]; inView: boolean }) {
  const count = useCounter(stat.value, 2000, inView)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`p-6 rounded-2xl bg-quest-surface border ${stat.border} flex flex-col gap-4`}
    >
      <div className={`w-11 h-11 rounded-xl ${stat.bg} border ${stat.border} flex items-center justify-center`}>
        <stat.icon className={`w-5 h-5 ${stat.color}`} />
      </div>
      <div>
        <div className={`text-3xl font-black ${stat.color}`}>
          {count.toLocaleString()}{stat.suffix}
        </div>
        <div className="text-sm font-semibold text-quest-text mt-0.5">{stat.label}</div>
        <p className="text-xs text-quest-text-3 mt-1 leading-relaxed">{stat.description}</p>
      </div>
    </motion.div>
  )
}

export default function Stats() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  return (
    <section ref={ref} className="py-20 relative border-t border-quest-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-xs font-semibold tracking-widest text-purple-400 uppercase mb-4">By The Numbers</p>
          <h2 className="text-4xl font-black tracking-tight">
            The proof is in the{' '}
            <span className="gradient-text">data</span>
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map(stat => (
            <StatCard key={stat.label} stat={stat} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  )
}

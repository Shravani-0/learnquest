'use client'

import { motion } from 'framer-motion'
import { Map, Gamepad2, Zap, Trophy } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: Map,
    title: 'Pick a World',
    description: 'SQL, Linux, or Git. Each world is a self-contained story — pick the skill you want and dive straight in.',
    accent: '#FF3C3C',
    bg:     'rgba(255,60,60,0.08)',
    border: 'rgba(255,60,60,0.22)',
  },
  {
    number: '02',
    icon: Gamepad2,
    title: 'Play the Story',
    description: 'Every query, command, or commit is a move in the game — not a homework assignment. Context makes it stick.',
    accent: '#00A0E0',
    bg:     'rgba(0,160,224,0.08)',
    border: 'rgba(0,160,224,0.22)',
  },
  {
    number: '03',
    icon: Zap,
    title: 'Earn XP',
    description: 'Complete challenges, collect XP, and unlock achievements. Progress is visible and immediately rewarding.',
    accent: '#22c55e',
    bg:     'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.22)',
  },
  {
    number: '04',
    icon: Trophy,
    title: 'Keep the Skill',
    description: 'Finish with a skill you actually used — not a certificate saying you watched a video.',
    accent: '#F5C418',
    bg:     'rgba(245,196,24,0.08)',
    border: 'rgba(245,196,24,0.22)',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 border-t border-[#2A2A2A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-[3px] h-4 rounded-full bg-[#FF3C3C]" />
            <p className="text-[11px] font-black tracking-[0.24em] uppercase text-[#FF3C3C]">How It Works</p>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            Play. Learn. Repeat.
          </h2>
        </motion.div>

        {/* Step cards — tactile bordered panels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.09 }}
            >
              <div
                className="h-full flex flex-col p-6 rounded-2xl bg-[#1E1E1E] border transition-all duration-200 hover:-translate-y-[3px]"
                style={{ borderColor: step.border }}
              >
                {/* Step number */}
                <p className="text-[10px] font-mono font-black text-[#606060] tracking-[0.22em] mb-4">
                  {step.number}
                </p>

                {/* Icon badge */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 shrink-0 border"
                  style={{ background: step.bg, borderColor: step.border }}
                >
                  <step.icon className="w-5 h-5" style={{ color: step.accent }} />
                </div>

                {/* Text */}
                <h3 className="text-[13px] font-black text-white mb-2">{step.title}</h3>
                <p className="text-sm text-[#A0A0A0] leading-relaxed">{step.description}</p>

                {/* Accent bottom line */}
                <div className="mt-5 h-[2px] rounded-full w-8" style={{ background: step.accent }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

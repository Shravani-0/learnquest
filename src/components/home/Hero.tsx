'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Play, ChevronDown } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-[#121212]">

      {/* ── Layer 1: Shifting grid ───────────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-grid-pattern animate-grid-shift"
        style={{ backgroundSize: '60px 60px', opacity: 0.28 }}
      />

      {/* ── Layer 2: Ambient color temperature (very low opacity, large blur) ── */}
      {/*   Red pulse — top-left quadrant */}
      <div
        className="absolute animate-radial-pulse pointer-events-none"
        style={{
          top: '22%', left: '20%',
          width: '640px', height: '640px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,60,60,0.10) 0%, transparent 70%)',
          filter: 'blur(60px)',
          transform: 'translate(-50%, -50%)',
        }}
      />
      {/*   Blue pulse — bottom-right quadrant */}
      <div
        className="absolute animate-radial-pulse pointer-events-none"
        style={{
          bottom: '18%', right: '18%',
          width: '560px', height: '560px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,160,224,0.09) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animationDelay: '2.5s',
          transform: 'translate(50%, 50%)',
        }}
      />

      {/* ── Layer 3: Center vignette (spotlight on name) ─────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 55% at 50% 50%, transparent 0%, #121212 72%)',
        }}
      />

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">

        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[11px] font-mono tracking-[0.28em] uppercase text-[#606060] mb-8 select-none"
        >
          3 Worlds · Real Skills · Free to Play
        </motion.p>

        {/* ── Brand name ── */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-black tracking-tighter leading-none mb-8 select-none"
          style={{ fontSize: 'clamp(4.5rem, 15vw, 11rem)' }}
        >
          <span className="text-white">Skill</span>
          {/* "Quest" gets the animated shimmer gradient */}
          <span className="text-shimmer-red">Quest</span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28 }}
          className="text-[#A0A0A0] text-base sm:text-lg leading-relaxed mb-10 max-w-md"
        >
          SQL, Linux, and Git — taught through story-driven adventures.
          <br className="hidden sm:block" />
          Solve mysteries, escape prisons, fix broken timelines.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.42 }}
          className="flex flex-wrap gap-3 justify-center"
        >
          <Link
            href="/adventures"
            className="btn-tactile-red px-8 py-3.5 text-[15px] cursor-target"
          >
            <Play className="w-4 h-4 fill-current shrink-0" />
            Start Playing Free
          </Link>
          <Link
            href="#adventures"
            className="btn-tactile-dark px-8 py-3.5 text-[15px] cursor-target"
          >
            Browse Worlds
          </Link>
        </motion.div>

        {/* Skill chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.62 }}
          className="flex items-center gap-2 mt-10"
        >
          {['SQL', 'Linux', 'Git'].map((skill, i) => (
            <span
              key={skill}
              className="px-3 py-1 rounded-full bg-[#1E1E1E] border border-[#2A2A2A] text-[11px] font-bold text-[#606060]"
              style={{ animationDelay: `${0.7 + i * 0.08}s` }}
            >
              {skill}
            </span>
          ))}
          <span className="text-[11px] text-[#3A3A3A] font-mono ml-1">+3 more soon</span>
        </motion.div>

        {/* Social proof strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.78 }}
          className="flex items-center gap-6 mt-12 px-6 py-3.5 rounded-2xl bg-[#181818] border border-[#2A2A2A]"
        >
          {[
            { value: '18K+', label: 'Learners' },
            { value: '3',    label: 'Worlds' },
            { value: '95%',  label: 'Finish Rate' },
          ].map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-6">
              {i > 0 && <div className="w-px h-6 bg-[#2A2A2A]" />}
              <div className="text-center">
                <p className="text-sm font-black text-white">{stat.value}</p>
                <p className="text-[10px] font-mono text-[#606060] mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Scroll indicator ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.0 }}
        className="absolute bottom-8 flex flex-col items-center gap-1.5"
      >
        <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#3A3A3A]">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="w-4 h-4 text-[#3A3A3A]" />
        </motion.div>
      </motion.div>

      {/* Bottom divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-[#2A2A2A]" />
    </section>
  )
}

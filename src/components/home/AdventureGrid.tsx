'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, Lock, Play, Star, Users, BookOpen, ChevronRight, Zap } from 'lucide-react'
import { adventures } from '@/lib/data/adventures'
import type { Adventure } from '@/lib/types'

/* ════════════════════════════════════════════════════════════════════════════
   CSS-ART CARD THUMBNAILS
════════════════════════════════════════════════════════════════════════════ */

function SQLThumbnail() {
  return (
    <div className="absolute inset-0 bg-[#1C1510] overflow-hidden select-none">
      <div
        className="absolute inset-0 opacity-[0.09]"
        style={{
          backgroundImage: [
            'repeating-linear-gradient(90deg, #C8A87A 0, #C8A87A 1px, transparent 0, transparent 26px)',
            'repeating-linear-gradient(0deg,  #C8A87A 0, #C8A87A 1px, transparent 0, transparent 26px)',
          ].join(', '),
        }}
      />
      <div className="absolute top-[40%] inset-x-0 -rotate-[6deg] bg-[#F5C418] py-[4px]">
        <p className="text-center text-[6px] font-black text-black tracking-[0.1em] uppercase">
          Crime Scene — Do Not Cross
        </p>
      </div>
      <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-[#080705] to-transparent" />
      <span className="absolute top-3 right-3 text-2xl opacity-75">🔍</span>
      <p className="absolute bottom-2.5 left-3 text-[8px] font-mono text-[#8B7355]">SQL City · 2018</p>
    </div>
  )
}

function LinuxThumbnail() {
  return (
    <div className="absolute inset-0 bg-[#020A02] overflow-hidden select-none font-mono">
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: [
            'repeating-linear-gradient(90deg, #00CC33 0, #00CC33 1px, transparent 0, transparent 22px)',
            'repeating-linear-gradient(0deg,  #00CC33 0, #00CC33 1px, transparent 0, transparent 22px)',
          ].join(', '),
        }}
      />
      <div className="absolute inset-0 p-4 flex flex-col gap-[5px] justify-center">
        <div className="flex items-center gap-1.5">
          <span className="text-[#00CC33] text-[9px]">$</span>
          <span className="text-[#00CC33] text-[9px]">ls -la /prison/cell42</span>
        </div>
        <div className="text-[8px] text-[#00CC33]/45 pl-4 leading-[1.6]">
          drwxr-xr-x  cell42/<br />
          -rw-r--r--  clue.txt<br />
          -rwxr-xr-x  escape.sh
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[#00CC33] text-[9px]">$</span>
          <span className="text-[#00CC33] text-[9px]">cat clue.txt</span>
          <span className="inline-block w-[5px] h-[11px] bg-[#00CC33] ml-0.5 animate-cursor-blink" />
        </div>
      </div>
      <span className="absolute top-3 right-3 text-2xl opacity-65">🔐</span>
    </div>
  )
}

function GitThumbnail() {
  return (
    <div className="absolute inset-0 bg-[#07090F] overflow-hidden select-none flex items-center justify-center p-4">
      <svg viewBox="0 0 160 72" className="w-full h-full" style={{ maxHeight: '100px' }}>
        <line x1="12" y1="48" x2="148" y2="48" stroke="#00A0E0" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M52,48 Q60,48 70,26 L110,26" stroke="#FF3C3C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M110,26 Q120,26 130,48" stroke="#FF3C3C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {[12, 52, 148].map(x => (
          <circle key={x} cx={x} cy={48} r={5} fill="#00A0E0" stroke="#07090F" strokeWidth="2.5" />
        ))}
        {[70, 91, 110].map(x => (
          <circle key={x} cx={x} cy={26} r={4.5} fill="#FF3C3C" stroke="#07090F" strokeWidth="2.5" />
        ))}
        <circle cx={130} cy={48} r={5} fill="#22c55e" stroke="#07090F" strokeWidth="2.5" />
        <text x={12}  y={62} fill="#00A0E0" fontSize="6.5" textAnchor="middle" fontFamily="monospace">init</text>
        <text x={91}  y={19} fill="#FF3C3C" fontSize="6.5" textAnchor="middle" fontFamily="monospace">feature</text>
        <text x={130} y={62} fill="#22c55e" fontSize="6.5" textAnchor="middle" fontFamily="monospace">merge</text>
      </svg>
      <span className="absolute top-3 right-3 text-2xl opacity-65">⏳</span>
    </div>
  )
}

const thumbnailMap: Record<string, React.ComponentType> = {
  'sql-murder-mystery': SQLThumbnail,
  'linux-prison-break': LinuxThumbnail,
  'git-time-traveler':  GitThumbnail,
}

const diffStyle: Record<string, { color: string; bg: string; border: string }> = {
  Beginner:     { color: '#4CAF50', bg: 'rgba(76,175,80,0.10)',   border: 'rgba(76,175,80,0.28)' },
  Intermediate: { color: '#00A0E0', bg: 'rgba(0,160,224,0.10)',   border: 'rgba(0,160,224,0.28)' },
  Advanced:     { color: '#FF9800', bg: 'rgba(255,152,0,0.10)',    border: 'rgba(255,152,0,0.28)' },
  Expert:       { color: '#FF3C3C', bg: 'rgba(255,60,60,0.10)',    border: 'rgba(255,60,60,0.28)' },
}

/* ════════════════════════════════════════════════════════════════════════════
   FULL-WIDTH GAME CARD
════════════════════════════════════════════════════════════════════════════ */
function GameCard({ adventure }: { adventure: Adventure }) {
  const Thumb = thumbnailMap[adventure.slug]
  const diff  = diffStyle[adventure.difficulty] ?? diffStyle.Beginner

  return (
    <Link href={`/adventures/${adventure.slug}`} className="block h-full cursor-target">
      <div className="group relative flex flex-col h-full rounded-2xl bg-[#1E1E1E] border border-[#2A2A2A] overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-[#3A3A3A] hover:shadow-[0_20px_60px_rgba(0,0,0,0.7)]">

        {/* Thumbnail */}
        <div className="relative h-[180px] shrink-0 overflow-hidden">
          {Thumb && <Thumb />}

          {/* Play overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-black">
              <Play className="w-4 h-4 fill-current" />
              Play Now
            </div>
          </div>

          {/* XP badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/70 border border-white/10 text-[10px] font-black font-mono text-white">
            <Zap className="w-2.5 h-2.5 text-yellow-400" />
            +{adventure.xpReward} XP
          </div>

          {/* Status badge */}
          {adventure.isPopular && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[#FF3C3C]/20 border border-[#FF3C3C]/40 text-[10px] font-black text-[#FF3C3C] uppercase tracking-wider">
              Popular
            </div>
          )}
          {adventure.isNew && !adventure.isPopular && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[#22c55e]/20 border border-[#22c55e]/40 text-[10px] font-black text-[#22c55e] uppercase tracking-wider">
              New
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="flex flex-col flex-1 p-5">

          {/* Genre · Skill */}
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#606060] mb-2">
            {adventure.genre} · {adventure.skill}
          </p>

          {/* Title */}
          <h3 className="text-base font-black text-[#F0F0F0] leading-snug mb-1.5 group-hover:text-white transition-colors">
            {adventure.title}
          </h3>

          {/* Subtitle */}
          <p className="text-[12px] text-[#707070] leading-relaxed mb-4">
            {adventure.subtitle}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-3.5 mb-4 text-[#606060]">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
              <span className="text-[11px] font-semibold text-[#A0A0A0]">{adventure.rating.toFixed(1)}</span>
            </div>
            <div className="w-px h-3 bg-[#2A2A2A]" />
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 shrink-0" />
              <span className="text-[11px]">{adventure.completedBy.toLocaleString()} played</span>
            </div>
            <div className="w-px h-3 bg-[#2A2A2A]" />
            <div className="flex items-center gap-1">
              <BookOpen className="w-3 h-3 shrink-0" />
              <span className="text-[11px]">{adventure.chapters} chapters</span>
            </div>
          </div>

          {/* Concept tags */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {adventure.concepts.slice(0, 4).map(concept => (
              <span
                key={concept}
                className="px-2 py-0.5 rounded-md bg-[#252525] border border-[#303030] text-[10px] font-mono text-[#606060]"
              >
                {concept}
              </span>
            ))}
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-1 rounded-lg text-[10px] font-black border"
                style={diff}
              >
                {adventure.difficulty}
              </span>
              <div className="flex items-center gap-1 text-[#606060]">
                <Clock className="w-3 h-3 shrink-0" />
                <span className="text-[11px]">{adventure.estimatedTime}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#606060] group-hover:text-[#FF3C3C] transition-colors">
              Start <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Progress bar edge */}
        <div className="h-[3px] w-full bg-[#2A2A2A] shrink-0" />
      </div>
    </Link>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPACT LOCKED CARD
════════════════════════════════════════════════════════════════════════════ */
function LockedCard({ adventure }: { adventure: Adventure }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#181818] border border-[#222222] opacity-50 cursor-not-allowed select-none">
      <div className="w-12 h-12 rounded-xl bg-[#111111] flex items-center justify-center shrink-0">
        <span className="text-2xl grayscale opacity-40">{adventure.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3A3A3A] mb-0.5">{adventure.skill}</p>
        <p className="text-[13px] font-black text-[#3A3A3A] truncate">{adventure.title}</p>
        <p className="text-[11px] text-[#2A2A2A] mt-0.5">{adventure.estimatedTime}</p>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1E1E1E] border border-[#2A2A2A] shrink-0">
        <Lock className="w-3 h-3 text-[#3A3A3A]" />
        <span className="text-[9px] font-black text-[#3A3A3A] uppercase tracking-wider">Soon</span>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION ROOT
════════════════════════════════════════════════════════════════════════════ */
export default function AdventureGrid() {
  const unlocked = adventures.filter(a => !a.isComingSoon)
  const locked   = adventures.filter(a => a.isComingSoon)

  return (
    <section id="adventures" className="py-16 border-t border-[#2A2A2A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
        >
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-[3px] h-4 rounded-full bg-[#FF3C3C]" />
              <p className="text-[11px] font-black tracking-[0.24em] uppercase text-[#FF3C3C]">Available Now</p>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Choose Your World
            </h2>
            <p className="text-[#606060] text-sm mt-2">3 story-driven adventures · free to play</p>
          </div>
          <Link
            href="/adventures"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1E1E1E] border border-[#2A2A2A] text-[12px] font-bold text-[#A0A0A0] hover:text-white hover:border-[#3A3A3A] transition-all duration-150 shrink-0 self-start sm:self-auto"
          >
            See all quests <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

        {/* Full-width 3-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {unlocked.map((adventure, i) => (
            <motion.div
              key={adventure.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className="h-full"
            >
              <GameCard adventure={adventure} />
            </motion.div>
          ))}
        </div>

        {/* Coming Soon */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-[3px] h-4 rounded-full bg-[#3A3A3A]" />
            <p className="text-[11px] font-black tracking-[0.24em] uppercase text-[#3A3A3A]">Coming Soon</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {locked.map((adventure, i) => (
              <motion.div
                key={adventure.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <LockedCard adventure={adventure} />
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  )
}

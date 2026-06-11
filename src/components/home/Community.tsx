'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Trophy, Flame, Zap, ChevronRight, Crown } from 'lucide-react'
import { leaderboard } from '@/lib/data/achievements'

const rankColors = ['text-amber-400', 'text-slate-300', 'text-orange-600']
const rankBgs = ['bg-amber-500/10 border-amber-500/20', 'bg-slate-500/10 border-slate-500/20', 'bg-orange-600/10 border-orange-600/20']

export default function Community() {
  return (
    <section id="community" className="py-24 relative border-t border-quest-border/40">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs font-semibold tracking-widest text-purple-400 uppercase mb-4">Community</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-6">
              Compete with the{' '}
              <span className="gradient-text">best.</span>
            </h2>
            <p className="text-quest-text-2 text-lg leading-relaxed mb-8">
              Every adventure you complete earns XP and a spot on the global leaderboard. Learn alongside thousands of developers, analysts, and engineers.
            </p>

            {/* Feature pills */}
            <div className="space-y-3 mb-10">
              {[
                { icon: Zap, text: 'Earn XP for every challenge completed', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
                { icon: Flame, text: 'Build streaks to multiply your XP gains', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                { icon: Trophy, text: 'Unlock rare achievements and exclusive badges', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg border ${item.bg} flex items-center justify-center shrink-0`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <span className="text-sm text-quest-text-2">{item.text}</span>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all duration-200 shadow-glow-purple"
            >
              <Crown className="w-4 h-4" />
              Join the Leaderboard
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Right: Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="rounded-2xl bg-quest-surface border border-quest-border overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-quest-border/60">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-quest-text">Global Leaderboard</span>
                </div>
                <span className="text-xs text-quest-text-3">All Time</span>
              </div>

              {/* Top 3 */}
              <div className="grid grid-cols-3 gap-3 p-4 border-b border-quest-border/60">
                {leaderboard.slice(0, 3).map((entry, i) => (
                  <div key={entry.username} className={`flex flex-col items-center p-3 rounded-xl border ${rankBgs[i]}`}>
                    <div className="relative mb-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: `hsl(${(i * 80 + 240) % 360}deg 55% 40%)` }}
                      >
                        {entry.avatar}
                      </div>
                      <div className={`absolute -top-1 -right-1 text-xs`}>{entry.badge}</div>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-semibold text-quest-text truncate w-full">{entry.displayName}</p>
                      <p className={`text-xs font-bold ${rankColors[i]} mt-0.5`}>#{i + 1}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rest */}
              <div className="divide-y divide-quest-border/40">
                {leaderboard.slice(3, 8).map(entry => (
                  <div key={entry.username} className="flex items-center gap-3 px-5 py-3 hover:bg-quest-surface-2/50 transition-colors">
                    <span className="text-xs font-mono text-quest-text-3 w-5 text-center">#{entry.rank}</span>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: `hsl(${(entry.rank * 47 + 180) % 360}deg 50% 38%)` }}
                    >
                      {entry.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-quest-text truncate">{entry.displayName}</p>
                      <p className="text-[10px] text-quest-text-3">Lv. {entry.level}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-semibold text-purple-400">{entry.xp.toLocaleString()} XP</p>
                      <div className="flex items-center justify-end gap-0.5 mt-0.5">
                        <Flame className="w-2.5 h-2.5 text-amber-400" />
                        <p className="text-[10px] text-quest-text-3">{entry.streak}d</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 border-t border-quest-border/60">
                <Link href="/dashboard" className="flex items-center justify-center gap-1 text-xs text-quest-text-3 hover:text-quest-text transition-colors">
                  View full leaderboard <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

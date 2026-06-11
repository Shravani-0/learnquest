'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, Users, Star, ChevronRight, Flame, Sparkles, Filter, Search, Trophy, Zap } from 'lucide-react'
import { adventures } from '@/lib/data/adventures'
import type { Difficulty, SkillCategory } from '@/lib/types'
import { cn } from '@/lib/cn'

const difficultyColors = {
  Beginner: 'text-green-400 bg-green-500/10 border-green-500/20',
  Intermediate: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Advanced: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Expert: 'text-red-400 bg-red-500/10 border-red-500/20',
}

const skills: SkillCategory[] = ['SQL', 'Linux', 'Git', 'Cybersecurity', 'JavaScript', 'Data Analysis']
const difficulties: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

export default function AdventuresPage() {
  const [search, setSearch] = useState('')
  const [filterSkill, setFilterSkill] = useState<SkillCategory | 'All'>('All')
  const [filterDiff, setFilterDiff] = useState<Difficulty | 'All'>('All')

  const filtered = adventures.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase())
    const matchSkill = filterSkill === 'All' || a.skill === filterSkill
    const matchDiff = filterDiff === 'All' || a.difficulty === filterDiff
    return matchSearch && matchSkill && matchDiff
  })

  return (
    <div className="min-h-screen bg-quest-bg">
      {/* Hero */}
      <div className="relative border-b border-quest-border/40 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF3C3C]/5 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#FF3C3C]/4 blur-[100px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <p className="text-xs font-black tracking-[0.24em] text-[#FF3C3C] uppercase mb-3">All Adventures</p>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
              Choose Your{' '}
              <span className="gradient-text">Adventure</span>
            </h1>
            <p className="text-quest-text-2 text-lg mb-8">
              Six worlds. Dozens of challenges. One goal: master skills that matter.
            </p>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-quest-text-3" />
              <input
                type="text"
                placeholder="Search adventures..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-xl bg-quest-surface border border-quest-border text-quest-text text-sm placeholder:text-quest-text-3 focus:outline-none focus:border-[#FF3C3C]/40 transition-colors shadow-[0_3px_0_#0A0A0A]"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex items-center gap-2 text-xs text-quest-text-3">
            <Filter className="w-3.5 h-3.5" />
            Filter by:
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterSkill('All')}
              className={cn('px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                filterSkill === 'All' ? 'bg-[#FF3C3C]/12 border-[#FF3C3C]/30 text-[#FF3C3C] shadow-[0_2px_0_#881A1A]' : 'border-quest-border text-quest-text-3 hover:text-quest-text hover:border-quest-border-2 shadow-[0_2px_0_#0A0A0A]'
              )}
            >
              All Skills
            </button>
            {skills.map(s => (
              <button
                key={s}
                onClick={() => setFilterSkill(filterSkill === s ? 'All' : s)}
                className={cn('px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                  filterSkill === s ? 'bg-[#FF3C3C]/12 border-[#FF3C3C]/30 text-[#FF3C3C] shadow-[0_2px_0_#881A1A]' : 'border-quest-border text-quest-text-3 hover:text-quest-text hover:border-quest-border-2 shadow-[0_2px_0_#0A0A0A]'
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-quest-border hidden sm:block" />

          <div className="flex flex-wrap gap-2">
            {difficulties.map(d => (
              <button
                key={d}
                onClick={() => setFilterDiff(filterDiff === d ? 'All' : d)}
                className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  filterDiff === d ? `${difficultyColors[d]} !bg-opacity-20` : 'border-quest-border text-quest-text-3 hover:text-quest-text hover:border-quest-border-2'
                )}
              >
                {d}
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs text-quest-text-3 font-mono">
            {filtered.length} adventure{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((adventure, i) => (
            <motion.div
              key={adventure.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              layout
            >
              <Link href={`/adventures/${adventure.slug}`}>
                <div className={cn(
                  'group relative flex flex-col h-full p-6 rounded-2xl bg-quest-surface border border-quest-border transition-all duration-300 hover:-translate-y-1 cursor-pointer',
                  adventure.color === 'amber' && 'hover:border-amber-500/40 hover:shadow-glow-amber',
                  adventure.color === 'cyan' && 'hover:border-cyan-500/40 hover:shadow-glow-cyan',
                  adventure.color === 'blue' && 'hover:border-blue-500/40 hover:shadow-glow-blue',
                  adventure.color === 'purple' && 'hover:border-purple-500/40 hover:shadow-glow-purple',
                  adventure.color === 'red' && 'hover:border-red-500/40',
                )}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-3xl">{adventure.icon}</div>
                    <div className="flex items-center gap-1.5">
                      {adventure.isNew && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-semibold">
                          <Sparkles className="w-2.5 h-2.5" /> New
                        </span>
                      )}
                      {adventure.isPopular && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold">
                          <Flame className="w-2.5 h-2.5" /> Popular
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-quest-text-3 uppercase tracking-wider mb-1">
                      {adventure.genre} · {adventure.skill}
                    </p>
                    <h3 className="text-lg font-bold text-quest-text group-hover:text-white transition-colors">
                      {adventure.title}
                    </h3>
                    <p className="text-xs text-quest-text-3 mt-0.5 italic">{adventure.subtitle}</p>
                  </div>

                  <p className="text-sm text-quest-text-2 leading-relaxed mb-4 flex-1">{adventure.description}</p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {adventure.concepts.slice(0, 4).map(c => (
                      <span key={c} className="px-2 py-0.5 rounded bg-quest-surface-2 border border-quest-border text-[10px] font-mono text-quest-text-3">{c}</span>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3 py-3 border-t border-quest-border/60 mb-3 text-center">
                    <div>
                      <p className="text-[10px] text-quest-text-3 mb-0.5">Time</p>
                      <p className="text-xs font-semibold text-quest-text-2 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" /> {adventure.estimatedTime.split('-')[0]}m
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-quest-text-3 mb-0.5">Reward</p>
                      <p className="text-xs font-black text-[#F5C418] flex items-center justify-center gap-1 font-mono">
                        <Zap className="w-3 h-3" /> {adventure.xpReward}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-quest-text-3 mb-0.5">Rating</p>
                      <p className="text-xs font-semibold text-amber-400 flex items-center justify-center gap-1">
                        <Star className="w-3 h-3 fill-current" /> {adventure.rating}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full border', difficultyColors[adventure.difficulty])}>
                      {adventure.difficulty}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-quest-text-3">
                      <Users className="w-3 h-3" />
                      {(adventure.completedBy / 1000).toFixed(1)}K
                    </div>
                  </div>

                  {!adventure.isComingSoon && (
                    <div className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-[#FF3C3C] px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-black text-white shadow-[0_4px_0_#881A1A]">
                        Play Now
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-quest-text-3 text-lg mb-2">No adventures found</p>
            <button onClick={() => { setSearch(''); setFilterSkill('All'); setFilterDiff('All') }} className="text-sm text-[#FF3C3C] hover:text-[#FF7070] font-bold transition-colors">
              Clear filters
            </button>
          </div>
        )}

        {/* Coming soon */}
        <div className="mt-12 p-8 rounded-2xl border border-dashed border-quest-border text-center">
          <Trophy className="w-8 h-8 text-quest-text-3 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-quest-text mb-1">More worlds coming soon</h3>
          <p className="text-xs text-quest-text-3">Python Data Heist · Docker Container Escape · Kubernetes Galaxy War</p>
        </div>
      </div>
    </div>
  )
}

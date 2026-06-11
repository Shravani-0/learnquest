'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Zap, Flame, Trophy, Star, ChevronRight, CheckCircle2,
  TrendingUp, Clock, Target, BookOpen, Award, Play
} from 'lucide-react'
import { mockUserProfile, achievements, leaderboard } from '@/lib/data/achievements'
import { adventures } from '@/lib/data/adventures'
import { cn } from '@/lib/cn'

const rarityColors = {
  common:    'border-[#3A3A3A] bg-[#252525] text-[#A0A0A0]',
  rare:      'border-[#00A0E0]/30 bg-[#00A0E0]/8 text-[#00A0E0]',
  epic:      'border-[#FF3C3C]/30 bg-[#FF3C3C]/8 text-[#FF7070]',
  legendary: 'border-[#F5C418]/30 bg-[#F5C418]/8 text-[#F5C418]',
}

const skills = [
  { name: 'SQL',           level: 4, max: 10, color: '#F5C418', xp: 1200 },
  { name: 'Linux',         level: 2, max: 10, color: '#00A0E0', xp: 450  },
  { name: 'Git',           level: 1, max: 10, color: '#00A0E0', xp: 200  },
  { name: 'JavaScript',    level: 1, max: 10, color: '#F5C418', xp: 150  },
  { name: 'Cybersecurity', level: 0, max: 10, color: '#FF3C3C', xp: 0    },
]

const recentActivity = [
  { icon: '🔍', text: 'Completed SQL Murder Mystery',     time: '2 days ago', xp: 500, type: 'complete'    },
  { icon: '⚡', text: 'Solved Chapter 4: JOIN queries',   time: '2 days ago', xp: 150, type: 'progress'    },
  { icon: '🔥', text: 'Streak extended to 5 days',        time: '1 day ago',  xp: 50,  type: 'streak'      },
  { icon: '🏆', text: 'Achievement unlocked: Case Closed',time: '2 days ago', xp: 500, type: 'achievement' },
  { icon: '🔐', text: 'Started Linux Prison Break',       time: 'today',      xp: 50,  type: 'start'       },
]

export default function Dashboard() {
  const user = mockUserProfile
  const xpPercent = Math.round((user.xp / user.xpToNextLevel) * 100)
  const unlockedAchievements = achievements.filter(a => user.achievements.includes(a.id))
  const lockedAchievements   = achievements.filter(a => !user.achievements.includes(a.id))

  return (
    <div className="min-h-screen bg-quest-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center gap-6 mb-10"
        >
          {/* Avatar */}
          <div className="relative">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
              style={{ background: 'linear-gradient(135deg, #FF3C3C, #00A0E0)', boxShadow: '0 4px 0 #881A1A' }}
            >
              {user.avatar}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-quest-text">{user.displayName}</h1>
              {/* Level badge — brand red */}
              <div className="px-2.5 py-1 rounded-xl bg-[#FF3C3C]/12 border border-[#FF3C3C]/30 text-xs font-black text-[#FF3C3C] shadow-[0_2px_0_#881A1A]">
                Level {user.level}
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-quest-surface border border-quest-border text-xs text-quest-text-3 font-mono shadow-[0_2px_0_#0A0A0A]">
                Rank #{user.rank}
              </div>
            </div>

            {/* XP bar */}
            <div className="mt-3 max-w-sm">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-quest-text-3 font-mono">{user.xp.toLocaleString()} / {user.xpToNextLevel.toLocaleString()} XP</span>
                <span className="text-[#FF3C3C] font-black">{xpPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-quest-surface-2 overflow-hidden border border-quest-border">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercent}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #FF3C3C, #00A0E0)' }}
                />
              </div>
              <p className="text-xs text-quest-text-3 mt-1 font-mono">
                {(user.xpToNextLevel - user.xp).toLocaleString()} XP until Level {user.level + 1}
              </p>
            </div>
          </div>

          {/* Streak */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#F5C418]/8 border border-[#F5C418]/20 shadow-[0_2px_0_#0A0A0A]">
            <Flame className="w-8 h-8 text-[#F5C418]" />
            <div>
              <p className="text-2xl font-black text-[#F5C418]">{user.streak}</p>
              <p className="text-xs text-[#F5C418]/60 font-mono">day streak</p>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { icon: Zap,          label: 'Total XP',             value: user.xp.toLocaleString(),         color: 'text-[#FF3C3C]', bg: 'bg-[#FF3C3C]/8 border-[#FF3C3C]/20',   shadow: 'shadow-[0_3px_0_#0A0A0A]' },
            { icon: CheckCircle2, label: 'Adventures Completed', value: user.completedAdventures.length,  color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/8 border-[#22c55e]/20',   shadow: 'shadow-[0_3px_0_#0A0A0A]' },
            { icon: Trophy,       label: 'Achievements',         value: user.achievements.length,         color: 'text-[#F5C418]', bg: 'bg-[#F5C418]/8 border-[#F5C418]/20',   shadow: 'shadow-[0_3px_0_#0A0A0A]' },
            { icon: TrendingUp,   label: 'Global Rank',          value: `#${user.rank}`,                  color: 'text-[#00A0E0]', bg: 'bg-[#00A0E0]/8 border-[#00A0E0]/20',   shadow: 'shadow-[0_3px_0_#0A0A0A]' },
          ].map(stat => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-2xl border ${stat.bg} ${stat.shadow} flex flex-col gap-2`}
            >
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-quest-text-3 font-mono">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Adventures + Skills */}
          <div className="lg:col-span-2 space-y-6">

            {/* Your Adventures */}
            <div className="rounded-2xl bg-quest-surface border border-quest-border overflow-hidden shadow-[0_4px_0_#0A0A0A]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-quest-border">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#FF3C3C]" />
                  <h2 className="text-sm font-bold text-quest-text">Your Adventures</h2>
                </div>
                <Link href="/adventures" className="text-xs text-quest-text-3 hover:text-[#FF3C3C] transition-colors flex items-center gap-1 font-medium">
                  Explore more <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="divide-y divide-quest-border/60">
                {adventures.slice(0, 4).map(adventure => {
                  const isComplete   = user.completedAdventures.includes(adventure.id)
                  const isInProgress = adventure.id === 'linux-prison-break'
                  return (
                    <Link
                      key={adventure.id}
                      href={`/adventures/${adventure.slug}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-quest-surface-2 transition-colors group"
                    >
                      <div className="text-2xl">{adventure.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-quest-text-2 group-hover:text-quest-text transition-colors">{adventure.title}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-quest-text-3 font-mono">{adventure.skill}</span>
                          <span className="text-quest-border">·</span>
                          <span className="text-xs text-quest-text-3 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{adventure.estimatedTime}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {isComplete ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-[#22c55e]">
                            <CheckCircle2 className="w-4 h-4" /> Done
                          </span>
                        ) : isInProgress ? (
                          <span className="text-xs font-bold text-[#F5C418] flex items-center gap-1">
                            <Target className="w-3.5 h-3.5" /> In Progress
                          </span>
                        ) : (
                          <span className="text-xs text-quest-text-3 group-hover:text-[#FF3C3C] transition-colors flex items-center gap-1 font-medium">
                            <Play className="w-3 h-3" /> Start
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Skill progression */}
            <div className="rounded-2xl bg-quest-surface border border-quest-border overflow-hidden shadow-[0_4px_0_#0A0A0A]">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-quest-border">
                <TrendingUp className="w-4 h-4 text-[#00A0E0]" />
                <h2 className="text-sm font-bold text-quest-text">Skill Progression</h2>
              </div>
              <div className="p-5 space-y-4">
                {skills.map(skill => (
                  <div key={skill.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-quest-text-2">{skill.name}</span>
                        <span className="text-xs text-quest-text-3 font-mono">Lv.{skill.level}</span>
                      </div>
                      <span className="text-xs text-quest-text-3 font-mono">{skill.xp} XP</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-quest-surface-2 border border-quest-border overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(skill.level / skill.max) * 100}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                        className="h-full rounded-full"
                        style={{ background: skill.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Achievements + Activity + Leaderboard */}
          <div className="space-y-6">

            {/* Achievements */}
            <div className="rounded-2xl bg-quest-surface border border-quest-border overflow-hidden shadow-[0_4px_0_#0A0A0A]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-quest-border">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#F5C418]" />
                  <h2 className="text-sm font-bold text-quest-text">Achievements</h2>
                </div>
                <span className="text-xs text-quest-text-3 font-mono">{unlockedAchievements.length}/{achievements.length}</span>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2">
                {unlockedAchievements.map(a => (
                  <div
                    key={a.id}
                    className={cn('achievement-unlock flex flex-col items-center p-2.5 rounded-xl border transition-all cursor-default', rarityColors[a.rarity])}
                    title={`${a.title}: ${a.description}`}
                  >
                    <span className="text-xl mb-1">{a.icon}</span>
                    <span className="text-[9px] text-center leading-tight text-quest-text-2 font-bold">{a.title}</span>
                  </div>
                ))}
                {lockedAchievements.slice(0, 3).map(a => (
                  <div
                    key={a.id}
                    className="flex flex-col items-center p-2.5 rounded-xl border border-quest-border bg-quest-surface-2/50 opacity-30 cursor-default"
                    title={`Locked: ${a.description}`}
                  >
                    <span className="text-xl mb-1 grayscale">{a.icon}</span>
                    <span className="text-[9px] text-center leading-tight text-quest-text-3">{a.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity feed */}
            <div className="rounded-2xl bg-quest-surface border border-quest-border overflow-hidden shadow-[0_4px_0_#0A0A0A]">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-quest-border">
                <Award className="w-4 h-4 text-[#00A0E0]" />
                <h2 className="text-sm font-bold text-quest-text">Recent Activity</h2>
              </div>
              <div className="divide-y divide-quest-border/60">
                {recentActivity.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-quest-text leading-relaxed">{item.text}</p>
                      <p className="text-[10px] text-quest-text-3 font-mono mt-0.5">{item.time}</p>
                    </div>
                    <span className="text-xs font-black font-mono text-[#F5C418] shrink-0">+{item.xp}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini leaderboard */}
            <div className="rounded-2xl bg-quest-surface border border-quest-border overflow-hidden shadow-[0_4px_0_#0A0A0A]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-quest-border">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#F5C418]" />
                  <h2 className="text-sm font-bold text-quest-text">Top Players</h2>
                </div>
              </div>
              <div className="divide-y divide-quest-border/60">
                {leaderboard.slice(0, 5).map(entry => (
                  <div key={entry.username} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={cn('text-xs font-mono w-5 text-center font-black', entry.rank <= 3 ? 'text-[#F5C418]' : 'text-quest-text-3')}>
                      #{entry.rank}
                    </span>
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0"
                      style={{ background: `hsl(${(entry.rank * 47 + 180) % 360}deg 50% 38%)`, boxShadow: '0 2px 0 rgba(0,0,0,0.4)' }}
                    >
                      {entry.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-quest-text truncate">{entry.displayName}</p>
                    </div>
                    <p className="text-xs font-black font-mono text-[#F5C418] shrink-0">{entry.xp.toLocaleString()}</p>
                  </div>
                ))}

                {/* You */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-[#FF3C3C]/5 border-t border-[#FF3C3C]/15">
                  <span className="text-xs font-mono w-5 text-center text-quest-text-3">#{user.rank}</span>
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #FF3C3C, #00A0E0)', boxShadow: '0 2px 0 #881A1A' }}
                  >
                    {user.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-[#FF3C3C] truncate">You</p>
                  </div>
                  <p className="text-xs font-black font-mono text-[#F5C418] shrink-0">{user.xp.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

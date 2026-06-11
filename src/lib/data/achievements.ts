import type { Achievement, LeaderboardEntry } from '@/lib/types'

export const achievements: Achievement[] = [
  { id: 'first-query', title: 'First Blood', description: 'Run your first SQL query', icon: '⚡', xpReward: 50, rarity: 'common' },
  { id: 'murder-solved', title: 'Case Closed', description: 'Solve the SQL Murder Mystery', icon: '🔍', xpReward: 500, rarity: 'epic' },
  { id: 'prison-escape', title: 'Jailbreak', description: 'Complete the Linux Prison Break', icon: '🔓', xpReward: 400, rarity: 'rare' },
  { id: 'no-hints', title: 'Pure Instinct', description: 'Complete an adventure without using hints', icon: '🧠', xpReward: 300, rarity: 'rare' },
  { id: 'speed-run', title: 'Speed Demon', description: 'Complete an adventure in under 15 minutes', icon: '⚡', xpReward: 250, rarity: 'rare' },
  { id: 'streak-7', title: 'On Fire', description: 'Maintain a 7-day learning streak', icon: '🔥', xpReward: 200, rarity: 'common' },
  { id: 'streak-30', title: 'Unstoppable', description: 'Maintain a 30-day learning streak', icon: '💎', xpReward: 1000, rarity: 'legendary' },
  { id: 'all-adventures', title: 'World Explorer', description: 'Complete all six adventure worlds', icon: '🌍', xpReward: 2000, rarity: 'legendary' },
  { id: 'join-master', title: 'Join Whisperer', description: 'Successfully write 10 JOIN queries', icon: '🔗', xpReward: 150, rarity: 'common' },
  { id: 'git-guru', title: 'Timeline Keeper', description: 'Complete the Git Time Traveler', icon: '⏳', xpReward: 600, rarity: 'epic' },
  { id: 'hacker', title: 'White Hat', description: 'Complete the Hacker Academy', icon: '🕵️', xpReward: 700, rarity: 'epic' },
  { id: 'social', title: 'Guild Member', description: 'Share a completion on the leaderboard', icon: '🤝', xpReward: 50, rarity: 'common' },
]

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, username: 'quantum_dave', displayName: 'Quantum Dave', avatar: 'QD', level: 42, xp: 48200, completedAdventures: 6, streak: 94, badge: '👑' },
  { rank: 2, username: 'neon_coder', displayName: 'Neon Coder', avatar: 'NC', level: 38, xp: 41800, completedAdventures: 6, streak: 72, badge: '⭐' },
  { rank: 3, username: 'syntax_slayer', displayName: 'Syntax Slayer', avatar: 'SS', level: 35, xp: 36400, completedAdventures: 5, streak: 45, badge: '🔥' },
  { rank: 4, username: 'pixel_phantom', displayName: 'Pixel Phantom', avatar: 'PP', level: 31, xp: 29700, completedAdventures: 5, streak: 33, badge: '💻' },
  { rank: 5, username: 'dark_kernel', displayName: 'Dark Kernel', avatar: 'DK', level: 28, xp: 24600, completedAdventures: 4, streak: 28, badge: '🌙' },
  { rank: 6, username: 'echo_zero', displayName: 'Echo Zero', avatar: 'EZ', level: 25, xp: 21100, completedAdventures: 4, streak: 21, badge: '🎯' },
  { rank: 7, username: 'void_runner', displayName: 'Void Runner', avatar: 'VR', level: 22, xp: 17800, completedAdventures: 3, streak: 18, badge: '⚡' },
  { rank: 8, username: 'crypto_ghost', displayName: 'Crypto Ghost', avatar: 'CG', level: 19, xp: 14300, completedAdventures: 3, streak: 14, badge: '🔮' },
]

export const mockUserProfile = {
  id: 'user-001',
  username: 'you',
  displayName: 'You',
  avatar: 'YO',
  level: 7,
  xp: 4200,
  xpToNextLevel: 6000,
  streak: 5,
  completedAdventures: ['sql-murder-mystery'],
  achievements: ['first-query', 'murder-solved', 'streak-7'],
  joinedAt: new Date('2024-11-01'),
  rank: 142,
}

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
export type Genre = 'Mystery' | 'Sci-Fi' | 'Thriller' | 'Action' | 'Puzzle' | 'Adventure'
export type SkillCategory = 'SQL' | 'Linux' | 'Git' | 'Cybersecurity' | 'JavaScript' | 'Data Analysis' | 'Python'

export interface Adventure {
  id: string
  slug: string
  title: string
  subtitle: string
  description: string
  longDescription: string
  genre: Genre
  skill: SkillCategory
  difficulty: Difficulty
  estimatedTime: string
  xpReward: number
  chapters: number
  completedBy: number
  rating: number
  icon: string
  color: string
  bgGradient: string
  borderColor: string
  glowColor: string
  tags: string[]
  concepts: string[]
  isNew?: boolean
  isPopular?: boolean
  isComingSoon?: boolean
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  xpReward: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlockedAt?: Date
}

export interface UserProfile {
  id: string
  username: string
  displayName: string
  avatar: string
  level: number
  xp: number
  xpToNextLevel: number
  streak: number
  completedAdventures: string[]
  achievements: string[]
  joinedAt: Date
  rank: number
}

export interface LeaderboardEntry {
  rank: number
  username: string
  displayName: string
  avatar: string
  level: number
  xp: number
  completedAdventures: number
  streak: number
  badge: string
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  error?: string
  executionTime: number
}

export interface TerminalLine {
  id: string
  type: 'input' | 'output' | 'error' | 'story' | 'success' | 'info' | 'system'
  content: string
  timestamp: number
}

export interface GameLevel {
  id: number
  title: string
  story: string
  objective: string
  hint: string
  successCommand: string | string[]
  successMessage: string
  xpReward: number
}

export interface WorldLevel {
  id: number
  title: string
  description: string
  xpReward: number
  concept: string
  duration: string
}

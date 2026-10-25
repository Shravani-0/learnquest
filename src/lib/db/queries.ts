import { createClient } from '@/lib/supabase/server'
import { supabaseConfigured } from '@/lib/supabase/env'

/** The signed-in auth user, or null. Safe to call from any Server Component. */
export async function getUser() {
  if (!supabaseConfigured) return null
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getProfile(userId: string) {
  if (!supabaseConfigured) return null
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data
}

/** Everything the dashboard needs, fetched in parallel for the current user. */
export async function getDashboardData(userId: string) {
  const supabase = await createClient()

  const [profile, achievements, unlocked, progress, leaderboard, rankRow] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('achievements').select('*'),
    supabase.from('user_achievements').select('achievement_id, unlocked_at').eq('user_id', userId),
    supabase
      .from('user_quest_progress')
      .select('adventure_id, level_number, status, xp_earned, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
    supabase.from('leaderboard').select('*').order('rank').limit(8),
    supabase.from('leaderboard').select('rank, xp, completed_adventures').eq('id', userId).single(),
  ])

  return {
    profile: profile.data,
    achievements: achievements.data ?? [],
    unlockedIds: (unlocked.data ?? []).map(a => a.achievement_id),
    progress: progress.data ?? [],
    leaderboard: leaderboard.data ?? [],
    rank: rankRow.data?.rank ?? null,
    completedAdventures: rankRow.data?.completed_adventures ?? 0,
  }
}

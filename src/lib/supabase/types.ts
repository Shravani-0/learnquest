/**
 * Hand-written database types mirroring supabase/migrations/0001_init.sql.
 * Regenerate with `npx supabase gen types typescript` once the CLI is linked
 * to your project if you prefer fully generated types.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type QuestStatus = 'not_started' | 'in_progress' | 'completed'
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string
          avatar: string
          xp: number
          streak: number
          last_active: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string
          avatar?: string
          xp?: number
          streak?: number
          last_active?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      adventures: {
        Row: {
          id: string
          slug: string
          title: string
          subtitle: string | null
          description: string | null
          long_description: string | null
          genre: string | null
          skill: string | null
          difficulty: string | null
          estimated_time: string | null
          xp_reward: number
          chapters: number
          rating: number
          icon: string | null
          tags: string[]
          concepts: string[]
          is_new: boolean
          is_popular: boolean
          is_coming_soon: boolean
          sort_order: number
        }
        Insert: Partial<Database['public']['Tables']['adventures']['Row']> & {
          id: string
          slug: string
          title: string
        }
        Update: Partial<Database['public']['Tables']['adventures']['Insert']>
        Relationships: []
      }
      quest_levels: {
        Row: {
          id: string
          adventure_id: string
          level_number: number
          title: string
          setting: string | null
          intro: string | null
          objective: string | null
          hint: string | null
          success_message: string | null
          xp_reward: number
          seed_db: Json
          schema: Json
          meta: Json
        }
        Insert: Partial<Database['public']['Tables']['quest_levels']['Row']> & {
          adventure_id: string
          level_number: number
          title: string
        }
        Update: Partial<Database['public']['Tables']['quest_levels']['Insert']>
        Relationships: []
      }
      quest_steps: {
        Row: {
          id: string
          level_id: string
          step_key: string
          label: string | null
          objective: string | null
          body: string | null
          story_event: string | null
          xp: number
          sort_order: number
        }
        Insert: Partial<Database['public']['Tables']['quest_steps']['Row']> & {
          level_id: string
          step_key: string
        }
        Update: Partial<Database['public']['Tables']['quest_steps']['Insert']>
        Relationships: []
      }
      quest_hints: {
        Row: {
          id: string
          level_id: string
          title: string
          hints: string[]
          sort_order: number
        }
        Insert: Partial<Database['public']['Tables']['quest_hints']['Row']> & {
          level_id: string
          title: string
          hints: string[]
        }
        Update: Partial<Database['public']['Tables']['quest_hints']['Insert']>
        Relationships: []
      }
      achievements: {
        Row: {
          id: string
          title: string
          description: string | null
          icon: string | null
          xp_reward: number
          rarity: Rarity
        }
        Insert: Partial<Database['public']['Tables']['achievements']['Row']> & {
          id: string
          title: string
        }
        Update: Partial<Database['public']['Tables']['achievements']['Insert']>
        Relationships: []
      }
      user_achievements: {
        Row: {
          user_id: string
          achievement_id: string
          unlocked_at: string
        }
        Insert: {
          user_id: string
          achievement_id: string
          unlocked_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_achievements']['Insert']>
        Relationships: []
      }
      user_quest_progress: {
        Row: {
          id: string
          user_id: string
          adventure_id: string
          level_number: number
          status: QuestStatus
          steps_completed: string[]
          xp_earned: number
          hints_used: number
          started_at: string
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          adventure_id: string
          level_number: number
          status?: QuestStatus
          steps_completed?: string[]
          xp_earned?: number
          hints_used?: number
          started_at?: string
          completed_at?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_quest_progress']['Insert']>
        Relationships: []
      }
      user_answers: {
        Row: {
          id: string
          user_id: string
          adventure_id: string
          level_number: number
          step_key: string | null
          submitted_answer: string
          is_correct: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          adventure_id: string
          level_number: number
          step_key?: string | null
          submitted_answer: string
          is_correct?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_answers']['Insert']>
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          id: string
          username: string
          display_name: string
          avatar: string
          xp: number
          streak: number
          completed_adventures: number
          rank: number
        }
        Relationships: []
      }
    }
    Functions: {
      // Server-only (service role): atomically complete a level and award XP once.
      complete_level: {
        Args: {
          p_user: string
          p_adventure: string
          p_level: number
          p_xp: number
          p_steps: string[]
        }
        Returns: { xp_awarded: number; already_completed: boolean }[]
      }
      // Server-only (service role): persist revealed narrative steps (no XP).
      record_step_progress: {
        Args: {
          p_user: string
          p_adventure: string
          p_level: number
          p_steps: string[]
        }
        Returns: undefined
      }
      // Server-only (service role): atomically append detected steps / revealed
      // hint keys ('hint:*') to a level's progress; hints_used = count of hint keys.
      append_progress_keys: {
        Args: {
          p_user: string
          p_adventure: string
          p_level: number
          p_keys: string[]
        }
        Returns: { out_steps: string[]; out_hints: number; out_status: QuestStatus }[]
      }
    }
    Enums: {
      quest_status: QuestStatus
      rarity: Rarity
    }
    CompositeTypes: Record<string, never>
  }
}

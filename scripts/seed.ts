/**
 * Seeds Supabase with the quest CATALOG (adventures, achievements, and
 * presentational per-level metadata) from the in-code data files.
 *
 * Answers are deliberately NOT stored: win conditions, killer names, winning
 * commands and seed databases live only in `src/lib/server/quests/*` and never
 * touch the database (which is readable by the anon key). The 0002 migration
 * additionally hides quest_levels.seed_db / meta from clients as defense in depth.
 *
 * Usage:
 *   1. Fill in .env.local (needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 *   2. npm run seed
 */
import 'dotenv/config'
import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

import { adventures } from '../src/lib/data/adventures'
import { achievements } from '../src/lib/data/achievements'
import { adventureLevels } from '../src/lib/data/levels'

// Load .env.local explicitly (dotenv/config only reads .env by default).
loadEnv({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey || url.includes('your-project-ref')) {
  console.error(
    '✗ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and ' +
      'SUPABASE_SERVICE_ROLE_KEY in .env.local before seeding.'
  )
  process.exit(1)
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } })

async function seedAdventures() {
  const rows = adventures.map((a, i) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    subtitle: a.subtitle,
    description: a.description,
    long_description: a.longDescription,
    genre: a.genre,
    skill: a.skill,
    difficulty: a.difficulty,
    estimated_time: a.estimatedTime,
    xp_reward: a.xpReward,
    chapters: a.chapters,
    rating: a.rating,
    icon: a.icon,
    tags: a.tags,
    concepts: a.concepts,
    is_new: a.isNew ?? false,
    is_popular: a.isPopular ?? false,
    is_coming_soon: a.isComingSoon ?? false,
    sort_order: i,
  }))
  const { error } = await db.from('adventures').upsert(rows, { onConflict: 'id' })
  if (error) throw error
  console.log(`✓ adventures: ${rows.length}`)
}

async function seedAchievements() {
  const rows = achievements.map(a => ({
    id: a.id,
    title: a.title,
    description: a.description,
    icon: a.icon,
    xp_reward: a.xpReward,
    rarity: a.rarity,
  }))
  const { error } = await db.from('achievements').upsert(rows, { onConflict: 'id' })
  if (error) throw error
  console.log(`✓ achievements: ${rows.length}`)
}

/**
 * Presentational level rows only — title, XP, concept/objective, blurb. No
 * seed_db, no meta (answers), no steps/hints (which include full solutions).
 */
async function seedQuestLevels() {
  let count = 0
  for (const [adventureId, levels] of Object.entries(adventureLevels)) {
    const rows = levels.map(l => ({
      adventure_id: adventureId,
      level_number: l.id,
      title: l.title,
      objective: l.concept,
      intro: l.description,
      xp_reward: l.xpReward,
      seed_db: {},
      schema: {},
      meta: {},
    }))
    const { error } = await db
      .from('quest_levels')
      .upsert(rows, { onConflict: 'adventure_id,level_number' })
    if (error) throw error
    count += rows.length
  }
  console.log(`✓ quest levels (display-only): ${count}`)
}

async function main() {
  console.log('Seeding SkillQuest catalog into Supabase…')
  await seedAdventures()
  await seedAchievements()
  await seedQuestLevels()
  console.log('Done. 🎉  (Answers stay in code — never seeded.)')
}

main().catch(err => {
  console.error('✗ Seed failed:', err.message ?? err)
  process.exit(1)
})

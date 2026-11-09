/**
 * Roll the level-grained `user_quest_progress` rows up to per-world progress for
 * the dashboard. A world is cleared only when every one of its levels is.
 */
export type ProgressRow = {
  adventure_id: string
  level_number: number
  status: string
  xp_earned: number
}

export type WorldProgress = {
  levelsCleared: number
  xpEarned: number
  status: 'completed' | 'in_progress' | 'not_started'
}

export function summarizeProgress(
  rows: ProgressRow[],
  levelCounts: Record<string, number>,
): { byWorld: Map<string, WorldProgress>; levelsCleared: number; xpEarned: number } {
  const byWorld = new Map<string, WorldProgress>()
  let levelsCleared = 0
  let xpEarned = 0
  for (const r of rows) {
    const cur = byWorld.get(r.adventure_id) ?? { levelsCleared: 0, xpEarned: 0, status: 'in_progress' as const }
    cur.xpEarned += r.xp_earned
    xpEarned += r.xp_earned
    if (r.status === 'completed') {
      cur.levelsCleared += 1
      levelsCleared += 1
    }
    byWorld.set(r.adventure_id, cur)
  }
  for (const [id, w] of byWorld) {
    const count = levelCounts[id] ?? 0
    if (count > 0 && w.levelsCleared >= count) w.status = 'completed'
  }
  return { byWorld, levelsCleared, xpEarned }
}

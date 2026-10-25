export type LineType = 'input' | 'output' | 'error' | 'story' | 'success' | 'system'

export interface TermLine {
  id: string
  type: LineType
  content: string
}

// Note: the full Level shape (with the winning command + success output) is
// server-only — see src/lib/server/quests/linux-prison-break.ts. The browser
// only ever handles LinuxLevelContent (src/lib/quests/types.ts).

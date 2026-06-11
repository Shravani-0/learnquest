export type LineType = 'input' | 'output' | 'error' | 'story' | 'success' | 'system'

export interface TermLine {
  id: string
  type: LineType
  content: string
}

export interface Level {
  id: number
  room: string
  story: string
  objective: string
  command: string | string[]
  hint: string
  successLines: string[]
  storyEvent: string
  xp: number
  unlocks: string
}

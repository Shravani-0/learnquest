import 'server-only'

import type { LinuxLevelContent, TermLineDTO } from '@/lib/quests/types'

/**
 * Linux Prison Break — SERVER ONLY.
 *
 * The winning command(s) for each level, the success output lines, and the
 * story beats live here and are never shipped to the browser. Commands are
 * graded by `processCommand()` inside the server action; the client only ever
 * sees the resulting terminal lines the server chooses to return.
 */

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

export const LEVELS: Level[] = [
  {
    id: 1,
    room: '/prison/cell_42',
    story: 'You wake up in a dimly lit cell. Block C, somewhere deep underground. A terminal on the wall flickers to life. It wants a command.',
    objective: 'Find out where you are.',
    command: 'pwd',
    hint: 'pwd stands for "print working directory". It shows you your current location.',
    successLines: ['/prison/cell_42'],
    storyEvent: "📍 You're in Cell 42. There's a door to the west — locked. But the terminal has more to offer.",
    xp: 50,
    unlocks: 'The directory structure',
  },
  {
    id: 2,
    room: '/prison/cell_42',
    story: 'Good. You know where you are. Now what else is in this cell?',
    objective: 'List the files in this directory.',
    command: 'ls',
    hint: 'ls lists files and directories in your current location.',
    successLines: ['bed  terminal  note.txt  vent_cover'],
    storyEvent: "📋 There's a note on the floor and something covering the vent. Start with the note.",
    xp: 50,
    unlocks: 'note.txt',
  },
  {
    id: 3,
    room: '/prison/cell_42',
    story: 'A crumpled note. Someone slipped it under the door.',
    objective: 'Read the note on the floor.',
    command: 'cat note.txt',
    hint: 'cat reads the contents of a file and prints it to the screen.',
    successLines: [
      'Guard shift change at 23:00.',
      'Security backup: /prison/security/backup.conf',
      'Emergency override: run /prison/security/emergency.sh',
      '-- A Friend',
    ],
    storyEvent: "🔑 There's a backup config with override codes. Navigate to the security directory.",
    xp: 75,
    unlocks: '/prison/security/',
  },
  {
    id: 4,
    room: '/prison/cell_42',
    story: 'The security system directory. If you can access it, you can control the doors.',
    objective: 'Navigate to the security directory.',
    command: ['cd /prison/security', 'cd security', 'cd ../security'],
    hint: 'cd changes your current directory. Use the absolute path from the note.',
    successLines: [''],
    storyEvent: "🗂️ You're in the security directory. List the files to see what's here.",
    xp: 75,
    unlocks: 'Security directory access',
  },
  {
    id: 5,
    room: '/prison/security',
    story: 'The security control room. What files are available?',
    objective: 'List files in the security directory.',
    command: 'ls',
    hint: "Same as before — ls shows what's in the current directory.",
    successLines: ['backup.conf  door_codes.enc  emergency.sh  logs/'],
    storyEvent: "📁 There's the backup config, encrypted door codes, an emergency script, and a logs folder.",
    xp: 50,
    unlocks: 'backup.conf',
  },
  {
    id: 6,
    room: '/prison/security',
    story: 'The backup config. This might contain the door override sequence.',
    objective: 'Read the backup config file.',
    command: 'cat backup.conf',
    hint: 'cat works on any file — just provide the filename.',
    successLines: [
      'BACKUP CONFIG v2.1',
      'Door override: ALPHA-7-ZETA',
      'Emergency exit code: 4829-DELTA',
      'Admin password: [REDACTED]',
    ],
    storyEvent: "💡 Door override: ALPHA-7-ZETA! But the emergency script needs execute permission first.",
    xp: 100,
    unlocks: 'Door override code',
  },
  {
    id: 7,
    room: '/prison/security',
    story: "The emergency script is there but you can't run it yet — it's not executable.",
    objective: 'Make the emergency script executable.',
    command: 'chmod +x emergency.sh',
    hint: 'chmod changes file permissions. +x adds execute permission.',
    successLines: [''],
    storyEvent: '🔓 emergency.sh is now executable! Run it to trigger the override.',
    xp: 150,
    unlocks: 'Execute permissions',
  },
  {
    id: 8,
    room: '/prison/security',
    story: 'The script is ready. Time to trigger the emergency protocol.',
    objective: 'Run the emergency script.',
    command: './emergency.sh',
    hint: './filename runs a script in the current directory. The ./ means "here".',
    successLines: [
      'EMERGENCY PROTOCOL ACTIVATED',
      'Disabling security cameras...',
      'Unlocking cell block doors...',
      'Locating escape route...',
      '',
      'Escape pod: /hangar/pod_7',
      'Access code: FREEDOM-2024',
    ],
    storyEvent: '🚨 The doors are unlocking! The escape pod is in the hangar. Move!',
    xp: 200,
    unlocks: 'Escape pod location',
  },
  {
    id: 9,
    room: '/prison/security',
    story: "Cameras are down. Doors are open. But the guards will notice soon. Find the escape route hidden in the logs.",
    objective: 'Search for "escape" in the log files.',
    command: ['grep -r "escape" logs/', 'grep -r escape logs/'],
    hint: 'grep searches for text patterns. -r means recursive (search all files in a directory).',
    successLines: [
      'logs/access.log:escape_route=/tunnel/underground',
      'logs/access.log:escape_pod_bay=hangar_level_3',
    ],
    storyEvent: "🗺️ There's an underground tunnel! Navigate to the hangar and access the pod.",
    xp: 200,
    unlocks: 'Escape route map',
  },
  {
    id: 10,
    room: '/hangar/pod_7',
    story: 'You sprint through the tunnel. The hangar. Pod 7. A keypad blinks. Enter the code.',
    objective: 'Navigate to the escape pod and activate it.',
    command: ['cd /hangar/pod_7 && cat access_panel.txt', 'cd /hangar/pod_7', 'cat access_panel.txt'],
    hint: '&& chains two commands — run the second only if the first succeeds.',
    successLines: [
      'ESCAPE POD 7 — ONLINE',
      'Entering code: FREEDOM-2024',
      '',
      '> AUTHORIZATION: GRANTED',
      '> HATCH: OPEN',
      '> LAUNCH IN: 3... 2... 1...',
      '',
      '🚀 FREEDOM.',
    ],
    storyEvent: '🎉 YOU ESCAPED! Case closed. Linux mastered.',
    xp: 500,
    unlocks: 'Freedom',
  },
]

export const LINUX_COUNT = LEVELS.length

export function getLinuxLevel(levelNumber: number): Level | null {
  return LEVELS.find(l => l.id === levelNumber) ?? null
}

export function linuxLevelXp(levelNumber: number): number {
  return getLinuxLevel(levelNumber)?.xp ?? 0
}

/**
 * Grade one submitted command against a level. Mirrors the old client processor,
 * but the winning command + success output are known only here.
 */
export function processCommand(
  input: string,
  levelNumber: number,
  currentRoom: string,
): { lines: TermLineDTO[]; levelComplete: boolean; newRoom: string; storyEvent: string | null } {
  const level = getLinuxLevel(levelNumber)
  const raw = input.trim()
  const cmd = raw.toLowerCase().replace(/\s+/g, ' ')
  const lines: TermLineDTO[] = []

  if (!level) {
    lines.push({ type: 'error', content: 'No such level.' })
    return { lines, levelComplete: false, newRoom: currentRoom, storyEvent: null }
  }

  const allowed = Array.isArray(level.command)
    ? level.command.map(c => c.toLowerCase())
    : [level.command.toLowerCase()]

  const isCorrect = allowed.some(c => cmd === c)

  if (!isCorrect) {
    if (cmd === 'help' || cmd === 'man') {
      lines.push({ type: 'output', content: 'Available: pwd, ls, cd, cat, chmod, grep, find, echo, clear' })
      return { lines, levelComplete: false, newRoom: currentRoom, storyEvent: null }
    }
    if (cmd === 'clear') {
      return { lines: [{ type: 'system', content: '__CLEAR__' }], levelComplete: false, newRoom: currentRoom, storyEvent: null }
    }
    if (cmd.startsWith('ls')) {
      lines.push({
        type: 'output',
        content: currentRoom.includes('security')
          ? 'backup.conf  door_codes.enc  emergency.sh  logs/'
          : 'bed  terminal  note.txt  vent_cover',
      })
      return { lines, levelComplete: false, newRoom: currentRoom, storyEvent: null }
    }
    if (cmd.startsWith('pwd')) {
      lines.push({ type: 'output', content: currentRoom })
      return { lines, levelComplete: false, newRoom: currentRoom, storyEvent: null }
    }
    lines.push({ type: 'error', content: `bash: ${raw.split(' ')[0]}: command not found, or not the objective right now.` })
    return { lines, levelComplete: false, newRoom: currentRoom, storyEvent: null }
  }

  let newRoom = currentRoom
  if (cmd.startsWith('cd ')) {
    const parts = cmd.split(' ')
    newRoom = parts[1].startsWith('/') ? parts[1] : `/prison/${parts[1]}`
  }
  if (cmd.includes('/hangar/pod_7')) newRoom = '/hangar/pod_7'
  if (cmd.includes('&&')) {
    const parts = cmd.split('&&').map(p => p.trim())
    if (parts[0].startsWith('cd ')) newRoom = parts[0].split(' ')[1]
  }

  for (const line of level.successLines) {
    if (line) lines.push({ type: 'output', content: line })
  }

  return { lines, levelComplete: true, newRoom, storyEvent: level.storyEvent }
}

/** Only the presentational fields — no command, no success output, no story beat. */
export function toClientContent(level: Level): LinuxLevelContent {
  return {
    id: level.id,
    room: level.room,
    story: level.story,
    objective: level.objective,
    hint: level.hint,
    xp: level.xp,
    unlocks: level.unlocks,
  }
}

export const LINUX_CONTENT: LinuxLevelContent[] = LEVELS.map(toClientContent)

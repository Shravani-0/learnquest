import 'server-only'

import { executeSQL } from '@/lib/sql-engine'
import type { QueryResult } from '@/lib/types'
import type { ChallengeSkill, PuzzleTier } from '@/lib/challenges/rules'

/**
 * Challenge puzzles — SERVER ONLY. Short, single-answer tasks per skill, kept
 * apart from the worlds so a race never spoils a story level. Reference answers
 * (SQL) and accepted commands (Linux) never leave the server; the browser only
 * gets the prompt, the schema/context, and graded results.
 *
 * Tier: 'free' puzzles are open to everyone; 'premium' ones need Pro/Career or
 * the world for that skill (see rules.canUsePuzzle).
 *
 * SQL puzzles are written for this repo's SQL engine: WHERE (=, <>, <, >, <=,
 * >=, AND, OR, IN, LIKE, IS [NOT] NULL), ORDER BY, LIMIT and aliased JOINs.
 */

type Value = string | number | null
type Table = Record<string, Value>[]

interface Base {
  id: string
  skill: ChallengeSkill
  tier: PuzzleTier
  title: string
  prompt: string
}

export interface SqlPuzzle extends Base {
  skill: 'sql'
  db: Record<string, Table>
  reference: string
  /** true when the task asks for a specific order. */
  ordered: boolean
}

export interface LinuxPuzzle extends Base {
  skill: 'linux'
  cwd: string
  /** What `ls` shows in the working directory. */
  listing: string
  /** Exact commands that solve it (after whitespace is collapsed). */
  accepted: string[]
  output: string[]
}

export type Puzzle = SqlPuzzle | LinuxPuzzle

// ── SQL: one small shop database shared by every SQL puzzle ───────────────────
const SHOP: Record<string, Table> = {
  customers: [
    { id: 1, name: 'Aarav Mehta', city: 'Pune', tier: 'gold', joined: 2019, email: 'aarav@mail.in' },
    { id: 2, name: 'Sara Khan', city: 'Mumbai', tier: 'silver', joined: 2021, email: 'sara@mail.in' },
    { id: 3, name: 'Kabir Rao', city: 'Delhi', tier: 'gold', joined: 2022, email: null },
    { id: 4, name: 'Meera Iyer', city: 'Pune', tier: 'basic', joined: 2020, email: 'meera@mail.in' },
    { id: 5, name: 'Sahil Gupta', city: 'Delhi', tier: 'gold', joined: 2018, email: 'sahil@mail.in' },
    { id: 6, name: 'Nisha Paul', city: 'Kolkata', tier: 'silver', joined: 2023, email: null },
    { id: 7, name: 'Rohan Das', city: 'Mumbai', tier: 'basic', joined: 2022, email: 'rohan@mail.in' },
    { id: 8, name: 'Sneha Joshi', city: 'Pune', tier: 'silver', joined: 2019, email: 'sneha@mail.in' },
  ],
  orders: [
    { id: 101, customer_id: 1, item: 'laptop', amount: 54000, status: 'paid' },
    { id: 102, customer_id: 2, item: 'headphones', amount: 2400, status: 'paid' },
    { id: 103, customer_id: 3, item: 'monitor', amount: 12500, status: 'refunded' },
    { id: 104, customer_id: 4, item: 'keyboard', amount: 1800, status: 'pending' },
    { id: 105, customer_id: 5, item: 'phone', amount: 32000, status: 'paid' },
    { id: 106, customer_id: 6, item: 'mouse', amount: 900, status: 'refunded' },
    { id: 107, customer_id: 7, item: 'tablet', amount: 21000, status: 'pending' },
    { id: 108, customer_id: 3, item: 'webcam', amount: 3100, status: 'pending' },
    { id: 109, customer_id: 8, item: 'speaker', amount: 4500, status: 'paid' },
    { id: 110, customer_id: 5, item: 'charger', amount: 1500, status: 'pending' },
  ],
}

const sql = (p: Omit<SqlPuzzle, 'skill' | 'db'>): SqlPuzzle => ({ ...p, skill: 'sql', db: SHOP })

// ── Linux ─────────────────────────────────────────────────────────────────────
const APP_LS = 'README.md  app.js  deploy.sh  server.log  config/'
const linux = (p: Omit<LinuxPuzzle, 'skill' | 'cwd' | 'listing'> & Partial<Pick<LinuxPuzzle, 'cwd' | 'listing'>>): LinuxPuzzle => ({
  cwd: '/srv/app',
  listing: APP_LS,
  ...p,
  skill: 'linux',
})

export const PUZZLES: Puzzle[] = [
  // SQL — free
  sql({ id: 'sql-pune', tier: 'free', title: 'Pune regulars', ordered: false,
    prompt: 'List the names of every customer who lives in Pune.',
    reference: "SELECT name FROM customers WHERE city = 'Pune'" }),
  sql({ id: 'sql-big-tickets', tier: 'free', title: 'Big tickets', ordered: true,
    prompt: 'Show the item and amount of every order over ₹20,000, biggest first.',
    reference: 'SELECT item, amount FROM orders WHERE amount > 20000 ORDER BY amount DESC' }),
  sql({ id: 'sql-old-gold', tier: 'free', title: 'Old gold', ordered: false,
    prompt: 'Find the names of gold-tier customers who joined before 2020.',
    reference: "SELECT name FROM customers WHERE tier = 'gold' AND joined < 2020" }),
  sql({ id: 'sql-no-email', tier: 'free', title: 'Missing emails', ordered: false,
    prompt: 'Which customers have no email on file? Return their names.',
    reference: 'SELECT name FROM customers WHERE email IS NULL' }),
  // SQL — premium
  sql({ id: 'sql-refunds', tier: 'premium', title: 'Refund trail', ordered: false,
    prompt: 'Return the names of customers who have a refunded order.',
    reference: "SELECT c.name FROM customers c JOIN orders o ON c.id = o.customer_id WHERE o.status = 'refunded'" }),
  sql({ id: 'sql-top-three', tier: 'premium', title: 'Top three', ordered: true,
    prompt: 'Show the item and amount of the three largest PAID orders, largest first.',
    reference: "SELECT item, amount FROM orders WHERE status = 'paid' ORDER BY amount DESC LIMIT 3" }),
  sql({ id: 'sql-pending-metros', tier: 'premium', title: 'Stuck in the metros', ordered: false,
    prompt: 'Give the order ids of pending orders placed by customers in Delhi or Mumbai.',
    reference: "SELECT o.id FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.status = 'pending' AND c.city IN ('Delhi', 'Mumbai')" }),
  sql({ id: 'sql-s-names', tier: 'premium', title: 'The S list', ordered: true,
    prompt: 'List the names of customers whose name starts with S, alphabetically.',
    reference: "SELECT name FROM customers WHERE name LIKE 'S%' ORDER BY name ASC" }),

  // Linux — free
  linux({ id: 'lx-pwd', tier: 'free', title: 'Where am I?',
    prompt: 'You just SSH’d into a box. Print the directory you are in.',
    accepted: ['pwd'], output: ['/srv/app'] }),
  linux({ id: 'lx-hidden', tier: 'free', title: 'Hidden files',
    prompt: 'Something is configured by a hidden file here. List every file, hidden ones included.',
    accepted: ['ls -a', 'ls -la', 'ls -al', 'ls -A', 'ls -lA', 'ls -Al'],
    output: ['.  ..  .env  README.md  app.js  deploy.sh  server.log  config/'] }),
  linux({ id: 'lx-tail', tier: 'free', title: 'Last words',
    prompt: 'Show only the last 5 lines of server.log.',
    accepted: ['tail -n 5 server.log', 'tail -5 server.log', 'tail -n5 server.log'],
    output: ['12:01 INFO  request /health 200', '12:02 WARN  slow query 840ms', '12:02 ERROR db timeout', '12:03 INFO  retry ok', '12:04 INFO  request /api 200'] }),
  linux({ id: 'lx-mkdir', tier: 'free', title: 'Make room',
    prompt: 'Create a directory called backups in the current directory.',
    accepted: ['mkdir backups', 'mkdir ./backups', 'mkdir -p backups'], output: [] }),
  // Linux — premium
  linux({ id: 'lx-grep', tier: 'premium', title: 'Find the errors',
    prompt: 'Print every line of server.log that contains ERROR.',
    accepted: ['grep ERROR server.log', 'grep "ERROR" server.log', "grep 'ERROR' server.log", 'cat server.log | grep ERROR'],
    output: ['11:58 ERROR cache miss storm', '12:02 ERROR db timeout'] }),
  linux({ id: 'lx-chmod', tier: 'premium', title: 'Ship it',
    prompt: 'deploy.sh won’t run. Make it executable.',
    accepted: ['chmod +x deploy.sh', 'chmod a+x deploy.sh', 'chmod u+x deploy.sh', 'chmod 755 deploy.sh', 'chmod 744 deploy.sh', 'chmod 700 deploy.sh'],
    output: [] }),
  linux({ id: 'lx-wc', tier: 'premium', title: 'How long is it?',
    prompt: 'Count the number of lines in server.log.',
    accepted: ['wc -l server.log', 'wc -l < server.log', 'cat server.log | wc -l'], output: ['1342 server.log'] }),
  linux({ id: 'lx-find-conf', tier: 'premium', title: 'Every config', cwd: '/', listing: 'bin  etc  home  srv  tmp  usr  var',
    prompt: 'From /, find every file under /etc whose name ends in .conf.',
    accepted: [
      'find /etc -name "*.conf"', "find /etc -name '*.conf'", 'find /etc -name *.conf',
      'find /etc -type f -name "*.conf"', "find /etc -type f -name '*.conf'", 'find /etc -name \\*.conf',
    ],
    output: ['/etc/nginx/nginx.conf', '/etc/resolv.conf', '/etc/ssh/sshd_config.conf'] }),
]

export function getPuzzle(id: string | null | undefined): Puzzle | null {
  return PUZZLES.find(p => p.id === id) ?? null
}

// ── Grading ───────────────────────────────────────────────────────────────────

/** Rows as comparable tuples: values only (column names/aliases don't matter). */
function tuples(r: QueryResult): string[] {
  return r.rows.map(row => JSON.stringify(r.columns.map(c => (row[c] == null ? null : String(row[c])))))
}

/** Same answer as the reference: same rows (and order, when the task asks for one). */
export function sqlMatches(p: SqlPuzzle, result: QueryResult): boolean {
  if (result.error) return false
  const want = executeSQL(p.reference, p.db as Parameters<typeof executeSQL>[1])
  if (want.columns.length !== result.columns.length) return false
  const a = tuples(want)
  const b = tuples(result)
  if (a.length !== b.length) return false
  return p.ordered ? a.every((t, i) => t === b[i]) : [...a].sort().join('\n') === [...b].sort().join('\n')
}

export function runSqlPuzzle(p: SqlPuzzle, query: string): { result: QueryResult; solved: boolean } {
  const result = executeSQL(String(query).slice(0, 4000), p.db as Parameters<typeof executeSQL>[1])
  return { result, solved: sqlMatches(p, result) }
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ')

export function runLinuxPuzzle(p: LinuxPuzzle, command: string): { lines: { type: 'output' | 'error'; content: string }[]; solved: boolean } {
  const cmd = norm(String(command).slice(0, 500))
  if (p.accepted.some(a => norm(a) === cmd)) {
    return { lines: p.output.map(content => ({ type: 'output' as const, content })), solved: true }
  }
  if (cmd === 'ls') return { lines: [{ type: 'output', content: p.listing }], solved: false }
  if (cmd === 'pwd') return { lines: [{ type: 'output', content: p.cwd }], solved: false }
  if (!cmd) return { lines: [], solved: false }
  return { lines: [{ type: 'error', content: `${cmd.split(' ')[0]}: not what this task needs. Try again.` }], solved: false }
}

/** Answer-free view of a puzzle for the browser. No id: some ids name the answer (lx-grep). */
export function toClientPuzzle(p: Puzzle) {
  return p.skill === 'sql'
    ? {
        skill: p.skill, title: p.title, prompt: p.prompt,
        tables: Object.entries(p.db).map(([name, rows]) => ({ name, columns: Object.keys(rows[0] ?? {}) })),
      }
    : { skill: p.skill, title: p.title, prompt: p.prompt, cwd: p.cwd }
}
export type ClientPuzzle = ReturnType<typeof toClientPuzzle>

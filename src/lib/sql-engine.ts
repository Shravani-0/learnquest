import type { QueryResult } from '@/lib/types'

type Value = string | number | null
type Row = Record<string, Value>
type Database = Record<string, Row[]>

export function executeSQL(query: string, db: Database): QueryResult {
  const start = performance.now()
  try {
    const q = query.trim()
    if (!/^SELECT\s/i.test(q)) {
      return err('Only SELECT statements are supported in this environment.', start)
    }
    const result = runSelect(q, db)
    return { ...result, executionTime: Math.round(performance.now() - start) }
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Syntax error in query.', start)
  }
}

function err(msg: string, start: number): QueryResult {
  return { columns: [], rows: [], rowCount: 0, error: msg, executionTime: Math.round(performance.now() - start) }
}

function runSelect(query: string, db: Database): Omit<QueryResult, 'executionTime'> {
  // Normalize whitespace
  const q = query.replace(/\s+/g, ' ').trim()

  // Extract SELECT list
  const selectMatch = q.match(/^SELECT\s+([\s\S]+?)\s+FROM\s/i)
  if (!selectMatch) return { columns: [], rows: [], rowCount: 0, error: 'Invalid SELECT syntax' }
  const selectClause = selectMatch[1].trim()

  // Extract FROM table + alias
  const fromMatch = q.match(/FROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/i)
  if (!fromMatch) return { columns: [], rows: [], rowCount: 0, error: 'Missing FROM clause' }
  const tableName = fromMatch[1].toLowerCase()
  const tableAlias = (fromMatch[2] || fromMatch[1]).toLowerCase()

  if (!db[tableName]) {
    return { columns: [], rows: [], rowCount: 0, error: `Table "${fromMatch[1]}" does not exist. Available tables: ${Object.keys(db).join(', ')}` }
  }

  // Build rows with alias prefix
  let rows: Row[] = db[tableName].map(r => prefixRow(r, tableAlias))

  // Handle JOINs
  const joinRe = /(?:(?:INNER|LEFT|RIGHT)\s+)?JOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?\s+ON\s+(.+?)(?=\s+(?:(?:INNER|LEFT|RIGHT)\s+)?JOIN\b|\s+WHERE\b|\s+ORDER\b|\s+GROUP\b|\s+LIMIT\b|$)/gi
  let jm: RegExpExecArray | null
  while ((jm = joinRe.exec(q)) !== null) {
    const jTable = jm[1].toLowerCase()
    const jAlias = (jm[2] || jm[1]).toLowerCase()
    const onCond = jm[3].trim()
    if (!db[jTable]) return { columns: [], rows: [], rowCount: 0, error: `Table "${jm[1]}" does not exist` }
    const jRows = db[jTable].map(r => prefixRow(r, jAlias))
    const joined: Row[] = []
    for (const lr of rows) {
      for (const rr of jRows) {
        const combined = { ...lr, ...rr }
        if (evalCondition(onCond, combined)) joined.push(combined)
      }
    }
    rows = joined
  }

  // WHERE
  const whereMatch = q.match(/WHERE\s+(.+?)(?=\s+(?:GROUP\s+BY|ORDER\s+BY|LIMIT)\b|$)/i)
  if (whereMatch) {
    rows = rows.filter(r => evalWhere(whereMatch[1].trim(), r))
  }

  // ORDER BY
  const orderMatch = q.match(/ORDER\s+BY\s+([\w.]+)\s*(ASC|DESC)?/i)
  if (orderMatch) {
    const col = orderMatch[1].toLowerCase()
    const dir = (orderMatch[2] || 'ASC').toUpperCase()
    rows.sort((a, b) => {
      const av = getVal(a, col), bv = getVal(b, col)
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return dir === 'ASC' ? av - bv : bv - av
      return dir === 'ASC' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }

  // LIMIT
  const limitMatch = q.match(/LIMIT\s+(\d+)/i)
  if (limitMatch) rows = rows.slice(0, parseInt(limitMatch[1], 10))

  // Project columns
  return project(selectClause, rows)
}

function prefixRow(row: Row, alias: string): Row {
  const out: Row = {}
  for (const [k, v] of Object.entries(row)) {
    out[`${alias}.${k}`] = v
    out[k] = v  // also keep unqualified for convenience
  }
  return out
}

function getVal(row: Row, col: string): Value {
  const lc = col.toLowerCase()
  if (lc in row) return row[lc]
  const k = Object.keys(row).find(x => x.toLowerCase() === lc)
  return k ? row[k] : null
}

function evalCondition(cond: string, row: Row): boolean {
  // table.col = table.col
  const m = cond.match(/([\w.]+)\s*=\s*([\w.]+)/i)
  if (m) {
    const lv = getVal(row, m[1])
    const rv = getVal(row, m[2])
    return lv !== null && String(lv) === String(rv)
  }
  return true
}

function stripOuterParens(s: string): string {
  if (!s.startsWith('(') || !s.endsWith(')')) return s
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++
    else if (s[i] === ')') {
      depth--
      if (depth === 0 && i < s.length - 1) return s
    }
  }
  return s.slice(1, -1).trim()
}

function evalWhere(where: string, row: Row): boolean {
  const stripped = stripOuterParens(where.trim())
  if (stripped !== where.trim()) return evalWhere(stripped, row)
  // Recursively handle AND
  const andParts = splitTop(stripped, /\bAND\b/i)
  if (andParts.length > 1) return andParts.every(p => evalWhere(p.trim(), row))
  // Recursively handle OR
  const orParts = splitTop(stripped, /\bOR\b/i)
  if (orParts.length > 1) return orParts.some(p => evalWhere(p.trim(), row))

  const c = stripped

  // NOT IN
  let m = c.match(/^([\w.]+)\s+NOT\s+IN\s*\((.+)\)$/i)
  if (m) {
    const v = getVal(row, m[1])
    const vals = parseInList(m[2])
    return !vals.some(x => looseEq(x, v))
  }
  // IN
  m = c.match(/^([\w.]+)\s+IN\s*\((.+)\)$/i)
  if (m) {
    const v = getVal(row, m[1])
    const vals = parseInList(m[2])
    return vals.some(x => looseEq(x, v))
  }
  // NOT LIKE
  m = c.match(/^([\w.]+)\s+NOT\s+LIKE\s+'([^']+)'$/i)
  if (m) return !likeTest(m[2], String(getVal(row, m[1]) ?? ''))
  // LIKE
  m = c.match(/^([\w.]+)\s+LIKE\s+'([^']+)'$/i)
  if (m) return likeTest(m[2], String(getVal(row, m[1]) ?? ''))
  // IS NOT NULL
  m = c.match(/^([\w.]+)\s+IS\s+NOT\s+NULL$/i)
  if (m) { const v = getVal(row, m[1]); return v !== null && v !== undefined }
  // IS NULL
  m = c.match(/^([\w.]+)\s+IS\s+NULL$/i)
  if (m) { const v = getVal(row, m[1]); return v === null || v === undefined }
  // Comparison
  m = c.match(/^([\w.]+)\s*(=|!=|<>|<=|>=|<|>)\s*(?:'([^']*)'|(\d+(?:\.\d+)?))$/i)
  if (m) {
    const lv = getVal(row, m[1])
    const op = m[2]
    const rv: Value = m[3] !== undefined ? m[3] : Number(m[4])
    return cmp(lv, op, rv)
  }
  return true
}

function cmp(l: Value, op: string, r: Value): boolean {
  if (l === null || r === null) return (op === '=' || op === '==') ? l === r : (op === '!=' || op === '<>') ? l !== r : false
  const isNum = typeof l === 'number' && typeof r === 'number'
  const ls = isNum ? l : String(l).toLowerCase()
  const rs = isNum ? r : String(r).toLowerCase()
  switch (op) {
    case '=': return ls === rs
    case '!=': case '<>': return ls !== rs
    case '<': return ls < rs
    case '>': return ls > rs
    case '<=': return ls <= rs
    case '>=': return ls >= rs
    default: return false
  }
}

function looseEq(a: Value, b: Value): boolean {
  if (a === null || b === null) return a === b
  return String(a).toLowerCase() === String(b).toLowerCase()
}

function parseInList(s: string): Value[] {
  return s.split(',').map(x => {
    const t = x.trim()
    if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) return t.slice(1, -1)
    return isNaN(Number(t)) ? t : Number(t)
  })
}

function likeTest(pattern: string, value: string): boolean {
  const re = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i')
  return re.test(value)
}

// sep must not have the g flag — a global regex would corrupt lastIndex across loop iterations.
// Quoted-string tokens ('...') are always appended verbatim; sep is only tested on plain-text tokens.
function splitTop(s: string, sep: RegExp): string[] {
  const parts: string[] = []
  let depth = 0, cur = ''
  const tokens = s.split(/(\(|\)|'[^']*')/g)
  for (const t of tokens) {
    if (t === '(') { depth++; cur += t }
    else if (t === ')') { depth--; cur += t }
    else if (t.startsWith("'")) { cur += t }   // quoted string — never split
    else if (depth === 0 && sep.test(t)) {
      const subParts = t.split(sep)
      cur += subParts[0]
      for (let i = 1; i < subParts.length; i++) {
        parts.push(cur)
        cur = subParts[i]
      }
    }
    else { cur += t }
  }
  if (cur.trim()) parts.push(cur)
  return parts.length > 1 ? parts : [s]
}

function project(sel: string, rows: Row[]): Omit<QueryResult, 'executionTime'> {
  if (rows.length === 0) {
    if (sel.trim() === '*') return { columns: [], rows: [], rowCount: 0 }
    return { columns: sel.split(',').map(c => c.trim().split('.').pop()!.toLowerCase()), rows: [], rowCount: 0 }
  }

  const firstRow = rows[0]

  // COUNT(*)
  if (/^COUNT\(\*\)$/i.test(sel.trim())) {
    return { columns: ['count(*)'], rows: [{ 'count(*)': rows.length }], rowCount: 1 }
  }

  // Expand *
  if (sel.trim() === '*') {
    const cols = Object.keys(firstRow).filter(k => !k.includes('.'))
    const projected = rows.map(r => { const o: Row = {}; for (const c of cols) o[c] = getVal(r, c); return o })
    return { columns: cols, rows: projected, rowCount: projected.length }
  }

  // Table.* expansion
  if (/^\w+\.\*$/.test(sel.trim())) {
    const alias = sel.trim().split('.')[0].toLowerCase()
    const cols = Object.keys(firstRow).filter(k => k.startsWith(alias + '.'))
      .map(k => k.replace(alias + '.', ''))
    const projected = rows.map(r => {
      const o: Row = {}
      for (const c of cols) o[c] = getVal(r, `${alias}.${c}`) ?? getVal(r, c)
      return o
    })
    return { columns: cols, rows: projected, rowCount: projected.length }
  }

  // Named columns
  const parts = sel.split(',').map(p => p.trim())
  const cols: string[] = []
  for (const p of parts) {
    if (p === '*') { cols.push(...Object.keys(firstRow).filter(k => !k.includes('.'))); continue }
    if (/^\w+\.\*$/.test(p)) {
      const alias = p.split('.')[0].toLowerCase()
      cols.push(...Object.keys(firstRow).filter(k => k.startsWith(alias + '.')).map(k => k.replace(alias + '.', '')))
      continue
    }
    const alias_match = p.match(/(?:\w+\.)?(\w+)(?:\s+(?:AS\s+)?(\w+))?$/i)
    if (alias_match) cols.push((alias_match[2] || alias_match[1]).toLowerCase())
    else cols.push(p.toLowerCase())
  }

  const projected = rows.map(r => {
    const o: Row = {}
    let ci = 0
    for (const p of parts) {
      if (p === '*') {
        const keys = Object.keys(firstRow).filter(k => !k.includes('.'))
        for (const k of keys) { o[k] = getVal(r, k); ci++ }
        continue
      }
      if (/^\w+\.\*$/.test(p)) {
        const alias = p.split('.')[0].toLowerCase()
        const keys = Object.keys(firstRow).filter(k => k.startsWith(alias + '.')).map(k => k.replace(alias + '.', ''))
        for (const k of keys) { o[k] = getVal(r, `${alias}.${k}`) ?? getVal(r, k); ci++ }
        continue
      }
      const cm = p.match(/^([\w.]+)(?:\s+(?:AS\s+)?(\w+))?$/i)
      const srcCol = cm ? cm[1] : p
      const dstCol = cols[ci] || p
      o[dstCol] = getVal(r, srcCol)
      ci++
    }
    return o
  })

  return { columns: cols, rows: projected, rowCount: projected.length }
}

export function getTableNames(db: Database): string[] {
  return Object.keys(db)
}

export function getTableSchema(db: Database, table: string): string[] {
  const rows = db[table.toLowerCase()]
  if (!rows || rows.length === 0) return []
  return Object.keys(rows[0])
}

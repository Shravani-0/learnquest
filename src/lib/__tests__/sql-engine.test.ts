import { describe, it, expect } from 'vitest'
import { executeSQL } from '../sql-engine'

// Minimal DB used across tests
const db = {
  crime: [
    { date: 20240103, type: 'murder',  city: 'River City',  note: 'bridge' },
    { date: 20240101, type: 'theft',   city: 'River City',  note: 'library' },
    { date: 20240105, type: 'assault', city: 'Harbor Town', note: 'bar' },
  ],
  person: [
    { id: 1, name: 'Alice And Bob', street: 'Maple Lane',  num: 10 },
    { id: 2, name: 'Carol Drew',    street: 'Maple Lane',  num: 67 },
    { id: 3, name: 'Dave East',     street: 'Oak Street',  num: 5  },
    { id: 4, name: 'Eve Or Adams',  street: 'Canal Street', num: 12 },
  ],
  item: [
    { person_id: 1, label: 'bag',  value: 100 },
    { person_id: 2, label: 'coat', value: 200 },
    { person_id: 3, label: 'hat',  value: 150 },
  ],
}

// ── AND conditions with quoted strings ────────────────────────────────────────

describe('WHERE AND with quoted strings', () => {
  it('returns only the matching row when all AND conditions use quoted strings', () => {
    const res = executeSQL(
      "SELECT * FROM crime WHERE date = 20240103 AND type = 'murder' AND city = 'River City'",
      db,
    )
    expect(res.error).toBeUndefined()
    expect(res.rowCount).toBe(1)
    expect(res.rows[0].type).toBe('murder')
  })

  it('returns nothing when AND chain is unsatisfiable', () => {
    const res = executeSQL(
      "SELECT * FROM crime WHERE type = 'murder' AND city = 'Harbor Town'",
      db,
    )
    expect(res.error).toBeUndefined()
    expect(res.rowCount).toBe(0)
  })

  it('filters correctly when quoted string comes first in AND chain', () => {
    const res = executeSQL(
      "SELECT * FROM person WHERE street = 'Maple Lane' AND num = 67",
      db,
    )
    expect(res.error).toBeUndefined()
    expect(res.rowCount).toBe(1)
    expect(res.rows[0].name).toBe('Carol Drew')
  })
})

// ── OR conditions with quoted strings ────────────────────────────────────────

describe('WHERE OR with quoted strings', () => {
  it('returns rows matching either OR branch', () => {
    const res = executeSQL(
      "SELECT * FROM crime WHERE type = 'murder' OR type = 'theft'",
      db,
    )
    expect(res.error).toBeUndefined()
    expect(res.rowCount).toBe(2)
  })

  it('does not over-match OR: excludes rows that satisfy neither branch', () => {
    const res = executeSQL(
      "SELECT * FROM crime WHERE type = 'murder' OR type = 'theft'",
      db,
    )
    expect(res.rows.every(r => r.type === 'murder' || r.type === 'theft')).toBe(true)
  })
})

// ── Quoted strings that contain the word AND / OR ─────────────────────────────

describe('quoted strings containing AND/OR are not split', () => {
  it('name containing " And " does not cause a false split', () => {
    // "Alice And Bob" contains "And" but should be treated as a single value
    const res = executeSQL(
      "SELECT * FROM person WHERE name = 'Alice And Bob'",
      db,
    )
    expect(res.error).toBeUndefined()
    expect(res.rowCount).toBe(1)
    expect(res.rows[0].id).toBe(1)
  })

  it('name containing " Or " does not cause a false split', () => {
    const res = executeSQL(
      "SELECT * FROM person WHERE name = 'Eve Or Adams'",
      db,
    )
    expect(res.error).toBeUndefined()
    expect(res.rowCount).toBe(1)
    expect(res.rows[0].id).toBe(4)
  })
})

// ── Mixed nesting: (A AND B) OR (C AND D) ────────────────────────────────────

describe('parenthesized groups with AND/OR', () => {
  it('evaluates (A AND B) OR (C AND D) correctly', () => {
    const res = executeSQL(
      "SELECT * FROM person WHERE (street = 'Maple Lane' AND num = 10) OR (street = 'Canal Street' AND num = 12)",
      db,
    )
    expect(res.error).toBeUndefined()
    expect(res.rowCount).toBe(2)
    const names = res.rows.map(r => r.name).sort()
    expect(names).toEqual(['Alice And Bob', 'Eve Or Adams'])
  })

  it('does not match rows that satisfy neither group', () => {
    const res = executeSQL(
      "SELECT * FROM person WHERE (street = 'Maple Lane' AND num = 10) OR (street = 'Canal Street' AND num = 12)",
      db,
    )
    expect(res.rows.every(r => r.id === 1 || r.id === 4)).toBe(true)
  })
})

// ── JOIN queries ──────────────────────────────────────────────────────────────

describe('JOIN with WHERE on joined columns', () => {
  it('joins two tables and filters on a quoted string from the joined table', () => {
    const res = executeSQL(
      "SELECT p.name, i.label FROM person p JOIN item i ON p.id = i.person_id WHERE i.label = 'coat'",
      db,
    )
    expect(res.error).toBeUndefined()
    expect(res.rowCount).toBe(1)
    expect(res.rows[0].name).toBe('Carol Drew')
    expect(res.rows[0].label).toBe('coat')
  })
})

// ── Single condition baseline ────────────────────────────────────────────────

describe('single-condition WHERE', () => {
  it('handles a single numeric comparison correctly', () => {
    const res = executeSQL('SELECT * FROM person WHERE num = 67', db)
    expect(res.error).toBeUndefined()
    expect(res.rowCount).toBe(1)
    expect(res.rows[0].name).toBe('Carol Drew')
  })

  it('handles a single quoted-string comparison correctly', () => {
    const res = executeSQL("SELECT * FROM crime WHERE city = 'Harbor Town'", db)
    expect(res.error).toBeUndefined()
    expect(res.rowCount).toBe(1)
    expect(res.rows[0].type).toBe('assault')
  })

  it('handles LIKE with %', () => {
    const res = executeSQL("SELECT * FROM person WHERE name LIKE 'Carol%'", db)
    expect(res.error).toBeUndefined()
    expect(res.rowCount).toBe(1)
  })
})

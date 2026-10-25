'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { SchemaRelationship } from '@/lib/quests/types'

// ── Layout constants ──────────────────────────────────────────────────────────
const CARD_W = 204
const HEADER_H = 40
const ROW_H = 24
const COL_GAP = 22
const ROW_GAP = 22
const PAD = 14

function cardH(cols: string[]) {
  return HEADER_H + cols.length * ROW_H + 8
}

function colKey(colName: string): 'pk' | 'fk' | null {
  if (colName === 'id') return 'pk'
  if (colName.endsWith('_id') || colName === 'ssn' || colName === 'membership_id') return 'fk'
  return null
}

type Layout = Record<string, { x: number; y: number }>
type Point = { x: number; y: number }

/** Space on the right of a single-column map for relationship curves. */
const CURVE_GUTTER = 56

/** Natural column count for a schema (desktop). */
function naturalCols(n: number) {
  return Math.min(3, Math.max(1, n))
}

/** Canvas width needed for `cols` columns. */
function widthFor(cols: number) {
  return PAD * 2 + cols * CARD_W + (cols - 1) * COL_GAP + (cols === 1 ? CURVE_GUTTER : 0)
}

/**
 * Columns to use for a container width: the most that fit while keeping the
 * table text near full size, so phones reflow to 2 or 1 columns instead of
 * shrinking the whole map into unreadable type.
 */
function colsForWidth(w: number, n: number) {
  for (let c = naturalCols(n); c > 1; c--) if (w / widthFor(c) >= 0.85) return c
  return 1
}

function buildLayout(schema: Record<string, string[]>, maxCols: number): { layout: Layout; canvasW: number; canvasH: number; cols: number } {
  const names = Object.keys(schema)
  const n = names.length
  const COLS = Math.min(naturalCols(n), Math.max(1, maxCols))

  // Group into rows
  const rows: string[][] = []
  for (let i = 0; i < names.length; i += COLS) rows.push(names.slice(i, i + COLS))

  // Compute row heights
  const rowHeights = rows.map(row => Math.max(...row.map(t => cardH(schema[t]))))

  // Cumulative y offsets
  const cumY: number[] = [PAD]
  for (let i = 0; i < rowHeights.length - 1; i++) cumY.push(cumY[i] + rowHeights[i] + ROW_GAP)

  const layout: Layout = {}
  names.forEach((name, idx) => {
    const col = idx % COLS
    const row = Math.floor(idx / COLS)
    layout[name] = { x: PAD + col * (CARD_W + COL_GAP), y: cumY[row] }
  })

  const lastRowH = rowHeights[rowHeights.length - 1]
  const canvasW = widthFor(COLS)
  const canvasH = cumY[cumY.length - 1] + lastRowH + PAD

  return { layout, canvasW, canvasH, cols: COLS }
}

function anchor(table: string, col: string, side: 'left' | 'right', layout: Layout, schema: Record<string, string[]>): Point {
  const pos = layout[table]
  if (!pos) return { x: 0, y: 0 }
  const colIdx = schema[table]?.indexOf(col) ?? 0
  const y = pos.y + HEADER_H + (colIdx >= 0 ? colIdx : 0) * ROW_H + ROW_H / 2
  return { x: side === 'left' ? pos.x : pos.x + CARD_W, y }
}

function relPath(
  rel: SchemaRelationship,
  layout: Layout,
  schema: Record<string, string[]>,
): { a: Point; b: Point; d: string } | null {
  if (!layout[rel.from] || !layout[rel.to]) return null
  const fromPos = layout[rel.from]
  const toPos = layout[rel.to]
  // Same column (single-column phone layout): both ends exit right and the
  // curve bulges into the gutter instead of crossing the cards.
  const sameCol = fromPos.x === toPos.x
  const aSide: 'left' | 'right' = sameCol || fromPos.x + CARD_W <= toPos.x ? 'right' : 'left'
  const bSide: 'left' | 'right' = sameCol ? 'right' : aSide === 'right' ? 'left' : 'right'
  const a = anchor(rel.from, rel.fromCol, aSide, layout, schema)
  const b = anchor(rel.to, rel.toCol, bSide, layout, schema)
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.45)
  const c1 = { x: a.x + (aSide === 'right' ? dx : -dx), y: a.y }
  const c2 = { x: b.x + (bSide === 'right' ? dx : -dx), y: b.y }
  return { a, b, d: `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}` }
}

function inferRelationships(schema: Record<string, string[]>): SchemaRelationship[] {
  const tables = Object.keys(schema)
  const rels: SchemaRelationship[] = []
  tables.forEach(tableName => {
    schema[tableName].forEach(col => {
      if (col.endsWith('_id') && col !== 'id') {
        const prefix = col.slice(0, -3)
        const target = tables.find(t => t === prefix)
        if (target) {
          rels.push({ from: tableName, fromCol: col, to: target, toCol: 'id' })
        }
      }
    })
  })
  return rels
}

// ── Components ────────────────────────────────────────────────────────────────

interface SchemaMapProps {
  schema: Record<string, string[]>
  relationships?: SchemaRelationship[]
  focusTables?: string[]
  onTablePick?: (table: string) => void
}

export function SchemaMap({ schema, relationships, focusTables, onTablePick }: SchemaMapProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [hover, setHover] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [maxCols, setMaxCols] = useState(3)
  const wrapRef = useRef<HTMLDivElement>(null)

  const { layout, canvasW, canvasH } = useMemo(() => buildLayout(schema, maxCols), [schema, maxCols])

  const rels: SchemaRelationship[] = useMemo(
    () => relationships ?? inferRelationships(schema),
    [relationships, schema],
  )

  // Scale-to-fit
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const n = Object.keys(schema).length
    const fit = () => {
      const w = el.clientWidth - 2
      const cols = colsForWidth(w, n)
      setMaxCols(cols)
      setScale(Math.min(1, Math.max(0.42, w / widthFor(Math.min(cols, naturalCols(n))))))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [schema])

  // Related-to-hover set
  const relatedTo = useMemo(() => {
    const s = new Set<string>()
    if (!hover) return s
    rels.forEach(r => {
      if (r.from === hover) s.add(r.to)
      if (r.to === hover) s.add(r.from)
    })
    return s
  }, [hover, rels])

  const onPick = useCallback((name: string) => {
    onTablePick?.(name)
  }, [onTablePick])

  const focusSet = new Set(focusTables ?? [])
  const tableNames = Object.keys(schema)

  return (
    <div
      className="rounded-none overflow-hidden"
      style={{ background: 'var(--c-elev)', border: '1px solid var(--c-line)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 flex-wrap px-4 py-3 border-b"
        style={{ borderColor: 'var(--c-line)', background: 'var(--c-elev)' }}
      >
        <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap min-w-0">
          <svg viewBox="0 0 24 24" width="15" height="15" style={{ color: 'var(--c-accent)', flexShrink: 0 }}>
            <ellipse cx="12" cy="6" rx="7" ry="3" fill="none" stroke="currentColor" strokeWidth="2"/>
            <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span className="font-display text-sm font-semibold" style={{ color: 'var(--c-ink)' }}>Database Schema</span>
          <span className="font-mono text-[11px]" style={{ color: 'var(--c-faint)' }}>{tableNames.length} tables · click a table to query it</span>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <span className="flex items-center gap-1.5 font-mono text-[11px]" style={{ color: 'var(--c-muted)' }}>
            <i className="inline-block w-2 h-2 rounded-none" style={{ background: 'var(--c-accent)' }} />pk
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px]" style={{ color: 'var(--c-muted)' }}>
            <i className="inline-block w-2 h-2 rounded-none" style={{ background: 'var(--c-ink)' }} />fk
          </span>
          <button
            onClick={() => setIsOpen(o => !o)}
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] px-2.5 py-1 min-h-[36px] lg:min-h-0 rounded-none transition-colors hover:!border-[var(--c-accent)] hover:!text-[var(--c-accent)]"
            style={{
              background: 'transparent',
              border: '1px solid var(--c-line-2)',
              color: 'var(--c-muted)',
            }}
          >
            {isOpen ? 'Hide ▴' : 'Show ▾'}
          </button>
        </div>
      </div>

      {/* ERD canvas */}
      {isOpen && (
        <div
          ref={wrapRef}
          className="overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(rgb(242 240 230 / 0.05) 1px, transparent 1px), linear-gradient(90deg, rgb(242 240 230 / 0.05) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            background: `
              linear-gradient(rgb(242 240 230 / 0.05) 1px, transparent 1px) 0 0 / 24px 24px,
              linear-gradient(90deg, rgb(242 240 230 / 0.05) 1px, transparent 1px) 0 0 / 24px 24px,
              #141414
            `,
            padding: '4px',
          }}
        >
          <div style={{ height: canvasH * scale, position: 'relative' }}>
            <div
              style={{
                width: canvasW,
                height: canvasH,
                position: 'relative',
                transformOrigin: 'top left',
                transform: `scale(${scale})`,
              }}
            >
              {/* SVG connector lines */}
              <svg
                width={canvasW}
                height={canvasH}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 1 }}
              >
                {rels.map((rel, i) => {
                  const path = relPath(rel, layout, schema)
                  if (!path) return null
                  const lit = hover && (rel.from === hover || rel.to === hover)
                  const dim = hover && !lit
                  return (
                    <g key={i} style={{ opacity: dim ? 0.2 : 1, transition: 'opacity 0.15s' }}>
                      <path
                        d={path.d}
                        fill="none"
                        stroke={lit ? 'var(--c-accent)' : 'rgb(242 240 230 / 0.22)'}
                        strokeWidth={lit ? 2.2 : 1.5}
                        style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
                      />
                      <circle cx={path.a.x} cy={path.a.y} r={3} fill={lit ? 'var(--c-accent)' : 'rgb(242 240 230 / 0.3)'} style={{ transition: 'fill 0.15s' }} />
                      <circle cx={path.b.x} cy={path.b.y} r={3} fill={lit ? 'var(--c-accent)' : 'rgb(242 240 230 / 0.3)'} style={{ transition: 'fill 0.15s' }} />
                    </g>
                  )
                })}
              </svg>

              {/* Table cards */}
              {tableNames.map(name => {
                const pos = layout[name]
                const cols = schema[name]
                const isHovered = hover === name
                const isRelated = relatedTo.has(name)
                const inFocus = focusSet.has(name)
                const isDimmed = hover
                  ? !isHovered && !isRelated
                  : focusTables && focusTables.length > 0
                    ? !inFocus
                    : false

                return (
                  <div
                    key={name}
                    style={{
                      position: 'absolute',
                      left: pos.x,
                      top: pos.y,
                      width: CARD_W,
                      zIndex: isHovered ? 4 : isRelated ? 3 : 2,
                      borderRadius: 0,
                      overflow: 'hidden',
                      border: isHovered
                        ? '1px solid var(--c-accent)'
                        : isRelated
                          ? '1px solid rgb(var(--accent-rgb) / 0.5)'
                          : inFocus && !hover
                            ? '1px solid rgb(var(--accent-rgb) / 0.4)'
                            : '1px solid var(--c-line-2)',
                      background: 'var(--c-elev)',
                      boxShadow: 'none',
                      opacity: isDimmed ? 0.35 : 1,
                      transform: isHovered ? 'translateY(-2px)' : 'none',
                      transition: 'opacity 0.15s, transform 0.15s, border-color 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={() => setHover(name)}
                    onMouseLeave={() => setHover(null)}
                  >
                    {/* Card header (clickable) */}
                    <button
                      onClick={() => onPick(name)}
                      title={`SELECT * FROM ${name}`}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        height: HEADER_H,
                        padding: '0 12px',
                        background: 'var(--c-elev-2)',
                        border: 'none',
                        borderBottom: '1px solid var(--c-line)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 0,
                          background: isHovered ? 'var(--c-accent)' : 'var(--c-faint)',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--c-ink)',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--c-accent)',
                          opacity: isHovered ? 1 : 0,
                          transition: 'opacity 0.15s',
                        }}
                      >
                        ▸
                      </span>
                    </button>

                    {/* Columns */}
                    {cols.map(col => {
                      const k = colKey(col)
                      return (
                        <div
                          key={col}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            height: ROW_H,
                            padding: '0 12px',
                            fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
                            fontSize: 11,
                          }}
                        >
                          <span
                            style={{
                              width: 12,
                              textAlign: 'center',
                              fontSize: 11,
                              flexShrink: 0,
                              color: k === 'pk' ? 'var(--c-accent)' : k === 'fk' ? 'var(--c-ink)' : 'transparent',
                              fontWeight: 700,
                            }}
                          >
                            {k === 'pk' ? '⬥' : k === 'fk' ? '↗' : ''}
                          </span>
                          <span
                            style={{
                              flex: 1,
                              color: k === 'pk'
                                ? 'var(--c-accent)'
                                : k === 'fk'
                                  ? 'var(--c-ink)'
                                  : 'var(--c-muted)',
                              fontWeight: k === 'pk' ? 600 : 400,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {col}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

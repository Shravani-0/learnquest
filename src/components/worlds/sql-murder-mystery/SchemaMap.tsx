'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { SchemaRelationship } from '@/lib/data/murder-mystery-levels'

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

function buildLayout(schema: Record<string, string[]>): { layout: Layout; canvasW: number; canvasH: number; cols: number } {
  const names = Object.keys(schema)
  const n = names.length
  const COLS = n <= 3 ? (n === 1 ? 1 : n) : n <= 6 ? 3 : 3

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
  const canvasW = PAD * 2 + COLS * CARD_W + (COLS - 1) * COL_GAP
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
  const aSide: 'left' | 'right' = fromPos.x + CARD_W <= toPos.x ? 'right' : 'left'
  const bSide: 'left' | 'right' = aSide === 'right' ? 'left' : 'right'
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
  const wrapRef = useRef<HTMLDivElement>(null)

  const { layout, canvasW, canvasH } = useMemo(() => buildLayout(schema), [schema])

  const rels: SchemaRelationship[] = useMemo(
    () => relationships ?? inferRelationships(schema),
    [relationships, schema],
  )

  // Scale-to-fit
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const fit = () => {
      const w = el.clientWidth - 2
      setScale(Math.min(1, Math.max(0.42, w / canvasW)))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [canvasW])

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
      className="rounded-xl overflow-hidden"
      style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 flex-wrap px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(10,10,20,0.6)' }}
      >
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" width="15" height="15" style={{ color: '#5AA9FF', flexShrink: 0 }}>
            <ellipse cx="12" cy="6" rx="7" ry="3" fill="none" stroke="currentColor" strokeWidth="2"/>
            <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span className="text-sm font-semibold" style={{ color: 'rgba(236,237,242,0.9)' }}>Database Schema</span>
          <span className="text-[11px]" style={{ color: 'rgba(236,237,242,0.35)' }}>{tableNames.length} tables · click a table to query it</span>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(236,237,242,0.35)' }}>
            <i className="inline-block w-2 h-2 rounded-sm" style={{ background: '#FFB23E' }} />pk
          </span>
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(236,237,242,0.35)' }}>
            <i className="inline-block w-2 h-2 rounded-sm" style={{ background: '#5AA9FF' }} />fk
          </span>
          <button
            onClick={() => setIsOpen(o => !o)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(236,237,242,0.55)',
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
            backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            background: `
              linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px) 0 0 / 24px 24px,
              linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px) 0 0 / 24px 24px,
              #0a0a14
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
                        stroke={lit ? '#7C5CFF' : 'rgba(255,255,255,0.18)'}
                        strokeWidth={lit ? 2.2 : 1.5}
                        style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
                      />
                      <circle cx={path.a.x} cy={path.a.y} r={3} fill={lit ? '#7C5CFF' : 'rgba(255,255,255,0.25)'} style={{ transition: 'fill 0.15s' }} />
                      <circle cx={path.b.x} cy={path.b.y} r={3} fill={lit ? '#7C5CFF' : 'rgba(255,255,255,0.25)'} style={{ transition: 'fill 0.15s' }} />
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
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: isHovered
                        ? '1px solid #7C5CFF'
                        : isRelated
                          ? '1px solid rgba(124,92,255,0.45)'
                          : inFocus && !hover
                            ? '1px solid rgba(124,92,255,0.35)'
                            : '1px solid rgba(255,255,255,0.1)',
                      background: '#14141e',
                      boxShadow: isHovered
                        ? '0 0 0 2px rgba(124,92,255,0.28), 0 14px 28px rgba(0,0,0,0.5)'
                        : '0 8px 20px rgba(0,0,0,0.4)',
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
                        background: '#1c1c28',
                        border: 'none',
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: '#5AA9FF',
                          boxShadow: '0 0 6px #5AA9FF',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'rgba(236,237,242,0.9)',
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
                          fontSize: 10,
                          color: '#7C5CFF',
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
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 11,
                          }}
                        >
                          <span
                            style={{
                              width: 12,
                              textAlign: 'center',
                              fontSize: 9.5,
                              flexShrink: 0,
                              color: k === 'pk' ? '#FFB23E' : k === 'fk' ? '#5AA9FF' : 'transparent',
                              fontWeight: 700,
                            }}
                          >
                            {k === 'pk' ? '⬥' : k === 'fk' ? '↗' : ''}
                          </span>
                          <span
                            style={{
                              flex: 1,
                              color: k === 'pk'
                                ? 'rgba(236,237,242,0.92)'
                                : k === 'fk'
                                  ? '#a8caff'
                                  : 'rgba(236,237,242,0.55)',
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

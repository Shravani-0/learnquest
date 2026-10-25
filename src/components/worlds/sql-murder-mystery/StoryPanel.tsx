'use client'

interface MissionBriefProps {
  intro: string
  hasMastermind?: boolean
}

export function MissionBrief({ intro, hasMastermind }: MissionBriefProps) {
  const plainIntro = intro.replace(/\*\*(.+?)\*\*/g, '$1')

  return (
    <div
      className="rounded-none overflow-hidden"
      style={{ background: 'var(--c-elev)', border: '1px solid var(--c-line)' }}
    >
      <div
        className="flex items-center gap-2.5 px-4 py-3.5 border-b"
        style={{ borderColor: 'var(--c-line)' }}
      >
        <span style={{ color: 'var(--c-accent)', fontSize: 18, lineHeight: 1 }}>❝</span>
        <h2 className="font-display text-sm font-semibold" style={{ color: 'var(--c-ink)', letterSpacing: '0.01em' }}>
          Case Brief
        </h2>
      </div>

      <div className="px-4 py-4">
        <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--c-muted)' }}>
          {plainIntro}
        </p>

        <div
          className="px-3.5 py-3 rounded-none"
          style={{
            background: 'rgb(var(--accent-rgb) / 0.08)',
            border: '1px solid rgb(var(--accent-rgb) / 0.4)',
          }}
        >
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--c-accent)' }}>
            Your objective
          </p>
          <p className="text-[13px] leading-snug" style={{ color: 'var(--c-ink)' }}>
            Find the killer{hasMastermind ? ' — and expose who hired them' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}

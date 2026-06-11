'use client'

interface MissionBriefProps {
  intro: string
  mastermindName?: string
}

export function MissionBrief({ intro, mastermindName }: MissionBriefProps) {
  const plainIntro = intro.replace(/\*\*(.+?)\*\*/g, '$1')

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#14141e', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div
        className="flex items-center gap-2.5 px-4 py-3.5 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <span style={{ color: '#7C5CFF', fontSize: 18, lineHeight: 1 }}>❝</span>
        <h2 className="text-sm font-semibold" style={{ color: 'rgba(236,237,242,0.9)', letterSpacing: '0.01em' }}>
          Case Brief
        </h2>
      </div>

      <div className="px-4 py-4">
        <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'rgba(236,237,242,0.6)' }}>
          {plainIntro}
        </p>

        <div
          className="px-3.5 py-3 rounded-lg"
          style={{
            background: 'color-mix(in srgb, #FFB23E 8%, #1a1a24)',
            border: '1px solid rgba(255,178,62,0.25)',
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#FFB23E' }}>
            Your objective
          </p>
          <p className="text-[13px] leading-snug" style={{ color: 'rgba(236,237,242,0.9)' }}>
            Find the killer{mastermindName ? ' — and expose who hired them' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}

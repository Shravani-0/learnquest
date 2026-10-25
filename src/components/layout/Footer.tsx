import Link from 'next/link'

const columns = {
  Worlds: [
    { label: 'SQL Murder Mystery', href: '/adventures/sql-murder-mystery' },
    { label: 'Linux Prison Break', href: '/adventures/linux-prison-break' },
    { label: 'All quests', href: '/adventures' },
  ],
  Platform: [
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Leaderboard', href: '/#community' },
    { label: 'Dashboard', href: '/dashboard' },
  ],
}

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="sq-footer sq">
      <div className="sq-shell">
        <p className="sq-footer__word">
          un<b>rust</b>
        </p>

        <div className="sq-footer__grid">
          <div className="sq-footer__col">
            <p className="sq-footer__blurb">
              A terminal you learn from. Real SQL, real shells, real Git, wrapped in stories worth
              finishing. No fluff, no filler.
            </p>
            <p className="sq-footer__prompt">
              <span className="sq-term__ps1">guest@unrust:~$</span> logout
              <span className="sq-caret" aria-hidden="true" />
            </p>
          </div>

          {Object.entries(columns).map(([title, links]) => (
            <div className="sq-footer__col" key={title}>
              <p className="sq-footer__h">{title}</p>
              <ul>
                {links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="sq-draw">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="sq-footer__bar">
          <span>© {year} unrust · learn by playing</span>
          <span>set in Space Grotesk &amp; JetBrains Mono</span>
          <span style={{ display: 'inline-flex', gap: '1.2rem' }}>
            <Link href="#" className="sq-draw">Privacy</Link>
            <Link href="#" className="sq-draw">Terms</Link>
          </span>
        </div>
      </div>
    </footer>
  )
}

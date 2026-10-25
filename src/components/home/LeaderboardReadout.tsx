import Link from 'next/link'
import { leaderboard } from '@/lib/data/achievements'

export default function LeaderboardReadout() {
  const top = leaderboard.slice(0, 8)
  return (
    <section id="community" className="sq-section" aria-labelledby="sq-board-h">
      <div className="sq-shell sq-board">
        <div className="sq-board__copy">
          <p className="sq-kicker" data-reveal="fade">leaderboard</p>
          <h2 id="sq-board-h" className="sq-display sq-section__title" data-split="lines">
            The board doesn&rsquo;t lie.
          </h2>
          <p className="sq-section__lead" data-reveal="up">
            XP is earned by clearing real levels, never by showing up. Keep a daily streak, climb the
            ranks, and see where you stand across every world.
          </p>
          <ul className="sq-board__points" data-reveal="up">
            <li>Streaks that reward daily reps</li>
            <li>XP that maps to actual skill</li>
            <li>One rank across all worlds</li>
          </ul>
          <Link href="/dashboard" className="sq-btn" data-reveal="up">
            <span className="sq-btn__fill" aria-hidden="true" />
            Join the board
            <span className="sq-arrow" aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="sq-readout sq-board__panel" data-reveal="clip">
          <div className="sq-readout__bar">
            <span className="sq-dot">●</span>
            <b>guest@unrust</b>:~$ top --sort=xp
            <span className="sq-readout__note"># sample board</span>
          </div>
          <ol className="sq-board__list">
            {top.map((e) => (
              <li key={e.rank} className="sq-lrow">
                <span className="sq-lrow__rank sq-num">
                  {String(e.rank).padStart(2, '0')}
                </span>
                <span className="sq-lrow__name">
                  <span aria-hidden="true" className="sq-lrow__badge">{e.badge}</span> {e.displayName}
                </span>
                <span className="sq-lrow__lvl">lv{e.level}</span>
                <span className="sq-lrow__xp sq-num">{e.xp.toLocaleString()} XP</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

const STEPS = [
  {
    n: '01',
    cmd: 'pick',
    title: 'Pick a world',
    body: 'Every world is a real skill.',
  },
  {
    n: '02',
    cmd: 'play',
    title: 'Run real commands',
    body: 'The story moves when your code works.',
  },
  {
    n: '03',
    cmd: 'earn',
    title: 'Bank the XP',
    body: 'Clear a level, keep the XP.',
  },
  {
    n: '04',
    cmd: 'keep',
    title: 'Keep the skill',
    body: 'You did it for real, so it sticks.',
  },
]

// Colour-blocked from the palette: dark, chalk, dark, hazard.
const BLOCK = ['', 'sq-block--chalk', '', 'sq-block--hazard']

export default function Pipeline() {
  return (
    <section id="how-it-works" className="sq-section" aria-labelledby="sq-how-h">
      <div className="sq-shell">
        <header className="sq-section__head">
          <p className="sq-kicker" data-reveal="fade">the loop</p>
          <h2 id="sq-how-h" className="sq-display sq-section__title" data-split="lines">
            Play. Run. Earn. Keep.
          </h2>
          <p className="sq-section__lead" data-reveal="up">
            Same four steps in every world.
          </p>
        </header>

        <div className="sq-pipe" data-reveal="clip">
          {STEPS.map((s, i) => (
            <div key={s.n} className={`sq-pipe__cell${BLOCK[i] ? ` ${BLOCK[i]}` : ''}`}>
              <span className="sq-pipe__n">
                {s.n} <span className="sq-pipe__pipe" aria-hidden="true">|</span> {s.cmd}
              </span>
              <h3 className="sq-display sq-pipe__title">{s.title}</h3>
              <p className="sq-pipe__body">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Per-skill ASCII motif for the systems-index preview. Honest generative art, not a fake screenshot.
const ART: Record<string, string> = {
  SQL: `┌─────┬────────┐
│ id  │ suspect │
├─────┼────────┤
│ 03  │  ????   │
└─────┴────────┘
> WHERE guilt = 1`,
  Linux: `guest@cell-42:~$ ls
walls/  door.lock
guest@cell-42:~$ cat
key.sh  > run it
guest@cell-42:~$ _`,
  Git: `*───┐  main
│   *  hotfix
*───┘  merge
│ rebase --onto
HEAD~3`,
  Cybersecurity: `[####------] 40%
> recon target
0x4F 0x2A 0x9C
creds: exposed
access: pending`,
  JavaScript: `function boot() {
  for (bot of line)
    bot.online()
}
// 7 offline`,
  'Data Analysis': `AR-7 sensors
▁▂▄▆█▇▅▃▂ o2
anomaly ↑ deck 4
corr = 0.91`,
}

export default function WorldArt({ skill, signal }: { skill: string; signal: string }) {
  return (
    <pre
      className="sq-art"
      style={{ color: signal }}
      aria-hidden="true"
    >
      {ART[skill] ?? `> ${skill}\n> loading...`}
    </pre>
  )
}

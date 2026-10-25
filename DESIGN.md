# SkillQuest — Award-caliber redesign (DESIGN.md)

Living design doc for the awwwards-pass home redesign. The engine is plumbing; the look lives
here and in the components.

## Phase 0 — Brief

- **Subject:** SkillQuest (brand name in code; the repo dir is "learnquest"). A platform where you
  learn real tech skills by *playing* narrative games: solve a murder with SQL, break out of a
  Linux prison with the terminal, fix a broken timeline with Git, and more.
- **Audience:** self-taught developers, students, career-switchers who bounce off dry tutorials and
  want to learn by doing. Secondary: recruiters/skeptics who need the product to look credible fast.
- **The site's job:** make a stranger *get it* in 3 seconds (you operate real systems to learn),
  want to try a world, and start one. Primary action: **start a world** (→ `/adventures/<slug>`).
  Secondary: browse all quests (`/adventures`), sign in (`/login`).
- **Brief in the owner's words:** "a raw tech website anyone can learn from through playing games —
  underground vibes but elite and sleek. You can change the colour combination."
- **Scope of this pass:** the home page (`/`), the shared chrome (Navbar, Footer), a designed 404,
  the loader + first-load continuity, and the motion system. The `/adventures` catalog, world
  detail pages, dashboard, game runtimes and auth pages are left functional and inherit the new
  chrome/tokens; they are a candidate follow-up, not this pass.
- **Real content (no invented credentials):** 6 worlds from `src/lib/data/adventures.ts` — 2
  playable (SQL Murder Mystery, Linux Prison Break), 4 coming soon (Git, Hacker Academy, Robot
  Factory, Space Mission Control). Leaderboard (8 entries) and stats come from the existing data
  files. Marketing numbers (learner counts, completion rate) are the owner's existing figures,
  kept but flagged as owner-replaceable in the final hand-off. No fake awards or logos.

## Phase 1 — Concept

Three concepts, three territories (see `references/concepts.md`). Scores are
Originality / Fit / Feasibility / Portability (portability lower = better).

| | A. The console you operate (material) | B. Clearance / descent (process) | C. One session transcript (formal) |
|---|---|---|---|
| Idea | You don't browse SkillQuest, you **operate** it: a live command line is the hero and the nav; each world is a system you gain access to; the whole UI is an operator console, set with restraint. | The site is tiers of access; scrolling **descends** you deeper into the system and clearance is granted as you go. | The whole homepage is one terminal **session transcript**: each section is a command and its streamed output. |
| Layout rule | A console HUD frame (status bar, prompt, log rail); sections are distinct "readouts". | Vertical descent, a depth/clearance meter per tier. | One monospace column, strict grid. |
| Motion verb | **compile / decode** — text scrambles then resolves, caret blinks, logs stream. | unlock / descend. | type → output streams. |
| Type voice | mono chrome + confident grotesk statements. | mono + grotesk. | mono-dominant. |
| Palette source | phosphor/CRT, elevated: a signal **per world**, amber "prompt-lit" chrome accent. | darkens with depth. | monochrome + one signal. |
| Signature | a **real, operable command line**: type/click `run sql-murder-mystery`, `ls worlds`, `help`; the console responds and routes you in. | a clearance meter that fills on scroll; tiers unlock. | the transcript types itself on scroll. |
| Anchor | the products literally ARE operated from a query console / terminal — this is how you learn here. | the games are about breaking in / escaping. | the product is a REPL for learning. |
| Scores (O/F/Fe/P) | 4 / 5 / 4 / 2 | 3 / 4 / 4 / 3 | 4 / 4 / 3 / 2 |

**Pick: A — "Access: the console you operate."** Best fit (the product is *literally* operated from
a SQL console and a Linux terminal), a complete rule system (console chrome → layout; prompt →
signature + navigation; decode → motion verb; signal-per-world → palette; command/response →
copy), feasible without WebGL, low portability. It also lets **every section be a different
readout** (console hero, systems index, pipeline, stats readout, `top` leaderboard, shutdown
footer) — which dodges concept C's one-layout monotony that the Design score punishes. Steal from
B for a scroll-driven "depth" readout detail, and from C for the 404 (`command not found`).

**Why it isn't the generic "hacker terminal":** the AI-default here is matrix rain + glassmorphism
+ acid-green-on-black + a *decorative* fake terminal. This concept is different in execution: (1)
the console is **real and operable**, not a prop; (2) **color comes from the work** — the chrome is
near-monochrome and each world carries its own signal, so it is never "one acid-green identity"
(the `references/art-direction.md` tell #2); (3) worlds are an **elite mono systems-index** with
decode reveals, not glowing cards; (4) the whole page reads as one operator session with a
scroll "depth" driver and an idle caret/log, so it breathes at rest. Restraint is the point:
one signature, everything else quiet and precisely set.

### Concept Card

```
Idea:        You operate SkillQuest like a console — each world is a system you gain access to.
Metaphor:    an elite operator terminal (the SQL console and the Linux shell the games run in).
Signature:   a real, operable command line in the hero (run <world> / ls worlds / help) that
             routes you into a world; recipe = the Console component + text-scramble (motion.md).
Emotion:     first 3s = "I'm at the controls of something real and a little underground."
Motion verb: compile / decode — scramble-resolve, caret blink, log stream, scanline clip.
Screenshot:  the console hero mid-decode, a command typed, a world "booting".
```

## Phase 2 — Art direction system

### Palette (roles, not hues)

The chrome is near-monochrome; the color is carried by the worlds and by one warm "prompt-lit"
accent. Written into `:root` as `--c-*` (new names; legacy `--bg/--red/--quest-*` tokens are kept
untouched for the behind-auth game/dashboard UI).

| Role | Value | Use |
|---|---|---|
| `ground` | `#07080A` | page background (deeper/cooler than the old `#121212`) |
| `elev` | `#0E1013` | raised console panels, rows |
| `elev-2` | `#15181C` | hover/active panel |
| `ink` | `#ECEAE3` | primary text — warm off-white, "elite paper", not pure #fff |
| `muted` | `#8A9099` | secondary text (AA on ground: ~7:1) |
| `faint` | `#565C64` | tertiary / disabled meta (large/again-AA only) |
| `line` | `rgb(236 234 227 / 0.10)` | hairlines |
| `line-2` | `rgb(236 234 227 / 0.18)` | stronger hairline / focus edges |
| `accent` (amber) | `#F5B544` | the live prompt, caret, focus ring, one key CTA. The "terminal is lit" signal. Used sparingly. |
| `accent-ink` | `#1A1205` | text on the amber fill (AA) |
| `curtain` | `ground` | (transitions off this pass) |

**Per-world signals** (reuse existing semantic hues so game pages stay coherent; appear only on
that world's row/section, never all at once):

| World | signal | hex |
|---|---|---|
| sql-murder-mystery | forensic amber | `#F5B544` |
| linux-prison-break | escape cyan | `#49D6E0` |
| git-time-traveler | temporal blue | `#5B8CFF` |
| hacker-academy | alert red | `#FF5347` |
| robot-factory | signal yellow | `#E8C14C` |
| space-mission-control | violet | `#9B7BFF` |

Pure `#000`/`#fff` avoided deliberately (warm near-blacks/off-whites read more "elite"). AI-tell
palettes avoided: no purple-blue glow identity, no cream+serif, no single acid-green.

### Type

- **Display / headings — Space Grotesk** (Google, `next/font`). The proportional sibling of a
  mono, so pairing it with the console mono reads intentional; techy and characterful without
  being a gamer gimmick. Weights 500 / 700. Set large, tracking `-0.02 to -0.04em`, leading
  `0.9–1.0`.
- **Mono / chrome / data / commands — JetBrains Mono** (Google, `next/font`; already the project's
  `font-mono`). Carries the console, labels, metrics (tabular), the systems index, the prompt.
- **Body prose — Inter** stays the app-wide body (keeps the untouched auth/game pages unchanged);
  marketing prose uses Space Grotesk or Inter at 16–18px. Fonts move from the CDN `@import` to
  `next/font` (self-hosted, preloaded, no CLS).
- Fluid scale in tokens (`--t-mega … --t-xs`), big jump between display and text.

### Grid & rhythm

- 12-col fluid grid, `--gutter` outer margin. Hang content off 2–3 strong vertical lines.
- Four-corner HUD frame (wordmark TL, status TR, context BL, action/scroll BR) as the genre's
  header/footer system, rendered as console chrome.
- Section rhythm varies on purpose (tight / normal / airy / full-viewport). One layout family per
  section (poster, index, pipeline, data-readout, process-list, finale).

### Shape & motion

- **Shape:** sharp. `--radius: 2px` (was rounded 12px tactile). Hairline borders, crisp panels —
  console windows, not pill buttons.
- **Motion language:** one easing family (`expo.out` entrances, `expo.inOut` big moves, `power3.out`
  UI). Big things slower than small; stagger 20–80ms. Verb = compile/decode: `scramble()` on key
  labels, caret blink, clip/scanline reveals (`data-reveal="clip"`), log stream.
- **Idle:** the concept breathes at rest — the hero caret blinks, a faint log line streams, and a
  scroll "depth" readout drifts slightly with a slow ticker term + pointer. Driven by the one GSAP
  ticker, paused off-screen, zero under reduced motion. (`references/motion.md` idle rules.)

### Signature moment

A **real command line** in the hero. Input + suggested command chips. Commands:
`help`, `ls worlds`, `whoami`, `run <world-slug>` (routes via `next/link`/router to the world),
`clear`. Output streams in mono with the decode verb. Idle: caret blink + a rotating scrambled
hint. Accessible: a real `<input>` with a label, real links in output, reduced-motion = instant
text. On touch: chips are tappable; no hover dependency.

### GL decision — none

No WebGL this pass. The signature is DOM/Canvas; atmosphere is a subtle CSS grid + a thin
ticker-driven scan sweep + the console's own log stream. Rationale: keeps JS well under budget,
guarantees 60fps on a mid-range phone, and lets accessibility/performance (where award sites lose
points) be the edge. Idle life comes from the caret + log + scan, not a decorative blob.

### Composition plan (one family per section; ASCII wireframes)

```
[ Hero — console / poster ]            [ Worlds — systems index ]
┌───────────────────────────┐          STATUS  WORLD                 SKILL  DIFF   XP   →
│ SkillQuest●online  whoami▸ │          ● READY  SQL Murder Mystery   SQL    BEG   500  →
│                            │          ● READY  Linux Prison Break   LINUX  BEG   400  →
│   Learn by breaking in.    │          ◌ LOCKED Git Time Traveler    GIT    INT   600
│   (big grotesk statement)  │          ◌ LOCKED Hacker Academy       SEC    INT   700
│                            │          … (hover row = signal tint + decode + preview)
│  guest@skillquest:~$ _     │
│  [help][ls worlds][run…]   │
│ v1.0 · 6 systems    ↓ boot │
└───────────────────────────┘

[ How it works — pipeline ]            [ Stats — $ readout ]        [ Leaderboard — $ top ]
pick ─│─ play ─│─ earn ─│─ keep        $ stats --all                $ top --sort=xp
 01      02      03       04           6 systems  · N learners      #1 ……… 48,200 XP
 (stepped panels, mono pipe)          (tabular, count-up)          (process-list rows)

[ Footer — shutdown / finale ]
  SkillQuest (big)   Worlds | Platform | colophon
  guest@skillquest:~$ logout _        © year · Learn by playing.
```

### Genericness test

"If a generic model got this brief, would it land here?" It would produce acid-green matrix rain +
glass cards + a decorative terminal. Changed vs that: real operable console (not decoration),
color-from-the-work per-world signals with an amber chrome accent (not one acid-green), an
elite mono systems-index (not glowing cards), one operator-session throughline with a depth
driver + idle. Kept watch on: mono must stay legible (short prose, 15–16px, good leading); the
"terminal" must read elite via restraint and negative space, not edgelord neon.

## Decisions log

- Engine scoped to the home page (custom controller), not site-wide: avoids destabilizing the
  authenticated app (Monaco editors, terminals, middleware) with global Lenis + link-intercept.
  Cross-route curtain transitions are therefore **off** this pass; first-load continuity
  (loader → hero handoff) is on.
- Legacy tokens/classes (`quest-*`, `.glow-*`, `.term-*`, `.sql-table`, `.glass-card`,
  `.gradient-text-*`, `.btn-tactile-*`) are preserved; the new system is additive (`--c-*`).
- Old `TargetCursor` (hides the native cursor — an a11y fail) is removed from the home page; the
  native cursor stays, optionally augmented by a follower.
- Idle: home is **alive at rest** (caret + log + scan), so `idleMotion: true` is the target.

## Phase 4/5 — QA outcome (final)

Production-build QA (audit.mjs + shoot.mjs, throttled mobile). **Redesigned surface (home `/`,
Navbar, Footer, 404): 0 audit FAIL, 0 audit WARN.** The 14 remaining audit WARNs are all on
out-of-scope pages (`/adventures`, world detail + play pages: their own copy + Monaco/framer-motion
JS weight).

shoot.mjs gates, all green on `/` and the 404:
- 0 console errors, 0 failed requests, no horizontal overflow (desktop + mobile).
- a11y: 0 serious/critical axe violations; skip link first; every focus visible; reduced-motion complete.
- hover: `noHoverChange` empty, `colorOnly` empty — every primary target answers in the compile/decode verb.
- `idleMotion: true` — a standalone amber scan beam (`.sq-scan`, outside `.sq-bg`'s 0.5 opacity) is the reliable continuous idle motion; the caret + pulsing status dot add to it.
- Perf: desktop LCP ~90ms, mobile LCP ~820ms (<2.5s), CLS 0, 60fps desktop + mobile, loader within budget.

### Decisions that changed during build
- **Loader decoupled from React**: a vanilla inline `<script>` in `page.tsx` runs the boot sequence
  before hydration and dismisses on its own clock (dispatches `sq:loaded`); `HomeStage` only waits
  for that signal. This stopped the loader from gating LCP on slow hydration (mobile LCP 4.1s → 0.8s).
  The loader nodes carry `suppressHydrationWarning` because the script mutates them pre-hydration.
- **Hero is painted immediately** (no reveal-gating on above-the-fold text) for a fast LCP and a
  strong static poster; below-the-fold sections keep scroll reveals.
- **Live worlds rows are the `<Link>` itself** (not an empty overlay), so the hover treatment lives
  on the link's own descendants (accessible name = the row's visible text).
- Bottom HUD fades on any scroll and is hidden under 640px (never overlaps content/console).

### Self-assessed score
An independent critic (screenshots + audit only, no concept/code) read the idea correctly as
"skills as bootable worlds in a terminal/OS you break into" (matches the Concept Card) and scored
**7.2 weighted**. Its top findings — mobile HUD collision, desktop HUD-over-content, a React #418
hydration error, low-contrast body, small tap targets, the one color-only nav link, a preview
flash, and unlabeled sample data — have all since been fixed, so the current build sits above that.

## Revision — Industrial Brutalism palette (owner request)

The home page was re-skinned from the amber/warm-black system to an **Industrial Brutalism**
palette (owner-supplied), keeping the "console you operate" concept and structure:

| Role | Was | Now |
|---|---|---|
| ground | `#07080A` | **`#181818` Asphalt** |
| ink | `#ECEAE3` | **`#F2F0E6` Chalk** |
| muted | warm grey | **`#B7B7B0` Steel** (faint `#8C8C84`) |
| accent | `#F5B544` amber | **`#E4FF1A` Hazard** (`--accent-rgb: 228 255 26`) |
| radius | 2px | **0 (sharp, brutalist)** |

- **Per-world rainbow dropped** for a utilitarian one-signal system: live worlds = hazard, locked =
  steel. The worlds index now reads as a lab "challenge board".
- **Richer ambient field** (`src/components/home/Field.tsx`, `.sq-field*`): a slowly drifting steel
  grid + two hazard scan beams (horizontal + vertical crosshair) + pulsing hazard "lab nodes". All
  CSS/compositor-only, `aria-hidden`, killed under reduced motion. `idleMotion` now registers at the
  top of the page.
- The hazard yellow is the classic "acid-on-near-black" award tell — used here deliberately per the
  owner's chosen palette, with conviction, as the single system accent.
- QA re-verified after the re-skin: 0 audit FAIL/WARN on the redesigned surface, all shoot gates
  green (contrast AA on the new palette, idle true, 60fps, CLS 0, mobile LCP ~0.82s).

## Revision — brand renamed to "unrust" (2026-10-23)

Product name changed site-wide from SkillQuest to **unrust** (owner request). Covers the wordmark
(Navbar + Footer, with "rust" in hazard yellow), the console host (`guest@unrust`), the loader/OS
label, all metadata (title/OG/keywords), auth-page titles, and the placeholder domain
(`unrust.app`). QA re-verified: 0 console errors, idle true, a11y serious 0, 60fps, mobile LCP ~0.82s.

## XP system — "clearance" (src/lib/xp.ts)

Researched game XP + CTF scoring, then designed for the vibe (raw, underground, for real
developers — not edtech streak-farming). Sources: RPG XP curves (exponential = late levels cost
more), "curves are a time-allocation tool", CTFd dynamic scoring (harder = worth more), HTB
first-blood (recognition, not inflation).

**Principles**
1. **Harder = more.** Per-level base XP scales with difficulty, not time. (SQL L1/L2/L3 = 625/700/1300; Linux 50…500.)
2. **First clear only.** XP granted once per level — replays pay nothing. Enforced by the existing idempotent `complete_level` RPC. The anti-grind core: you can't farm XP, you earn it by breaking in.
3. **Hints are a skill tax.** `awardFor()` multiplies base by [1, 0.75, 0.55, 0.4] for 0/1/2/3+ hints (floor 0.4x). Hints are free to use, never purchasable; a clean solver out-earns a hint-heavy one ~2.5x. A 0-hint clear also unlocks the "Pure Instinct" achievement.
4. **XP is clearance, not points.** Total XP → a privilege ladder: `guest → user → operator → sudo → daemon → kernel → root` (exponential thresholds 0/750/2500/6000/14000/30000). Surfaced by the console `whoami`, the navbar pill, and the dashboard. Earned, permanent, no shop.

**What clearance buys (the value).** Each rank unlocks real capability, not cosmetics:
`user` = save progress + full worlds + the board; `operator` = Git Time Traveler; `sudo` = Hacker
Academy + no-hint hard mode; `daemon` = Robot Factory + early access; `kernel` = Space Mission
Control + classified /root; `root` = everything. The coming-soon worlds show their gate on the
home index ("needs operator / sudo / daemon / kernel"), so XP has concrete pull.

**Wiring (build on the existing secure pipeline, don't rebuild it).**
- `awardFor()` routes both completion actions (`submitVerdict`, `runLinuxCommand`); `hintsUsed` is
  threaded from the games (SQL `HintsPanel` reveal count; Linux hint-button opens per level). With
  `hintsUsed` absent it equals base — zero regression.
- `revalidatePath('/', 'layout')` after each award so the navbar clearance/XP refreshes live.
- Display: `clearanceForXp()` in the layout (navbar), `app/page.tsx` (console `whoami` session),
  and the dashboard (new Clearance panel: current → next rank, XP-to-next, unlocks list).
- Reconciled the Linux XP mismatch: `levels.ts` now matches the server award (1450 total).

**Follow-ups (hooks already in place):** `awardFor` supports a speed bonus (`elapsedMs`/`parMs`,
+15%) — wire `started_at` server-side to activate. Achievement `xpReward` still isn't added to
profile XP (badges only). World card `xpReward` left as nominal catalog headlines; per-level totals
(WorldLevelsPage) are the real earnable values.

## Revision — app pages brought onto the console system (2026-10-23)

Owner: "match the other pages with the home page." Every page now uses the `sq-*` / `--c-*` system:

- **`/adventures`**: page header (kicker → big grotesk title → lead), `$ grep` search prompt,
  `aria-pressed` toggle chips, hairline-gridded world cards (`.sq-card`; READY = hazard, LOCKED = steel
  with its clearance gate). framer-motion removed.
- **`/adventures/[slug]`** (`WorldLevelsPage`): `cd ..` back link, header + `boot world` CTA, a `stat`
  readout strip, and the levels as a numbered process track (`.sq-level`: open / cleared / locked).
- **`/dashboard`** (`DashboardView`): `whoami` identity header with an XP meter, `stats` readout, and
  panels with command bars (`ls ~/worlds`, `skills --progress`, `tail activity.log`, `sudo -l`
  clearance, `ls ~/badges`, `top --sort=xp`). Now a server component (no framer-motion).
- **Auth** (login / signup / forgot / reset): a console window (`AuthShell` takes a `command`), `--flag`
  field labels, `sq-btn` submit, `error:` / `ok:` message lines.
- **Games**: both worlds' hardcoded navy/purple/cyan palettes remapped to asphalt/steel/chalk + hazard,
  sharp corners, Monaco theme updated. Legacy `.term-*`, `.terminal-cursor`, `.sql-table`, global
  focus ring, selection and scrollbar retinted. Legacy `quest-*` neutrals (Tailwind + `--bg/--text*`)
  now alias the Industrial palette.

New primitives live in the "APP PAGES" block at the end of `globals.css`.

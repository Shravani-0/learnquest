# Supabase Setup

SkillQuest stores **user data** (profiles, XP, streaks, achievements) and the
**quest catalog** (adventures + presentational level metadata) in Supabase. Auth
is handled by Supabase Auth (email/password + Google/GitHub OAuth).

The game is **server-authoritative**. Answers — win conditions (`detect()`),
killer/mastermind names, winning terminal commands, and the seed databases — live
only in `src/lib/server/quests/*` (guarded by `import 'server-only'`) and are
**never** sent to the browser or stored in the database. Players submit queries /
commands to Server Actions (`src/app/adventures/actions.ts`), which grade them
server-side and award XP through the service role.

**Access model:** level 1 of each world is a free trial (playable signed-out);
every level after it requires an account and completion of the previous level.
XP is granted only on verified level completion, exactly once.

## 1. Create a project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.local.example` to `.env.local` and fill in the values from
   **Project Settings → API**:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server/seed only — keep secret
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

The app builds and runs **without** these — auth and persistence simply no-op until
they're set, so gameplay stays fully playable anonymously.

## 2. Run the schema

Open the **SQL Editor** in the Supabase dashboard and run, in order:
[`0001_init.sql`](supabase/migrations/0001_init.sql), then
[`0002_secure_progress.sql`](supabase/migrations/0002_secure_progress.sql), then
[`0003_anti_cheat.sql`](supabase/migrations/0003_anti_cheat.sql).

`0001` creates the tables, the `leaderboard` view, RLS policies, and the sign-up
trigger. `0002` hardens everything: it removes the client-callable `award_xp()`
RPC, revokes all client writes to progress/XP/achievements (so those can only be
written by the server via the service role), hides the answer columns
(`quest_levels.seed_db` / `meta`) from the anon key, and adds an atomic,
idempotent `complete_level()` that awards XP exactly once. `0003` closes the
remaining XP loopholes: hint reveals and investigation steps are appended
server-side only (`append_progress_keys()`, service role), so the hint skill tax
and the "evidence before verdict" rule can't be faked from the browser; it also
stops publishing other players' in-progress rows. (The app falls back to a
non-atomic path until 0003 is applied, so apply it.)

**Anti-cheat rules enforced in `src/app/adventures/actions.ts`:**
- Hint text is never in the page; each clue comes from `revealSqlHint` /
  `revealLinuxHint`, which records it. XP uses the server's hint count.
- A verdict only pays out once the server has detected the investigation step
  that points to that suspect (`requiredEvidence()`), and wrong accusations are
  capped at 5 per case per 15 minutes (no brute-forcing the `person` table).
- Game actions are rate-limited per user/IP (`src/lib/server/rate-limit.ts`,
  in-memory per instance — use a shared limiter or WAF in production).
- Post-auth `next` redirects are same-site only (`src/lib/safe-next.ts`).

> Using the Supabase CLI instead? `supabase link` then `supabase db push`.

## 3. Seed quest content

With `.env.local` filled in:

```bash
npm run seed
```

This reads the in-code data files (the single source of truth) and upserts
adventures, quest levels, steps, hints, and achievements. It's idempotent — safe to
re-run whenever you change the content in `src/lib/data/`.

## 4. Configure Auth

In **Authentication → Providers**:

- **Email** is on by default. For instant local testing you can disable
  "Confirm email".
- Enable **Google** and/or **GitHub** and paste their OAuth client IDs/secrets.
- In **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback`
  (and your production equivalent) to the redirect allow-list.

## 5. Run

```bash
npm run dev
```

Sign up at `/signup`, and your XP/progress/achievements will persist and appear on
`/dashboard`. The dashboard is gated by middleware — signed-out users are redirected
to `/login`.

## Schema at a glance

| Table                  | Purpose                                             |
| ---------------------- | --------------------------------------------------- |
| `profiles`             | One row per user: username, avatar, XP, streak      |
| `adventures`           | Quest catalog metadata                              |
| `quest_levels`         | Per-level display metadata (title, intro, XP)       |
| `achievements`         | Catalog of unlockable achievements                  |
| `user_achievements`    | Which achievements each user has unlocked           |
| `user_quest_progress`  | Per-user, per-level status + XP earned + hints used |
| `user_answers`         | Every submitted SQL query / terminal command        |
| `leaderboard` (view)   | Users ranked by XP                                  |

After `0002`, progress/XP/achievements are **not** writable by any client — only
the server (service role) writes them. The catalog and profiles stay
world-readable so the browse pages and leaderboard work for anonymous visitors,
but the answer columns are hidden and `user_answers` is private to its owner.

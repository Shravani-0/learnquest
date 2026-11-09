-- ═══════════════════════════════════════════════════════════════════════════
-- unrust — challenge a friend
--
-- A challenger picks a skill and shares a link (by `code`). When someone else
-- accepts, the server draws one puzzle both can use and both get one timed run
-- before `deadline_at`. Fastest solve wins; fewer moves breaks a tie. No XP
-- changes hands — the result only feeds win/loss records and a badge.
--
-- Puzzles and their answers live in code (src/lib/server/challenges/bank.ts),
-- never in the database. Timing is recorded by the server, not the browser.
-- All writes go through the service role; players can read duels they're in.
--
-- Run in the Supabase SQL editor AFTER 0005_billing.sql.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.challenges (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  challenger_id  uuid not null references public.profiles (id) on delete cascade,
  opponent_id    uuid references public.profiles (id) on delete cascade,
  skill          text not null check (skill in ('sql', 'linux')),
  puzzle_id      text,
  status         text not null default 'open' check (status in ('open', 'active', 'finished', 'expired')),
  winner_id      uuid references public.profiles (id) on delete set null,
  result_reason  text,
  created_at     timestamptz not null default now(),
  invite_expires_at timestamptz not null,
  accepted_at    timestamptz,
  deadline_at    timestamptz,
  finished_at    timestamptz,
  check (opponent_id is null or opponent_id <> challenger_id)
);
create index if not exists challenges_challenger_idx on public.challenges (challenger_id, created_at desc);
create index if not exists challenges_opponent_idx   on public.challenges (opponent_id, created_at desc);

create table if not exists public.challenge_runs (
  challenge_id  uuid not null references public.challenges (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  solved        boolean not null default false,
  gave_up       boolean not null default false,
  moves         integer not null default 0 check (moves >= 0),
  primary key (challenge_id, user_id)
);

alter table public.challenges     enable row level security;
alter table public.challenge_runs enable row level security;

drop policy if exists "read own challenges" on public.challenges;
create policy "read own challenges" on public.challenges
  for select using ((select auth.uid()) in (challenger_id, opponent_id));

drop policy if exists "read own challenge runs" on public.challenge_runs;
create policy "read own challenge runs" on public.challenge_runs
  for select using (
    exists (
      select 1 from public.challenges c
      where c.id = challenge_id and (select auth.uid()) in (c.challenger_id, c.opponent_id)
    )
  );

revoke insert, update, delete on public.challenges     from anon, authenticated;
revoke insert, update, delete on public.challenge_runs from anon, authenticated;

-- Count a move atomically (two quick submissions can't lose one).
create or replace function public.bump_challenge_moves(p_challenge uuid, p_user uuid)
returns integer
language sql
security definer set search_path = public
as $$
  update public.challenge_runs
     set moves = moves + 1
   where challenge_id = p_challenge and user_id = p_user
  returning moves;
$$;
revoke all     on function public.bump_challenge_moves(uuid, uuid) from public, anon, authenticated;
grant  execute on function public.bump_challenge_moves(uuid, uuid) to service_role;

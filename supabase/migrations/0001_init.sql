-- ═══════════════════════════════════════════════════════════════════════════
-- SkillQuest — initial schema
-- User data + quest content (questions/answers). Detection logic stays in code.
-- Run in the Supabase SQL editor, or via `supabase db push` once linked.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type quest_status as enum ('not_started', 'in_progress', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rarity as enum ('common', 'rare', 'epic', 'legendary');
exception when duplicate_object then null; end $$;

-- ─── profiles ────────────────────────────────────────────────────────────────
-- One row per authenticated user, created automatically on sign-up (trigger below).
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text unique not null,
  display_name  text not null default '',
  avatar        text not null default '',
  xp            integer not null default 0 check (xp >= 0),
  streak        integer not null default 0 check (streak >= 0),
  last_active   date,
  created_at    timestamptz not null default now()
);

-- ─── adventures (quest catalog) ──────────────────────────────────────────────
create table if not exists public.adventures (
  id              text primary key,
  slug            text unique not null,
  title           text not null,
  subtitle        text,
  description     text,
  long_description text,
  genre           text,
  skill           text,
  difficulty      text,
  estimated_time  text,
  xp_reward       integer not null default 0,
  chapters        integer not null default 0,
  rating          numeric(2,1) not null default 0,
  icon            text,
  tags            text[] not null default '{}',
  concepts        text[] not null default '{}',
  is_new          boolean not null default false,
  is_popular      boolean not null default false,
  is_coming_soon  boolean not null default false,
  sort_order      integer not null default 0
);

-- ─── quest_levels (quest content per level) ──────────────────────────────────
create table if not exists public.quest_levels (
  id              uuid primary key default gen_random_uuid(),
  adventure_id    text not null references public.adventures (id) on delete cascade,
  level_number    integer not null,
  title           text not null,
  setting         text,
  intro           text,
  objective       text,
  hint            text,
  success_message text,
  xp_reward       integer not null default 0,
  seed_db         jsonb not null default '{}',   -- seed tables for SQL-style quests
  schema          jsonb not null default '{}',   -- column lists / relationships
  meta            jsonb not null default '{}',   -- room, unlocks, success commands, etc.
  unique (adventure_id, level_number)
);

-- ─── quest_steps (per-level objectives / questions) ──────────────────────────
create table if not exists public.quest_steps (
  id           uuid primary key default gen_random_uuid(),
  level_id     uuid not null references public.quest_levels (id) on delete cascade,
  step_key     text not null,
  label        text,
  objective    text,
  body         text,
  story_event  text,
  xp           integer not null default 0,
  sort_order   integer not null default 0,
  unique (level_id, step_key)
);

-- ─── quest_hints (progressive hints per level) ───────────────────────────────
create table if not exists public.quest_hints (
  id          uuid primary key default gen_random_uuid(),
  level_id    uuid not null references public.quest_levels (id) on delete cascade,
  title       text not null,
  hints       text[] not null default '{}',
  sort_order  integer not null default 0
);

-- ─── achievements ────────────────────────────────────────────────────────────
create table if not exists public.achievements (
  id          text primary key,
  title       text not null,
  description text,
  icon        text,
  xp_reward   integer not null default 0,
  rarity      rarity not null default 'common'
);

-- ─── user_achievements ───────────────────────────────────────────────────────
create table if not exists public.user_achievements (
  user_id        uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null references public.achievements (id) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ─── user_quest_progress ─────────────────────────────────────────────────────
create table if not exists public.user_quest_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  adventure_id    text not null references public.adventures (id) on delete cascade,
  level_number    integer not null,
  status          quest_status not null default 'in_progress',
  steps_completed text[] not null default '{}',
  xp_earned       integer not null default 0,
  hints_used      integer not null default 0,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  updated_at      timestamptz not null default now(),
  unique (user_id, adventure_id, level_number)
);

-- ─── user_answers (submitted questions & answers) ────────────────────────────
create table if not exists public.user_answers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  adventure_id     text not null references public.adventures (id) on delete cascade,
  level_number     integer not null,
  step_key         text,
  submitted_answer text not null,
  is_correct       boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists user_answers_user_idx
  on public.user_answers (user_id, adventure_id, level_number);

-- ═══════════════════════════════════════════════════════════════════════════
-- Leaderboard view — ranks profiles by XP with completed-adventure counts.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace view public.leaderboard
with (security_invoker = true) as
select
  p.id,
  p.username,
  p.display_name,
  p.avatar,
  p.xp,
  p.streak,
  coalesce(c.completed_adventures, 0) as completed_adventures,
  rank() over (order by p.xp desc) as rank
from public.profiles p
left join (
  select user_id, count(distinct adventure_id) as completed_adventures
  from public.user_quest_progress
  where status = 'completed'
  group by user_id
) c on c.user_id = p.id;

-- ═══════════════════════════════════════════════════════════════════════════
-- Triggers & functions
-- ═══════════════════════════════════════════════════════════════════════════

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
begin
  base_username := coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(new.email, '@', 1),
    'quester'
  );
  insert into public.profiles (id, username, display_name, avatar)
  values (
    new.id,
    -- guarantee uniqueness by appending a short slice of the uuid
    base_username || '_' || substr(new.id::text, 1, 4),
    coalesce(new.raw_user_meta_data ->> 'display_name', base_username),
    upper(substr(base_username, 1, 2))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh on progress rows.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists progress_touch on public.user_quest_progress;
create trigger progress_touch
  before update on public.user_quest_progress
  for each row execute function public.touch_updated_at();

-- Award XP to the current user atomically (avoids read-modify-write races).
create or replace function public.award_xp(p_amount integer)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set xp = xp + greatest(p_amount, 0)
  where id = auth.uid();
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Row-Level Security
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.profiles            enable row level security;
alter table public.adventures          enable row level security;
alter table public.quest_levels        enable row level security;
alter table public.quest_steps         enable row level security;
alter table public.quest_hints         enable row level security;
alter table public.achievements        enable row level security;
alter table public.user_achievements   enable row level security;
alter table public.user_quest_progress enable row level security;
alter table public.user_answers        enable row level security;

-- Quest content + profiles are world-readable (anon can browse the catalog).
drop policy if exists "read profiles"     on public.profiles;
drop policy if exists "read adventures"   on public.adventures;
drop policy if exists "read quest_levels" on public.quest_levels;
drop policy if exists "read quest_steps"  on public.quest_steps;
drop policy if exists "read quest_hints"  on public.quest_hints;
drop policy if exists "read achievements" on public.achievements;

create policy "read profiles"     on public.profiles            for select using (true);
create policy "read adventures"   on public.adventures          for select using (true);
create policy "read quest_levels" on public.quest_levels        for select using (true);
create policy "read quest_steps"  on public.quest_steps         for select using (true);
create policy "read quest_hints"  on public.quest_hints         for select using (true);
create policy "read achievements" on public.achievements        for select using (true);

-- Users may edit only their own profile.
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- user_achievements: read anyone's, write only your own.
drop policy if exists "read user_achievements"   on public.user_achievements;
drop policy if exists "insert own achievements"  on public.user_achievements;
create policy "read user_achievements"  on public.user_achievements for select using (true);
create policy "insert own achievements" on public.user_achievements
  for insert with check (auth.uid() = user_id);

-- user_quest_progress: read anyone's (for leaderboard), write only your own.
drop policy if exists "read progress"        on public.user_quest_progress;
drop policy if exists "insert own progress"  on public.user_quest_progress;
drop policy if exists "update own progress"  on public.user_quest_progress;
create policy "read progress" on public.user_quest_progress for select using (true);
create policy "insert own progress" on public.user_quest_progress
  for insert with check (auth.uid() = user_id);
create policy "update own progress" on public.user_quest_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_answers: fully private to the owner.
drop policy if exists "read own answers"    on public.user_answers;
drop policy if exists "insert own answers"  on public.user_answers;
create policy "read own answers" on public.user_answers
  for select using (auth.uid() = user_id);
create policy "insert own answers" on public.user_answers
  for insert with check (auth.uid() = user_id);

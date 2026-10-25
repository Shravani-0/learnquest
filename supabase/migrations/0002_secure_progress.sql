-- ═══════════════════════════════════════════════════════════════════════════
-- SkillQuest — server-authoritative progress & XP
--
-- Hardens the schema so the *server* is the sole authority for XP, level
-- completion, achievement unlocks, and answer storage. After this migration:
--   • Clients (anon/authenticated) can NO LONGER write progress, XP, or
--     achievements — every write goes through the service-role key on the server.
--   • The old client-callable award_xp(p_amount) RPC is removed (it let anyone
--     grant themselves arbitrary XP from the browser console).
--   • Answer-bearing columns (quest_levels.seed_db / meta) are no longer exposed
--     to the anon/authenticated read grant, so solutions can't be scraped.
--   • A single atomic, idempotent complete_level() awards XP exactly once.
--
-- Run in the Supabase SQL editor AFTER 0001_init.sql, or via `supabase db push`.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Remove the client-controlled XP path ────────────────────────────────
-- award_xp() was SECURITY DEFINER and callable by any signed-in browser with an
-- attacker-chosen amount. Delete it outright.
drop function if exists public.award_xp(integer);

-- ─── 2. Revoke all direct client writes on user progress tables ──────────────
-- Progress, XP and achievements are written only by the server (service role,
-- which bypasses RLS). Dropping the write policies means a forged browser
-- request — even with a valid JWT — cannot insert/update these rows.
drop policy if exists "insert own progress"     on public.user_quest_progress;
drop policy if exists "update own progress"     on public.user_quest_progress;
drop policy if exists "insert own achievements" on public.user_achievements;
drop policy if exists "insert own answers"      on public.user_answers;
drop policy if exists "update own profile"      on public.profiles;

-- Reads stay as-is: progress/achievements are world-readable (leaderboard),
-- answers remain private to their owner ("read own answers" from 0001).

-- Belt-and-suspenders: make sure the anon/authenticated roles hold no direct
-- INSERT/UPDATE/DELETE grants on these tables either (RLS + grants both apply).
revoke insert, update, delete on public.user_quest_progress from anon, authenticated;
revoke insert, update, delete on public.user_achievements   from anon, authenticated;
revoke insert, update, delete on public.user_answers        from anon, authenticated;
revoke insert, update, delete on public.profiles            from anon, authenticated;

-- ─── 3. Stop exposing level solutions to the browser ─────────────────────────
-- quest_levels is world-readable so the catalog/ERD works, but seed_db (the full
-- puzzle data) and meta (killer name, winning commands, etc.) are answers. Narrow
-- the read grant to the presentational columns only. RLS policy "read quest_levels"
-- still applies; column privileges further restrict which columns anon can select.
revoke select on public.quest_levels from anon, authenticated;
grant select (
  id, adventure_id, level_number, title, setting, intro,
  objective, hint, success_message, xp_reward, schema
) on public.quest_levels to anon, authenticated;

-- ─── 4. Atomic, idempotent level completion + XP award ───────────────────────
-- The only way profile XP ever increases. Callable ONLY by the service role
-- (invoked from server actions after the answer is verified server-side).
-- Idempotent: awarding a level that's already 'completed' is a no-op, so XP can
-- never be double-counted by retries or replayed requests.
create or replace function public.complete_level(
  p_user       uuid,
  p_adventure  text,
  p_level      integer,
  p_xp         integer,
  p_steps      text[] default '{}'
)
returns table (xp_awarded integer, already_completed boolean)
language plpgsql
security definer set search_path = public
as $$
declare
  v_award   integer := greatest(coalesce(p_xp, 0), 0);
  v_awarded boolean := false;
begin
  -- Claim completion atomically: only a row that isn't already completed can be
  -- moved to 'completed'. This is what guarantees XP is granted at most once,
  -- even under concurrent (double-clicked / replayed) requests.
  update public.user_quest_progress
     set status          = 'completed',
         steps_completed = coalesce(p_steps, steps_completed),
         xp_earned       = v_award,
         completed_at    = now()
   where user_id = p_user and adventure_id = p_adventure and level_number = p_level
     and status <> 'completed';

  if found then
    v_awarded := true;
  else
    -- No in-progress row was updated: either it's already completed, or no row
    -- exists yet. Try to create it; a racer beating us raises unique_violation.
    begin
      insert into public.user_quest_progress
        (user_id, adventure_id, level_number, status, steps_completed, xp_earned, completed_at)
      values
        (p_user, p_adventure, p_level, 'completed', coalesce(p_steps, '{}'), v_award, now());
      v_awarded := true;
    exception when unique_violation then
      v_awarded := false;   -- already completed — do not award again
    end;
  end if;

  if v_awarded then
    update public.profiles set xp = xp + v_award where id = p_user;
  end if;

  return query select (case when v_awarded then v_award else 0 end), (not v_awarded);
end;
$$;

revoke all     on function public.complete_level(uuid, text, integer, integer, text[]) from public, anon, authenticated;
grant  execute on function public.complete_level(uuid, text, integer, integer, text[]) to service_role;

-- ─── 5. Record in-progress step tracking (narrative only, no XP) ─────────────
-- Lets the server persist which story steps a player has revealed without ever
-- touching XP. Service-role only.
create or replace function public.record_step_progress(
  p_user       uuid,
  p_adventure  text,
  p_level      integer,
  p_steps      text[]
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_quest_progress
    (user_id, adventure_id, level_number, status, steps_completed)
  values
    (p_user, p_adventure, p_level, 'in_progress', coalesce(p_steps, '{}'))
  on conflict (user_id, adventure_id, level_number) do update
    set steps_completed = coalesce(excluded.steps_completed, public.user_quest_progress.steps_completed),
        status = case when public.user_quest_progress.status = 'completed'
                      then 'completed' else 'in_progress' end;
end;
$$;

revoke all     on function public.record_step_progress(uuid, text, integer, text[]) from public, anon, authenticated;
grant  execute on function public.record_step_progress(uuid, text, integer, text[]) to service_role;

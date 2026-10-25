-- ═══════════════════════════════════════════════════════════════════════════
-- unrust — anti-cheat: server-tracked hints + evidence
--
-- Closes the XP loopholes left after 0002:
--   • The hint "skill tax" used a hint count sent by the browser, so a player
--     could always claim 0 hints and take full XP + the Pure Instinct badge.
--     Hints are now revealed through a server action that records each one here.
--   • Investigation steps were persisted from a client-supplied list. Steps are
--     now appended one at a time, only after the server detects them, so a
--     verdict can require real evidence.
--
-- Hint reveals are stored as 'hint:<key>' entries in steps_completed (deduped),
-- and hints_used is kept equal to their count. Both are written atomically in
-- one statement, so concurrent requests can't drop an entry.
--
-- Run in the Supabase SQL editor AFTER 0002_secure_progress.sql.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.append_progress_keys(
  p_user       uuid,
  p_adventure  text,
  p_level      integer,
  p_keys       text[]
)
returns table (out_steps text[], out_hints integer, out_status quest_status)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  insert into public.user_quest_progress as p
    (user_id, adventure_id, level_number, status, steps_completed, hints_used)
  values (
    p_user, p_adventure, p_level, 'in_progress',
    array(select distinct k from unnest(coalesce(p_keys, '{}')) k),
    (select count(distinct k) from unnest(coalesce(p_keys, '{}')) k where k like 'hint:%')::int
  )
  on conflict (user_id, adventure_id, level_number) do update
    set steps_completed = array(
          select distinct k from unnest(p.steps_completed || coalesce(p_keys, '{}')) k
        ),
        hints_used = (
          select count(distinct k)
          from unnest(p.steps_completed || coalesce(p_keys, '{}')) k
          where k like 'hint:%'
        )::int
  returning p.steps_completed, p.hints_used, p.status;
end;
$$;

revoke all     on function public.append_progress_keys(uuid, text, integer, text[]) from public, anon, authenticated;
grant  execute on function public.append_progress_keys(uuid, text, integer, text[]) to service_role;

-- complete_level() overwrites steps_completed on completion; keep the hint keys
-- so a finished level still records how many hints it cost.
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
  update public.user_quest_progress
     set status          = 'completed',
         steps_completed = array(
           select distinct k from unnest(steps_completed || coalesce(p_steps, '{}')) k
         ),
         xp_earned       = v_award,
         completed_at    = now()
   where user_id = p_user and adventure_id = p_adventure and level_number = p_level
     and status <> 'completed';

  if found then
    v_awarded := true;
  else
    begin
      insert into public.user_quest_progress
        (user_id, adventure_id, level_number, status, steps_completed, xp_earned, completed_at)
      values
        (p_user, p_adventure, p_level, 'completed', coalesce(p_steps, '{}'), v_award, now());
      v_awarded := true;
    exception when unique_violation then
      v_awarded := false;
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

-- Other players' in-progress rows now carry hint keys; that's harmless, but
-- there's no reason to publish anyone's per-level progress detail. The
-- leaderboard view only needs completed rows, so narrow the read policy to
-- your own rows + completed rows.
drop policy if exists "read progress" on public.user_quest_progress;
create policy "read progress" on public.user_quest_progress
  for select using (status = 'completed' or (select auth.uid()) = user_id);

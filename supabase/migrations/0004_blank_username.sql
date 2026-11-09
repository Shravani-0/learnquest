-- ═══════════════════════════════════════════════════════════════════════════
-- unrust — usernames are mandatory
--
-- handle_new_user() used coalesce() on the username metadata, which only skips
-- NULL, so a sign-up that sent username = '' produced a profile named '_xxxx'
-- with an empty display name and avatar. OAuth sign-ups never send one at all.
--
-- profiles.username_set records whether the player actually chose a username.
-- Middleware sends anyone with username_set = false to /welcome until they pick
-- one (the chooseUsername server action flips it to true).
--
-- Run in the Supabase SQL editor AFTER 0003_anti_cheat.sql.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists username_set boolean not null default false;

-- Existing players who signed up with a real username keep it.
update public.profiles p
   set username_set = true
  from auth.users u
 where u.id = p.id
   and nullif(trim(u.raw_user_meta_data ->> 'username'), '') is not null
   and p.username <> '_' || substr(p.id::text, 1, 4);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  chosen        text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  base_username text;
begin
  -- Placeholder for players without a chosen username; /welcome replaces it.
  base_username := coalesce(chosen, nullif(split_part(new.email, '@', 1), ''), 'quester');
  insert into public.profiles (id, username, display_name, avatar, username_set)
  values (
    new.id,
    -- guarantee uniqueness by appending a short slice of the uuid
    base_username || '_' || substr(new.id::text, 1, 4),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), base_username),
    upper(substr(base_username, 1, 2)),
    chosen is not null
  );
  return new;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- unrust — paid access (Razorpay)
--
-- Levels 1–2 of every world stay free. Beyond that a level opens when the player
-- owns it, its world, or a plan that covers worlds (Pro, Career). Interview
-- levels (coming later) open with Career or Interview.
--
--   payments      one row per Razorpay order (one-time) or subscription (plan).
--                 Created when checkout starts; marked paid only after the
--                 server verifies Razorpay's signature (or the webhook says so).
--   entitlements  what a player owns. One row per purchase, keyed by the
--                 Razorpay order/subscription id so repeat confirmations and
--                 webhook retries can't double-grant.
--
-- Both are written only by the server (service role). Players can read their own
-- rows; nobody else's.
--
-- Run in the Supabase SQL editor AFTER 0004_blank_username.sql.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.payments (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.profiles (id) on delete cascade,
  kind                      text not null check (kind in ('level', 'world', 'plan')),
  adventure_id              text references public.adventures (id) on delete set null,
  level_number              integer,
  plan                      text check (plan in ('pro', 'career', 'interview')),
  amount                    integer not null check (amount >= 0),   -- paise
  currency                  text not null default 'INR',
  razorpay_order_id         text unique,
  razorpay_subscription_id  text unique,
  razorpay_payment_id       text,
  status                    text not null default 'created'
                              check (status in ('created', 'paid', 'failed', 'cancelled')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  check (razorpay_order_id is not null or razorpay_subscription_id is not null)
);
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);

create table if not exists public.entitlements (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  kind          text not null check (kind in ('level', 'world', 'plan')),
  adventure_id  text references public.adventures (id) on delete cascade,
  level_number  integer,
  plan          text check (plan in ('pro', 'career', 'interview')),
  status        text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  -- One-time purchases never expire (null). Plans run until the end of the paid period.
  expires_at    timestamptz,
  -- Razorpay order id (one-time) or subscription id (plan): makes grants idempotent.
  source        text not null unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (
    (kind = 'level' and adventure_id is not null and level_number is not null and plan is null) or
    (kind = 'world' and adventure_id is not null and level_number is null and plan is null) or
    (kind = 'plan'  and plan is not null and adventure_id is null and level_number is null)
  )
);
create index if not exists entitlements_user_idx on public.entitlements (user_id);

drop trigger if exists payments_touch on public.payments;
create trigger payments_touch before update on public.payments
  for each row execute function public.touch_updated_at();
drop trigger if exists entitlements_touch on public.entitlements;
create trigger entitlements_touch before update on public.entitlements
  for each row execute function public.touch_updated_at();

alter table public.payments     enable row level security;
alter table public.entitlements enable row level security;

drop policy if exists "read own payments" on public.payments;
create policy "read own payments" on public.payments
  for select using ((select auth.uid()) = user_id);

drop policy if exists "read own entitlements" on public.entitlements;
create policy "read own entitlements" on public.entitlements
  for select using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.payments     from anon, authenticated;
revoke insert, update, delete on public.entitlements from anon, authenticated;

-- PHONE ALERTS (web push)
-- One row per phone/browser that turned on alerts in the app (More -> New booking alerts).
-- The website function reads these to alert the owner about new bookings and enquiries.
-- Run once in Supabase: SQL Editor -> New query -> paste all of this -> Run. Safe to run again.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null,        -- the browser's push address
  p256dh text not null,          -- encryption keys from the browser
  auth text not null,
  device text,                   -- e.g. "iPhone" or "Android Chrome", to tell devices apart
  created_at timestamptz not null default now(),
  unique (owner_id, endpoint)
);

alter table push_subscriptions enable row level security;
drop policy if exists "owner only" on push_subscriptions;
create policy "owner only" on push_subscriptions for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

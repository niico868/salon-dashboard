-- EMAIL MARKETING SETTINGS
-- What Krystal changes in the app under More -> Email marketing: pausing emails, turning single
-- emails on or off, their words, the birthday discount and aftercare points per treatment.
-- Run after client-messages.sql: SQL Editor -> New query -> paste all of this -> Run.
-- Safe to run again: it skips anything that already exists.

create table if not exists email_settings (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  paused boolean not null default false,                 -- true: no automatic emails go out
  off_kinds text[] not null default '{}',                -- single emails that are switched off
  birthday_discount integer not null default 10 check (birthday_discount between 1 and 100),
  wording jsonb not null default '{}'::jsonb,            -- { "birthday": { "subject": "...", "body": "..." } }
  aftercare jsonb not null default '{}'::jsonb,          -- { "Cavitation": "one point\nper line" }
  updated_at timestamptz not null default now()
);

-- Same lock as the other tables: only the owner's account can see or change this.
-- The client-messages function reads it with the server key, which is allowed past this lock.
alter table email_settings enable row level security;
drop policy if exists "owner only" on email_settings;
create policy "owner only" on email_settings for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

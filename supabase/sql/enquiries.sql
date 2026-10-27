-- WEBSITE ENQUIRIES
-- Messages from the website's contact, consultation, treatment-finder and visiting forms.
-- Run once in Supabase: SQL Editor -> New query -> paste all of this -> Run.
-- Safe to run again: it skips anything that already exists.

create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  client_id uuid references clients(id) on delete set null,   -- filled in when the phone/email matches a client
  source text not null default 'other'
    check (source in ('contact','consultation','treatment-finder','visit','other')),
  name text not null,
  phone text,
  email text,
  message text not null default '',
  status text not null default 'new' check (status in ('new','done')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create index if not exists enquiries_status_created on enquiries (status, created_at desc);

-- Same lock as the other tables: only the owner's account can see or change these rows.
-- The website function writes with the server key, which is allowed past this lock.
alter table enquiries enable row level security;
drop policy if exists "owner only" on enquiries;
create policy "owner only" on enquiries for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

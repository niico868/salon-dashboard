-- CLIENT MESSAGES (automatic emails)
-- Adds what the `client-messages` function needs to send reminders, aftercare, check-ins,
-- rebooking offers and birthday wishes, and to never send the same message twice.
-- Run once in Supabase: SQL Editor -> New query -> paste all of this -> Run.
-- Safe to run again: it skips anything that already exists.

-- 1. Client consent
--    marketing_opt_in: OK to send offers (rebooking) and birthday wishes. Off until the client agrees.
--    emails_off:       the client unsubscribed from all emails. Nothing is sent to them, not even reminders.
--    unsubscribe_token: secret used in the unsubscribe link at the bottom of every email.
alter table clients add column if not exists marketing_opt_in boolean not null default false;
alter table clients add column if not exists emails_off boolean not null default false;
alter table clients add column if not exists unsubscribe_token uuid not null default gen_random_uuid();
create unique index if not exists clients_unsubscribe_token on clients (unsubscribe_token);

-- 2. When an appointment was marked Done, so aftercare and later messages count from that moment.
--    Only set when an existing booking is switched to Done, so adding an old visit as already
--    completed never sends aftercare for it.
alter table appointments add column if not exists completed_at timestamptz;

create or replace function set_appointment_completed_at() returns trigger language plpgsql as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := now();
  elsif new.status <> 'completed' then
    new.completed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists appointments_completed_at on appointments;
create trigger appointments_completed_at before update of status on appointments
  for each row execute function set_appointment_completed_at();

-- 3. Every message sent (or skipped / failed), one row each.
--    dedupe_key is unique, so the same message can never go out twice
--    (e.g. 'aftercare:<appointment id>' or 'birthday:<client id>:2026').
create table if not exists client_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  client_id uuid references clients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  kind text not null check (kind in ('reminder_2d','reminder_1d','aftercare','checkin_1w','rebook_1m','rebook_2m','birthday')),
  channel text not null default 'email' check (channel in ('email','whatsapp')),
  dedupe_key text not null unique,
  recipient text,
  status text not null check (status in ('sent','failed','test')),
  error text,
  provider_id text,
  created_at timestamptz not null default now()
);
create index if not exists client_messages_client on client_messages (client_id, created_at desc);

alter table client_messages enable row level security;
drop policy if exists "owner only" on client_messages;
create policy "owner only" on client_messages for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 4. Run the function every 15 minutes.
--    Before running this part, replace PROJECT_REF with the xxxx in https://xxxx.supabase.co
--    and CRON_SECRET_HERE with the same value you set with `npx supabase secrets set CRON_SECRET=...`.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('client-messages') where exists (select 1 from cron.job where jobname = 'client-messages');
select cron.schedule('client-messages', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/client-messages',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "CRON_SECRET_HERE"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

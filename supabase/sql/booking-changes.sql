-- MOVED OR CANCELLED EMAILS
-- Lets the client-messages function tell a client when their booking is moved to a new time or cancelled.
-- Run after client-messages.sql: SQL Editor -> New query -> paste all of this -> Run.
-- Safe to run again: it skips anything that already exists.

-- 1. When a booking was cancelled or moved, and the time it moved from.
--    The database fills these in by itself whenever a booking changes, from the app or anywhere else.
alter table appointments add column if not exists cancelled_at timestamptz;
alter table appointments add column if not exists moved_at timestamptz;
alter table appointments add column if not exists moved_from timestamptz;

create or replace function track_appointment_changes() returns trigger language plpgsql as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    new.cancelled_at := now();
  elsif new.status <> 'cancelled' then
    new.cancelled_at := null;
  end if;

  -- Moving a booking that is still on (not tidying up an old or cancelled one)
  if new.starts_at is distinct from old.starts_at and new.status = 'booked' then
    new.moved_at := now();
    new.moved_from := old.starts_at;
  end if;
  return new;
end $$;

drop trigger if exists appointments_track_changes on appointments;
create trigger appointments_track_changes before update of status, starts_at on appointments
  for each row execute function track_appointment_changes();

-- 2. Allow the two new email kinds in the message log.
alter table client_messages drop constraint if exists client_messages_kind_check;
alter table client_messages add constraint client_messages_kind_check check (kind in
  ('reminder_2d','reminder_1d','moved','cancelled','aftercare','checkin_1w','rebook_1m','rebook_2m','birthday'));

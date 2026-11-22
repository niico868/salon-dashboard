-- SECURITY CHECK (read only: changes nothing)
-- Shows whether every table and view is locked to the owner's login.
-- Supabase: SQL Editor -> New query -> paste all of this -> Run.
--
-- What good looks like: every row says "OK".
-- Anything else is explained in the "problem" column, with the fix in the comments at the bottom.

select c.relname as name,
       case c.relkind when 'r' then 'table' when 'v' then 'view' end as kind,
       case
         when c.relkind = 'r' and not c.relrowsecurity
           then 'NO LOCK: anyone with the app key can read and change this table'
         when c.relkind = 'r' and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
           then 'Locked with no rules: the app cannot use it (only the server functions can)'
         when c.relkind = 'v' and not coalesce('security_invoker=true' = any(c.reloptions), false)
           then 'VIEW SKIPS THE LOCK: it shows every row to anyone with the app key, logged in or not'
         else 'OK'
       end as problem
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'v')
order by problem <> 'OK' desc, name;

-- The rules on each table (who may see or change which rows):
select tablename, policyname, cmd, roles, qual as can_see, with_check as can_write
from pg_policies where schemaname = 'public' order by tablename, policyname;

-- FIXES (copy only the line you need into a new query and Run it):
--
-- A view that skips the lock (for example appointment_balances): make it use the reader's login.
--   alter view appointment_balances set (security_invoker = true);
--
-- A table with no lock: switch the lock on and allow only the owner's login.
--   alter table <name> enable row level security;
--   create policy "owner only" on <name> for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
--
-- Then open Advisors -> Security Advisor in Supabase and check it shows no errors.

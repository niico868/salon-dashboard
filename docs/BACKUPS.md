# Database backups

The dashboard's data (clients, bookings, payments, services, email settings) lives in one Supabase
database. On Supabase's free plan **there are no backups**: if a row is deleted by mistake, or the
project is lost, it is gone. Supabase also pauses a free project after about a week with no use.

This repository now makes its own backup every night, like a photocopy of the appointment book that
goes into a locked safe:

1. At 3:00 AM Trinidad time, GitHub copies the whole database (`.github/workflows/backup.yml`).
2. It locks the copy with a password that only you hold (AES-256 encryption).
3. It keeps the locked file for 30 days on the **Actions** tab, then deletes it. There are always
   about 30 nightly copies to choose from.

The nightly connection to the database should also count as activity, which helps stop the free project
from being paused.

## Cost

Free. A run takes about two minutes. Public repositories get unlimited free Actions minutes, and a private
repository gets 2,000 free minutes a month, so a nightly backup uses about 60 of them.

The paid alternative is Supabase Pro (US$25 a month), which adds daily backups kept for 7 days and restores
with one click. Worth it once the business depends on the dashboard every day.

## Setup (once, about 10 minutes)

### 1. Get the database address

1. Open the project in [Supabase](https://supabase.com/dashboard) and click **Connect** at the top.
2. Choose **Session pooler** (GitHub can't reach the "Direct connection" address).
3. Copy the URI. It looks like
   `postgresql://postgres.abcd:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`.
4. Replace `[YOUR-PASSWORD]` with the database password. If nobody saved it: **Project Settings → Database →
   Reset database password**. This doesn't change Krystal's login to the app.

### 2. Make up a backup password

At least 16 characters, for example four random words. **Save it in a password manager and give Krystal a
copy.** Without it the backups can't be opened, by anyone, including us.

### 3. Add both to GitHub

Go to the repository's
[Settings → Secrets and variables → Actions](https://github.com/niico868/salon-dashboard/settings/secrets/actions)
and click **New repository secret** twice:

| Name | Value |
| --- | --- |
| `SUPABASE_DB_URL` | the address from step 1 |
| `BACKUP_PASSPHRASE` | the password from step 2 |

GitHub hides secrets: nobody can read them back, and they never show in logs.

### 4. Run it once now

[Actions → Database backup](https://github.com/niico868/salon-dashboard/actions/workflows/backup.yml) →
**Run workflow**. After about two minutes it should show a green tick and a file called
`melt-aways-db-<date>` under **Artifacts**. A red cross means something is wrong: open the run, and the
first red line says what.

GitHub emails the repository owner when a scheduled run fails. In a public repository, GitHub also switches
scheduled runs off after 60 days with no new commits, and emails first; click **Enable workflow** on the
Actions tab to switch it back on.

## Restoring

Only needed if data is lost. Take the newest backup from **before** the problem.

1. Download the artifact from the run on the Actions tab and unzip it. Inside is `melt-aways-db-<date>.tar.gz.gpg`.
2. Unlock it (Terminal on a Mac or Linux; Git Bash on Windows):

   ```bash
   gpg -d melt-aways-db-2026-11-22.tar.gz.gpg | tar -xz
   ```

   It asks for the backup password, and gives a `backup` folder with `roles.sql`, `schema.sql` and `data.sql`.
3. Restore into a **new, empty** Supabase project (safer than writing over the damaged one), using that
   project's Session pooler address:

   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file backup/roles.sql --file backup/schema.sql \
     --command 'SET session_replication_role = replica' \
     --file backup/data.sql \
     --dbname "postgresql://postgres.NEWREF:PASSWORD@...pooler.supabase.com:5432/postgres"
   ```

4. Point the app at the new project (its URL and publishable key in Netlify's environment variables), redeploy
   the two functions, and re-run the schedule part of `supabase/sql/client-messages.sql` with the new project's address.

Supabase's own guide: [Back up and restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

To bring back just one deleted client or booking, open `data.sql` in a text editor, find the row and add it again
in the app. That's much simpler than a full restore.

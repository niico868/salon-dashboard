# Handoff: connecting the Lovable website to the salon app

> **Please read first:** the owner needs **clear, step-by-step instructions**. Give one action per
> step, say exactly where to click or what to type, show the full command to copy, and say what they
> should see when it worked. Don't assume they know Supabase, Lovable or the terminal. Check each
> step worked before going on to the next.

## Goal

Bookings made on the salon's public website (built in **Lovable**) should go straight into this
app's **Supabase** database, so they appear in the app's calendar like any other booking.

## Where things stand (15 Oct 2026)

**Done (code written, not yet deployed or run against the real database):**

- A Supabase Edge Function at `supabase/functions/website-booking/index.ts`. The website calls this
  one web address and never holds database keys.
  - `GET` returns the active service menu.
  - `GET ?date=YYYY-MM-DD` also returns that day's busy time slots (times only, no client details).
  - `POST` validates the form, refuses a time that's already booked (409), finds the client by
    phone and then email or creates a new one, and inserts the appointment with notes starting
    `[Website]`.
  - It also has a spam trap: a hidden `company` field. Bots fill it in; real visitors don't.
- A setup guide with deploy commands, `curl` tests and a ready-to-paste Lovable prompt:
  `supabase/functions/website-booking/README.md`.
- The app needs no changes to show website bookings. They appear in the calendar automatically.

**Not done yet (the steps to walk the owner through, in this order):**

1. **Install/log in to the Supabase CLI:** `npx supabase login`.
2. **Find the project ref.** It's the `xxxx` in `EXPO_PUBLIC_SUPABASE_URL` in `.env`
   (`https://xxxx.supabase.co`). Never paste the key from `.env` anywhere.
3. **Link and deploy** from the project folder:
   `npx supabase link --project-ref <ref>`, then
   `npx supabase functions deploy website-booking --no-verify-jwt`.
4. **Test with `curl`** using the commands in the README, before touching Lovable. Make sure the
   test booking shows up in the app, then delete it.
5. **Lock it to the website:** `npx supabase secrets set ALLOWED_ORIGINS=<site urls>`.
   This needs the website's real address(es), e.g. the `.lovable.app` one and any custom domain:
   comma-separated, no trailing slash.
6. **Paste the Lovable prompt** from the README into Lovable, with the real endpoint URL filled in.
   Then make one booking from the live site and confirm it appears in the app.

## Questions to ask the owner

- **Does the Lovable site already save bookings somewhere?** If it uses Lovable Cloud or its own
  Supabase project, that's a *different* database. The site must be switched to call this function
  instead.
- **What are the opening hours?** The code and prompt assume **8:00 AM to 7:00 PM, every day**. If
  that's wrong, change `OPEN_HOUR`/`CLOSE_HOUR` in `src/components/DayView.tsx` and the hours in the
  Lovable prompt. The function itself doesn't enforce opening hours; the website does.
- **What's the website address(es)?** These are needed for step 5.

## Things that were assumed and need checking on the first real test

- **The database schema isn't in this repo.** It came from a tutorial PDF. Tables used are
  `services`, `clients`, `appointments` and the `appointment_balances` view. Column names were
  taken from `src/lib/types.ts`.
- **New appointments default to `status = 'booked'`.** The function doesn't set a status, just like
  the app. If website bookings don't show up as booked, that's the first thing to check.
- **Owner column (corrected 25 Oct 2026).** The tutorial gives every table an `owner_id` that
  defaults to the logged-in user, with "owner only" security. The function isn't logged in, so it now
  needs the `OWNER_ID` secret (Krystal's User UID) and stamps every insert with it. It also only reads
  that owner's services, busy times and clients, so the test account's data is ignored.
- **The Deno function code has never been typechecked or run.** It's excluded from the app's
  `tsc`/lint on purpose. The first deploy and `curl` test is its real test.
- **Timezone is Trinidad (`-04:00`).** It can be changed with the `SALON_UTC_OFFSET` secret.

## Website enquiries (added 25 Oct 2026)

The site's contact, consultation, treatment-finder and visiting forms already POST
`{ type: "enquiry", source, name, phone, email, message }` to this function. They used to be rejected
(400, no service or time) without anyone noticing. Now they're saved to the `enquiries` table
(`supabase/sql/enquiries.sql`, run once in the SQL Editor) and listed on Home. No website changes needed.

## Good to know

- **Limits:** bookings need 60 minutes' notice and can be at most 120 days ahead. Both are set at
  the top of `index.ts`.
- **Notifications:** website bookings get phone reminders only after the app is next opened, when
  reminders re-sync. Instant alerts for new website bookings would be a sensible next feature.
- **Same session, other features:** this session also added birthdays, the calendar day view and
  invoice PDFs. For those, the salon's name, address and phone still need filling in at the top of
  `src/lib/invoice.ts`. All of this work is uncommitted on `main`.

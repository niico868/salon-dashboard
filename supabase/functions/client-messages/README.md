# Automatic client emails

Every 15 minutes this function checks the app's appointments and clients and emails anyone who is due a message.
Emails go out between 8 AM and 8 PM Trinidad time only; anything due overnight waits for the morning.

| Email | When | Who gets it |
| --- | --- | --- |
| Reminder | 2 days before the appointment | Clients who booked more than 2 days ahead |
| Reminder | The day before | Clients who booked more than a day ahead |
| Aftercare | Straight after the appointment is marked **Done** | Everyone |
| Check-in | 1 week after the visit | Everyone |
| Rebooking offer | 1 month after their last visit | Only clients who said yes to offers, and only if they haven't booked again |
| "Hope you're doing well and sticking to your dietary regimen" | 2 months after their last visit | Same as above |
| Birthday wishes | On their birthday (needs a birthday on their profile) | Only clients who said yes to offers |

Nobody gets the same email twice. Clients with no email, or who unsubscribed, get nothing.
Every email has an unsubscribe link at the bottom. Replies go to `meltawaystt@gmail.com`.
Each client's profile in the app lists the automatic emails they've been sent.

The words of every email are in `templates.ts`. **Aftercare guidelines per treatment** go in `aftercare.ts`:
Krystal fills those in. Until she does, aftercare emails carry only the general care section.

## Setup (once, in this order)

Do one step at a time and check it worked before going on.

### 1. Database changes

In Supabase: **SQL Editor → New query**. Paste everything in `supabase/sql/client-messages.sql`.
In the last part, replace `PROJECT_REF` with the `xxxx` from your Supabase URL (`https://xxxx.supabase.co`)
and `CRON_SECRET_HERE` with a long random password you make up now (keep it; it's used in step 3).
Click **Run**. You should see "Success".

### 2. Resend (the email sender)

1. Sign up at [resend.com](https://resend.com) (free: 3,000 emails a month, 100 a day).
2. **Domains → Add domain** → `meltawaysspa.com`. Resend shows a few DNS records.
3. Add those records where the domain's DNS is managed (wherever meltawaysspa.com was bought or pointed).
   They sit on their own sub-names (like `send.` and `resend._domainkey`), so they don't touch the
   website or the existing `care.` email setup. Click **Verify** in Resend; it can take up to an hour.
4. **API Keys → Create API key** (sending access). Copy it.

### 3. Secrets and deploy

From the project folder:

```bash
npx supabase secrets set RESEND_API_KEY=<the key from Resend>
npx supabase secrets set CRON_SECRET=<the same password you put in the SQL>
npx supabase secrets set SALON_PHONE="868 xxx xxxx"
npx supabase functions deploy client-messages --no-verify-jwt
```

`OWNER_ID` is already set from the website booking setup. `--no-verify-jwt` is needed so the unsubscribe link works.

### 4. Test before going live

Nothing is really sent yet: until `MESSAGES_LIVE` is set, every run is a dry run.

```bash
URL=https://<project-ref>.supabase.co/functions/v1/client-messages
SECRET=<your cron secret>

# See every email design in your own inbox (one of each)
curl -X POST "$URL" -H "x-cron-secret: $SECRET" -H 'Content-Type: application/json' -d '{"test_to":"you@example.com"}'

# What would go out right now, to whom (sends nothing)
curl -X POST "$URL" -H "x-cron-secret: $SECRET" -H 'Content-Type: application/json' -d '{"dry_run":true}'
```

For a full test with real bookings but without emailing clients, send everything to yourself first:

```bash
npx supabase secrets set TEST_RECIPIENT=you@example.com MESSAGES_LIVE=true
```

Book a test client for tomorrow (more than a day from when you create it), mark another test visit Done, and
watch the emails arrive over the next 15 minutes.

### 5. Go live

```bash
npx supabase secrets unset TEST_RECIPIENT
npx supabase secrets set MESSAGES_LIVE=true
```

To pause everything at any time: `npx supabase secrets set MESSAGES_LIVE=false`.

## Consent

- **Reminders, aftercare and check-ins** are about a service the client booked, so everyone with an email gets them.
- **Rebooking offers and birthday wishes** are marketing. They only go to clients with
  **Offers & birthday emails** switched on (client profile → Edit). Only switch it on if the client agreed.
- The website can collect this too: add a tick box to the booking form (see the Lovable prompt below).

### Lovable prompt (after step 1 is done)

> On the booking form, add two optional fields: a date of birth (sent as `birthday`, format YYYY-MM-DD),
> and an unticked checkbox "Send me offers and birthday treats by email" (sent as `marketing_opt_in: true`
> only when ticked). Send both in the same POST to the booking endpoint. Don't save them anywhere else.

## Later: WhatsApp

`rules.ts` decides who is due what and doesn't care how it's sent, and the message log already has a
`channel` column. When the WhatsApp Business API is set up, a WhatsApp sender can be added next to the email one.

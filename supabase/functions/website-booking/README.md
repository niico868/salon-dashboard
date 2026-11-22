# Website bookings (Lovable → Supabase)

The salon website calls this Edge Function. The function checks the booking, refuses
double bookings, finds or creates the client (matched by phone, then email), and adds the
appointment. It appears in the app like any other booking, with notes starting `[Website]`.

It also takes **enquiries** from the website's contact, consultation, treatment-finder and visiting
forms (`"type": "enquiry"`). Those have no service or time, so they're saved to the `enquiries` table
and show under **Website enquiries** on the app's Home screen, where Krystal can WhatsApp them, add them
as a client, or tick them off.

Every booking and enquiry the function accepts also sends **two emails** through Resend (`emails.ts`):

| Email | Goes to | Says |
| --- | --- | --- |
| Confirmation | The client (email is required on every form) | "You're booked" with treatment, date, time and address, or "We received your request" |
| New booking / request alert | `SPA_ALERT_EMAIL` (default `meltawaystt@gmail.com`) | Every detail from the form. Press **Reply** to answer the client directly |

The emails go out after the website gets its answer, so a slow or failed email never holds up or loses a
booking. Each one writes a line to the function's log: `Email sent (...)` or `EMAIL NOT SENT (...)` with the reason.

The website never holds database keys, and the public endpoint never returns client names
or phone numbers. It only returns the service menu and which times are busy.

## 0. Before deploying (once)

1. **Create the enquiries table.** In Supabase, open **SQL Editor → New query**, paste everything in
   `supabase/sql/enquiries.sql`, and click **Run**. You should see "Success. No rows returned".
2. **Find the owner's user id.** In Supabase, open **Authentication → Users**, find Krystal's email
   and copy her **User UID** (looks like `3f2a…-…`). Use *her* account, not your test account.
   Every table has an `owner_id` that the app fills from whoever is logged in. The website isn't
   logged in, so the function stamps everything with this id. Without it, bookings and enquiries
   would fail, or land in an account nobody looks at.

## 1. Deploy (once, from this folder's project root)

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>        # the xxxx in https://xxxx.supabase.co
npx supabase secrets set OWNER_ID=<Krystal's User UID>
npx supabase functions deploy website-booking --no-verify-jwt
```

Run the same `deploy` line again whenever `index.ts` changes.

`--no-verify-jwt` is needed because website visitors aren't logged in. The function does its own checks.

Lock it to your website's addresses (use your real domains, comma-separated, no trailing slash):

```bash
npx supabase secrets set ALLOWED_ORIGINS=https://yoursalon.com,https://yoursalon.lovable.app
```

Your endpoint is: `https://<your-project-ref>.supabase.co/functions/v1/website-booking`

## 2. Test it

```bash
URL=https://<your-project-ref>.supabase.co/functions/v1/website-booking
curl "$URL"                       # service menu
curl "$URL?date=2026-10-20"       # services + busy times that day
curl -X POST "$URL" -H 'Content-Type: application/json' -d '{
  "name": "Test Client", "phone": "868 555 0000", "email": "you@example.com", "service_id": "<a service id from the first call>",
  "starts_at": "2026-10-20T14:00:00-04:00", "notes": "test booking, delete me" }'
```

Test an enquiry. It should appear on the app's Home screen under **Website enquiries** after a pull to refresh:

```bash
curl -X POST "$URL" -H 'Content-Type: application/json' -d '{
  "type": "enquiry", "source": "contact", "name": "Test Enquiry", "phone": "868 555 0000",
  "email": "you@example.com", "message": "test enquiry, tick Done to clear me" }'
```

Both should send a confirmation to `you@example.com` and an alert to the spa within a minute. If not, open
**Supabase → Edge Functions → website-booking → Logs** and look for `EMAIL NOT SENT`. Common reasons:

| Log says | Fix |
| --- | --- |
| `RESEND_API_KEY secret is not set` | `npx supabase secrets set RESEND_API_KEY=<key>` (resend.com → API Keys) |
| `Resend 403 ... domain is not verified` | resend.com → Domains → meltawaysspa.com: every record must show **Verified**. Fix the DNS records it lists in Cloudflare, then press Verify |
| `Resend 403 ... only send testing emails to your own email address` | Same as above: until the domain is verified, Resend only delivers to the account owner's address |
| Nothing at all about email | The function wasn't redeployed after this change: run the `deploy` line again |

Answers: `201` booked or saved · `400` bad input (message says what) · `409` time already taken · `500` server problem.

## 3. Prompt to paste into Lovable

> Connect the booking form to our salon's booking API. Don't use a database for bookings on this site.
>
> Endpoint: `https://<your-project-ref>.supabase.co/functions/v1/website-booking`
>
> 1. On load, `GET` the endpoint. It returns `{ services: [{ id, name, category, price, duration_min }] }`.
>    Show services grouped by category, with price in TT$ and duration.
> 2. When the customer picks a date, `GET ?date=YYYY-MM-DD`. It returns `busy: [{ starts_at, ends_at }]`.
>    Offer start times every 30 minutes between 8:00 AM and 7:00 PM (Trinidad time, UTC-4). Hide any time where
>    the chosen service (start + duration_min) would overlap a busy period, would end after 7:00 PM, or is in the past.
> 3. Form fields: full name (required), phone (required), email (required, checked as a real address), notes (optional), and a hidden
>    text input named `mk_hp` that real users never see (leave it empty; it's a spam trap). Don't call it
>    `company` or anything like a real field: browsers autofill those and real bookings get dropped.
> 4. On submit, `POST` JSON `{ name, phone, email, notes, mk_hp, service_id, starts_at }` with `starts_at` as an
>    ISO string including the `-04:00` offset, e.g. `2026-10-20T14:00:00-04:00`.
> 5. On `201`, show a confirmation with the service, date and time. On `409`, say the time was just taken and
>    refresh the available times. On `400`, show the `error` message from the response. On anything else, ask them
>    to call the salon.

## Options

| Secret | What it does |
| --- | --- |
| `OWNER_ID` | **Required.** Krystal's user id. Everything from the website is saved to her account, and only her services and bookings are used. If it's missing, the function answers `500` and its log says so. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Phone alerts for each new booking or enquiry. See `docs/PHONE-ALERTS.md`. Without them, everything works except the alerts. |
| `RESEND_API_KEY` | **Needed for emails.** Same key as the automatic client emails. Without it, bookings still save but nothing is emailed. |
| `SPA_ALERT_EMAIL` | Who gets the new booking / request alerts, comma-separated. Default `meltawaystt@gmail.com`. |
| `MAIL_FROM`, `REPLY_TO`, `SALON_PHONE` | Shared with the automatic emails. Defaults: `Melt Aways <hello@meltawaysspa.com>`, `meltawaystt@gmail.com`, none. |
| `TEST_RECIPIENT` | While set, client confirmations go to this address instead of the client (the spa alert still goes to the spa). Shared with the automatic emails. |
| `ALLOWED_ORIGINS` | Only these websites may call the function. Leave unset to allow any site, which is fine while testing only. |
| `SALON_UTC_OFFSET` | Time zone used for `?date=`. Default `-04:00`. |
| `WEBSITE_BOOKING_SECRET` | Requires an `x-booking-secret` header. Use only if Lovable calls this from its own server code; a secret in browser code is visible to anyone. |

Notice and range limits (60 minutes' notice, up to 120 days ahead) are at the top of `index.ts`.

# Website bookings (meltawaysspa.com → Supabase)

The salon website calls this Edge Function. The function checks the booking, enforces opening
hours (Tuesday to Saturday, 10:00 AM to 4:00 PM), refuses double bookings, finds or creates the
client (matched by phone, then email), and adds the appointment to the **owner's** account. It
appears in the app's calendar like any other booking, with notes starting `[Website]`.

The website never holds database keys, and the public endpoint never returns client names or
phone numbers. It only returns the service menu, the opening hours and which times are busy.

## 1. Deploy (from the project folder)

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>        # the xxxx in https://xxxx.supabase.co
npx supabase secrets set OWNER_ID=<the owner's User UID>  # Authentication -> Users -> the account -> User UID
npx supabase functions deploy website-booking --no-verify-jwt
```

`--no-verify-jwt` is needed because website visitors aren't logged in. The function does its own checks.

Lock it to the website (no trailing slash):

```bash
npx supabase secrets set ALLOWED_ORIGINS=https://meltawaysspa.com,https://www.meltawaysspa.com
```

Endpoint: `https://<your-project-ref>.supabase.co/functions/v1/website-booking`

## 2. Test it

```bash
URL=https://<your-project-ref>.supabase.co/functions/v1/website-booking
curl "$URL"                       # services + opening hours
curl "$URL?date=2026-10-20"       # also busy times that day (a Tuesday)
curl -X POST "$URL" -H 'Content-Type: application/json' -d '{
  "name": "Test Client", "phone": "868 555 0000", "service_id": "<a service id from the first call>",
  "starts_at": "2026-10-20T11:00:00-04:00", "notes": "test booking, delete me" }'
```

Answers: `201` booked · `400` bad input or outside opening hours (message says what) ·
`409` time already taken · `500` server problem (check Edge Functions → website-booking → Logs).

## 3. Prompt to paste into Lovable

> Connect the booking form to our salon's booking API, and stop saving bookings to Lovable Cloud.
> Remove the bookings table/database code for the booking form; the API below is now the only place bookings go.
>
> Endpoint: `https://<your-project-ref>.supabase.co/functions/v1/website-booking`
>
> 1. On load, `GET` the endpoint. It returns
>    `{ services: [{ id, name, category, price, duration_min }], hours: { days, open, close, utc_offset } }`.
>    Show services grouped by category, with price in TT$ and the duration in minutes.
> 2. We're open **Tuesday to Saturday, 10:00 AM to 4:00 PM** (Trinidad time, UTC-4). In the date picker, disable
>    Sundays, Mondays and past dates. `hours.days` lists the open weekdays (0 = Sunday … 6 = Saturday).
> 3. When the customer picks a date, `GET ?date=YYYY-MM-DD`. It returns `busy: [{ starts_at, ends_at }]` and
>    `closed: true|false`. Offer start times every 30 minutes from 10:00 AM. Hide any time where the chosen service
>    (start + duration_min) would overlap a busy period, would finish after 4:00 PM, or is less than 1 hour from now.
>    If no times are left, say the day is fully booked.
> 4. Form fields: full name (required), phone (required), email (optional), notes (optional), and a hidden
>    text input named `company` that real users never see (leave it empty; it's a spam trap).
> 5. On submit, `POST` JSON `{ name, phone, email, notes, company, service_id, starts_at }` with `starts_at` as an
>    ISO string including the `-04:00` offset, e.g. `2026-10-20T14:00:00-04:00`.
> 6. On `201`, show a confirmation with the service, date and time. On `409`, say the time was just taken and
>    refresh the available times. On `400`, show the `error` message from the response. On anything else, ask them
>    to call the salon.

## Settings

| Where | What it does |
| --- | --- |
| `OWNER_ID` secret | **Required.** The account bookings belong to. Switch it from a test account to the owner's with one `secrets set`. |
| `ALLOWED_ORIGINS` secret | Only these websites may call the function. Unset = any site (only for testing). |
| `SALON_UTC_OFFSET` secret | Time zone. Default `-04:00`. |
| `WEBSITE_BOOKING_SECRET` secret | Requires an `x-booking-secret` header. Only for server-to-server calls. |
| Top of `index.ts` | Opening days and hours, notice (60 min) and how far ahead (120 days). Redeploy after changing. |
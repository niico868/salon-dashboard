# Website bookings (Lovable → Supabase)

The salon website calls this Edge Function. The function checks the booking, refuses
double bookings, finds or creates the client (matched by phone, then email), and adds the
appointment. It appears in the app like any other booking, with notes starting `[Website]`.

The website never holds database keys, and the public endpoint never returns client names
or phone numbers. It only returns the service menu and which times are busy.

## 1. Deploy (once, from this folder's project root)

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>        # the xxxx in https://xxxx.supabase.co
npx supabase functions deploy website-booking --no-verify-jwt
```

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
  "name": "Test Client", "phone": "868 555 0000", "service_id": "<a service id from the first call>",
  "starts_at": "2026-10-20T14:00:00-04:00", "notes": "test booking, delete me" }'
```

Answers: `201` booked · `400` bad input (message says what) · `409` time already taken · `500` server problem.

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
> 3. Form fields: full name (required), phone (required), email (optional), notes (optional), and a hidden
>    text input named `company` that real users never see (leave it empty; it's a spam trap).
> 4. On submit, `POST` JSON `{ name, phone, email, notes, company, service_id, starts_at }` with `starts_at` as an
>    ISO string including the `-04:00` offset, e.g. `2026-10-20T14:00:00-04:00`.
> 5. On `201`, show a confirmation with the service, date and time. On `409`, say the time was just taken and
>    refresh the available times. On `400`, show the `error` message from the response. On anything else, ask them
>    to call the salon.

## Options

| Secret | What it does |
| --- | --- |
| `ALLOWED_ORIGINS` | Only these websites may call the function. Leave unset to allow any site, which is fine while testing only. |
| `SALON_UTC_OFFSET` | Time zone used for `?date=`. Default `-04:00`. |
| `WEBSITE_BOOKING_SECRET` | Requires an `x-booking-secret` header. Use only if Lovable calls this from its own server code; a secret in browser code is visible to anyone. |

Notice and range limits (60 minutes' notice, up to 120 days ahead) are at the top of `index.ts`.

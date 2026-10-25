# Phone alerts for new website bookings and enquiries

When someone books or sends a message on meltawaysspa.com, the `website-booking` function sends a
push alert to every phone where the owner turned on **More → New booking alerts**. Tapping a booking
alert opens that appointment; an enquiry alert opens Home.

This is **web push**, for the dashboard installed as a web app. It doesn't work inside Expo Go.
The existing appointment reminders and morning brief (`src/lib/notifications.ts`) are unchanged.

## How it fits together

| Piece | File |
| --- | --- |
| Installable web app (manifest, icons, iPhone tags) | `public/index.html`, `public/manifest.json`, `public/icons/` |
| Shows the alert and opens the right screen | `public/sw.js` |
| Registers this phone (More tab switch) | `src/lib/webPush.ts`, `src/app/(tabs)/more.tsx` |
| Phones registered per account | `push_subscriptions` table, `supabase/sql/push.sql` |
| Sends the alerts | `supabase/functions/website-booking/index.ts` (`alertOwner`) |

## Setup (once)

1. **Create the table.** Supabase → SQL Editor → New query → paste `supabase/sql/push.sql` → Run.
2. **Make the alert keys** (a public/private pair) in the project folder:
   ```
   npx web-push generate-vapid-keys
   ```
   Keep the **Private Key** secret: it only goes into Supabase, never into the app or GitHub.
3. **Give the app the public key.** Add this line to `.env` (it isn't committed):
   ```
   EXPO_PUBLIC_VAPID_PUBLIC_KEY=<Public Key>
   ```
   Wherever the web app is hosted, add the same variable to the host's build settings.
4. **Give the function both keys and redeploy:**
   ```
   npx supabase secrets set VAPID_PUBLIC_KEY=<Public Key> VAPID_PRIVATE_KEY=<Private Key>
   npx supabase functions deploy website-booking --no-verify-jwt
   ```
5. **Turn alerts on.** Restart the app for the web (`npx expo start --web`, press `w`), log in as the
   owner, go to **More → New booking alerts → Turn on**, and allow notifications.
6. **Test:** make a booking on the website. The alert should arrive within a few seconds.

## On the owner's phone

- The dashboard must be opened from its **https** web address (once hosted), not Expo Go.
- **iPhone (iOS 16.4 or later):** open the address in Safari → Share → **Add to Home Screen**, open
  the app from the Home Screen icon, then More → Turn on. iPhone won't allow alerts any other way.
- **Android:** open in Chrome, More → Turn on. Installing it (menu → Add to Home screen) is optional
  but recommended.
- Each phone or browser is turned on separately. Logging out turns alerts off for that device.

## If alerts don't arrive

- **Function logs** (Supabase → Edge Functions → website-booking → Logs) show `Push alert failed`
  or `Push alerts skipped` with the reason. No log line usually means the VAPID secrets aren't set.
- **More tab says "blocked":** notifications were denied. Allow them in the browser/phone settings.
- Bookings and enquiries are saved even if an alert fails.

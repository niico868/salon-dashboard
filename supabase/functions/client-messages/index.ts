// Automatic client emails: appointment reminders, aftercare, 1-week check-in, rebooking offers
// and birthday wishes. Runs every 15 minutes (see supabase/sql/client-messages.sql) and sends
// through Resend. Setup steps: README.md in this folder.
//
//   POST (x-cron-secret header)                       send whatever is due now
//   POST (x-cron-secret) { "dry_run": true }          list what would be sent, send nothing
//   POST (x-cron-secret) { "test_to": "you@x.com" }   send one sample of every email to that address
//   GET  ?unsubscribe=<token>&scope=offers|all         the page behind the unsubscribe link
//   POST ?unsubscribe=<token>&scope=offers|all         confirms it (also used by Gmail's one-click unsubscribe)
//
// Secrets (npx supabase secrets set NAME=value):
//   OWNER_ID         Krystal's user id (same one website-booking uses)
//   CRON_SECRET      any long random text; the same value goes in the SQL schedule
//   RESEND_API_KEY   from resend.com -> API Keys
//   MESSAGES_LIVE    set to true to really send. Until then every run is a dry run.
// Optional:
//   MAIL_FROM        default "Melt Aways <hello@meltawaysspa.com>" (must be on the domain verified in Resend)
//   REPLY_TO         default meltawaystt@gmail.com (client replies land here)
//   BOOKING_URL      default https://meltawaysspa.com/booking
//   SALON_PHONE      shown at the bottom of every email
//   TEST_RECIPIENT   while set, every real email goes to this address instead of the client
import { createClient } from 'npm:@supabase/supabase-js@2';
import { dueMessages, MARKETING, type AppointmentRow, type ClientRow, type Kind } from './rules.ts';
import { renderEmail, type EmailData } from './templates.ts';

const env = (k: string, fallback = '') => (Deno.env.get(k) ?? fallback).trim();
const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  ?? JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const db = createClient(SUPABASE_URL, secretKey, { auth: { persistSession: false } });

const OWNER_ID = env('OWNER_ID');
const CRON_SECRET = env('CRON_SECRET');
const RESEND_API_KEY = env('RESEND_API_KEY');
const LIVE = env('MESSAGES_LIVE').toLowerCase() === 'true';
const MAIL_FROM = env('MAIL_FROM', 'Melt Aways <hello@meltawaysspa.com>');
const REPLY_TO = env('REPLY_TO', 'meltawaystt@gmail.com');
const BOOKING_URL = env('BOOKING_URL', 'https://meltawaysspa.com/booking');
const SALON_PHONE = env('SALON_PHONE');
const TEST_RECIPIENT = env('TEST_RECIPIENT');
const SELF_URL = `${SUPABASE_URL}/functions/v1/client-messages`;

const DAY = 86400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { 'Content-Type': 'application/json' } });
const firstName = (full: string) => full.trim().split(/\s+/)[0] || 'there';
const unsubscribeUrl = (token: string, kind: Kind) =>
  `${SELF_URL}?unsubscribe=${token}&scope=${MARKETING.includes(kind) ? 'offers' : 'all'}`;

async function sendEmail(to: string, kind: Kind, data: EmailData, idempotencyKey?: string) {
  const { subject, html, text } = renderEmail(kind, data);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: MAIL_FROM, to: [to], reply_to: REPLY_TO, subject, html, text,
      headers: { 'List-Unsubscribe': `<${data.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      tags: [{ name: 'kind', value: kind }],
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body?.message ?? JSON.stringify(body)}`);
  return String(body?.id ?? '');
}

// ---------- Unsubscribe pages ----------
const page = (title: string, body: string) => new Response(
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#FFFCF9;font-family:Helvetica,Arial,sans-serif;color:#1D1A19">
<div style="max-width:440px;margin:48px auto;padding:24px;background:#fff;border:1px solid #EBDEDC;border-radius:12px;text-align:center">
<div style="font-family:Georgia,serif;font-size:26px;color:#9D3438;margin-bottom:16px">Melt Aways</div>${body}</div></body></html>`,
  { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

async function unsubscribe(req: Request, url: URL) {
  const token = url.searchParams.get('unsubscribe') ?? '';
  const scope = url.searchParams.get('scope') === 'offers' ? 'offers' : 'all';
  if (!UUID.test(token)) return page('Link not valid', '<p>This unsubscribe link is not valid.</p>');

  if (req.method === 'GET') {
    // A button, not an automatic unsubscribe: email scanners open links, and that must not unsubscribe anyone
    const what = scope === 'offers' ? 'offers and birthday emails' : 'all emails from Melt Aways';
    return page('Unsubscribe', `<p style="line-height:1.6">Stop receiving ${what}?</p>
<form method="post"><button style="background:#9D3438;color:#fff;border:0;border-radius:8px;padding:14px 22px;font-size:16px;cursor:pointer">Yes, unsubscribe me</button></form>
${scope === 'offers' ? '<p style="font-size:13px;color:#60514F;margin-top:20px">You will still get appointment reminders and aftercare.</p>' : ''}`);
  }

  const change = scope === 'offers' ? { marketing_opt_in: false } : { emails_off: true, marketing_opt_in: false };
  const { error } = await db.from('clients').update(change).eq('unsubscribe_token', token).eq('owner_id', OWNER_ID);
  if (error) {
    console.error('Unsubscribe failed', error);
    return page('Something went wrong', '<p>Sorry, that did not work. Please reply to any of our emails and we will remove you.</p>');
  }
  return page('Unsubscribed', `<p style="line-height:1.6">Done. You won't receive ${scope === 'offers' ? 'offers or birthday emails' : 'emails from us'} any more.</p>`);
}

// ---------- Scheduled run ----------
async function run(dryRun: boolean) {
  const now = new Date();
  const [clients, appts, sent] = await Promise.all([
    db.from('clients').select('id, full_name, email, birthday, marketing_opt_in, emails_off, unsubscribe_token').eq('owner_id', OWNER_ID),
    // Only what any rule can still act on: the next 3 days of bookings and the last ~2 months of finished visits
    db.from('appointments').select('id, client_id, service_name, starts_at, created_at, status, completed_at').eq('owner_id', OWNER_ID)
      .or(`and(status.eq.booked,starts_at.gte.${new Date(now.getTime() - DAY).toISOString()},starts_at.lte.${new Date(now.getTime() + 3 * DAY).toISOString()}),` +
        `and(status.eq.completed,completed_at.gte.${new Date(now.getTime() - 65 * DAY).toISOString()})`),
    db.from('client_messages').select('dedupe_key').eq('owner_id', OWNER_ID)
      .gte('created_at', new Date(now.getTime() - 70 * DAY).toISOString()),
  ]);
  for (const r of [clients, appts, sent]) if (r.error) throw r.error;

  // Later-booked visits matter for "has already rebooked", so also check every future booking
  const upcoming = await db.from('appointments').select('id, client_id, service_name, starts_at, created_at, status, completed_at')
    .eq('owner_id', OWNER_ID).eq('status', 'booked').gt('starts_at', now.toISOString());
  if (upcoming.error) throw upcoming.error;
  const clientRows = clients.data as (ClientRow & { unsubscribe_token: string })[];
  const apptRows = [...appts.data, ...upcoming.data] as AppointmentRow[];
  const allAppts = new Map(apptRows.map((a) => [a.id, a]));

  const tokens = new Map(clientRows.map((c) => [c.id, c.unsubscribe_token]));
  const due = dueMessages(now, clientRows, [...allAppts.values()],
    new Set((sent.data as { dedupe_key: string }[]).map((s) => s.dedupe_key)));

  if (dryRun || !LIVE) {
    return { live: LIVE, dry_run: true, due: due.map((d) => ({ kind: d.kind, client: d.client.full_name, key: d.key })) };
  }
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');

  const results = [];
  for (const d of due) {
    const to = TEST_RECIPIENT || d.client.email!.trim();
    // Claim this message first: the unique key means a second run can never send it again
    const claim = await db.from('client_messages').insert({
      owner_id: OWNER_ID, client_id: d.client.id, appointment_id: d.appointment?.id ?? null,
      kind: d.kind, dedupe_key: d.key, recipient: to, status: TEST_RECIPIENT ? 'test' : 'sent',
    }).select('id').single();
    if (claim.error) { if (claim.error.code !== '23505') console.error('Claim failed', d.key, claim.error); continue; }

    try {
      const id = await sendEmail(to, d.kind, {
        firstName: firstName(d.client.full_name), serviceName: d.appointment?.service_name,
        startsAt: d.appointment?.starts_at, bookingUrl: BOOKING_URL, salonPhone: SALON_PHONE,
        unsubscribeUrl: unsubscribeUrl(tokens.get(d.client.id) ?? '', d.kind),
      }, d.key);
      await db.from('client_messages').update({ provider_id: id }).eq('id', claim.data.id);
      results.push({ key: d.key, ok: true });
    } catch (e) {
      const error = String((e as Error).message ?? e).slice(0, 500);
      console.error('Send failed', d.key, error);
      await db.from('client_messages').update({ status: 'failed', error }).eq('id', claim.data.id);
      results.push({ key: d.key, ok: false, error });
    }
  }
  return { live: true, test_recipient: TEST_RECIPIENT || null, sent: results };
}

async function sendSamples(to: string) {
  const kinds: Kind[] = ['reminder_2d', 'reminder_1d', 'aftercare', 'checkin_1w', 'rebook_1m', 'rebook_2m', 'birthday'];
  const results = [];
  for (const kind of kinds) {
    try {
      await sendEmail(to, kind, {
        firstName: 'Krystal', serviceName: 'Cavitation', startsAt: new Date(Date.now() + 2 * DAY).toISOString(),
        bookingUrl: BOOKING_URL, salonPhone: SALON_PHONE,
        unsubscribeUrl: `${SELF_URL}?unsubscribe=00000000-0000-0000-0000-000000000000&scope=all`,
      });
      results.push({ kind, ok: true });
    } catch (e) {
      results.push({ kind, ok: false, error: (e as Error).message });
    }
  }
  return { samples_to: to, results };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (!UUID.test(OWNER_ID)) {
    console.error('OWNER_ID secret is missing. Run: npx supabase secrets set OWNER_ID=<owner user id>');
    return json(500, { error: 'OWNER_ID is not set' });
  }
  if (url.searchParams.has('unsubscribe')) return unsubscribe(req, url);

  if (req.method !== 'POST') return json(405, { error: 'Use POST' });
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return json(401, { error: 'Unauthorized' });

  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.test_to === 'string' && body.test_to.includes('@')) {
      if (!RESEND_API_KEY) return json(500, { error: 'RESEND_API_KEY is not set' });
      return json(200, await sendSamples(body.test_to));
    }
    return json(200, await run(body?.dry_run === true));
  } catch (e) {
    console.error(e);
    return json(500, { error: String((e as Error).message ?? e) });
  }
});

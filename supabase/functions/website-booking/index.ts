// Public booking endpoint for the salon's website (built in Lovable).
//
//   GET  /website-booking                  -> { services }
//   GET  /website-booking?date=2026-10-20  -> { services, busy: [{ starts_at, ends_at }] }  (no client details)
//   POST /website-booking  { name, phone, email?, service_id, starts_at, notes? }  -> 201 { id, ... }
//   POST /website-booking  { type: 'enquiry', source, name, phone?, email?, message } -> 201 { ok: true }
//
// The website never gets database keys. This function uses the server-side secret key,
// validates everything, refuses double bookings and matches returning clients by phone.
//
// Required secret:
//   OWNER_ID                 the salon owner's user id (Supabase -> Authentication -> Users). Every table has an
//                            owner_id column that the app fills from whoever is logged in; this function isn't
//                            logged in, so it stamps rows with this id and only reads that owner's data.
//
// Optional secrets (supabase secrets set NAME=value):
//   ALLOWED_ORIGINS          comma-separated site URLs allowed to call this, e.g. https://mysalon.com,https://mysalon.lovable.app
//   WEBSITE_BOOKING_SECRET   if set, callers must send it in the x-booking-secret header (only for server-to-server calls)
//   SALON_UTC_OFFSET         defaults to -04:00 (Trinidad); used to turn ?date= into a day range
import { createClient } from 'npm:@supabase/supabase-js@2';

const OFFSET = Deno.env.get('SALON_UTC_OFFSET') ?? '-04:00';
const MAX_DAYS_AHEAD = 120;
const MIN_NOTICE_MIN = 60;

const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  ?? JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default;
const db = createClient(Deno.env.get('SUPABASE_URL')!, secretKey, { auth: { persistSession: false } });

const OWNER_ID = (Deno.env.get('OWNER_ID') ?? '').trim();
// Only this owner's rows (not a test account's) count for the menu, busy times and client matching
const mine = <Q extends { eq: (col: string, v: string) => Q }>(q: Q): Q => q.eq('owner_id', OWNER_ID);
const owner = () => ({ owner_id: OWNER_ID });

const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);

function cors(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': !allowed.length ? '*' : allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-booking-secret',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// Same rule as the app's WhatsApp links, so "868-555-1234" and "+1 868 555 1234" match
const normPhone = (p: string) => { const d = p.replace(/\D/g, ''); return d.length === 7 ? '1868' + d : d.length === 10 ? '1' + d : d; };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = ['contact', 'consultation', 'treatment-finder', 'visit'];

// Find a returning client by phone, then email. Returns undefined for someone new.
async function findClient(phone: string, email: string) {
  const existing = await mine(db.from('clients').select('id, phone, email'));
  if (existing.error) throw existing.error;
  const want = phone ? normPhone(phone) : '';
  return (want ? existing.data.find((c) => c.phone && normPhone(c.phone) === want) : undefined)
    ?? (email ? existing.data.find((c) => c.email?.toLowerCase() === email) : undefined);
}

Deno.serve(async (req) => {
  const headers = { ...cors(req), 'Content-Type': 'application/json' };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  const origin = req.headers.get('origin');
  if (allowed.length && origin && !allowed.includes(origin)) return reply(403, { error: 'Origin not allowed' });
  const secret = Deno.env.get('WEBSITE_BOOKING_SECRET');
  if (secret && req.headers.get('x-booking-secret') !== secret) return reply(401, { error: 'Unauthorized' });

  if (!UUID.test(OWNER_ID)) {
    console.error('OWNER_ID secret is missing or not a user id. Run: npx supabase secrets set OWNER_ID=<owner user id>');
    return reply(500, { error: 'Booking is not set up yet. Please call the salon.' });
  }

  try {
    if (req.method === 'GET') {
      const services = await mine(db.from('services').select('id, name, category, price, duration_min')
        .eq('active', true)).order('category').order('name');
      if (services.error) throw services.error;

      const date = new URL(req.url).searchParams.get('date');
      if (!date) return reply(200, { services: services.data });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return reply(400, { error: 'date must look like 2026-10-20' });
      const from = new Date(`${date}T00:00:00${OFFSET}`);
      const to = new Date(from.getTime() + 24 * 3600_000);
      const busy = await mine(db.from('appointments').select('starts_at, ends_at'))
        .eq('status', 'booked').lt('starts_at', to.toISOString()).gt('ends_at', from.toISOString()).order('starts_at');
      if (busy.error) throw busy.error;
      return reply(200, { services: services.data, busy: busy.data });
    }

    if (req.method !== 'POST') return reply(405, { error: 'Use GET or POST' });

    const b = await req.json().catch(() => null);
    if (!b || typeof b !== 'object') return reply(400, { error: 'Send a JSON body' });
    // Spam trap: a hidden field that people never see and bots fill in. It used to be called `company`,
    // but browsers autofill that name from saved addresses, so real customers were silently dropped.
    // `company` is now ignored; the website sends the trap as `mk_hp`, which no browser autofills.
    if (b.mk_hp) {
      console.warn('Spam trap filled, request ignored:', JSON.stringify({ type: b.type ?? 'booking', name: b.name, origin }));
      return reply(201, { ok: true });
    }

    // Messages from the contact / consultation / treatment-finder / visiting forms.
    // These have no service or time, so they are saved for the owner to follow up rather than booked.
    if (b.type === 'enquiry') {
      const name = String(b.name ?? '').trim();
      const phone = String(b.phone ?? '').trim();
      const email = String(b.email ?? '').trim().toLowerCase();
      const message = String(b.message ?? '').trim();
      const problems = [
        (name.length < 2 || name.length > 100) && 'name',
        phone && !/^\d{7,15}$/.test(phone.replace(/\D/g, '')) && 'phone',
        email && (!EMAIL.test(email) || email.length > 200) && 'email',
        !phone && !email && 'phone or email',
        message.length > 2000 && 'message',
      ].filter(Boolean);
      if (problems.length) return reply(400, { error: `Please check: ${problems.join(', ')}` });

      const client = await findClient(phone, email);
      const saved = await db.from('enquiries').insert({
        ...owner(), client_id: client?.id ?? null,
        source: SOURCES.includes(String(b.source)) ? String(b.source) : 'other',
        name, phone: phone || null, email: email || null, message,
      });
      if (saved.error) throw saved.error;
      return reply(201, { ok: true });
    }

    const name = String(b.name ?? '').trim();
    const phone = String(b.phone ?? '').trim();
    const email = String(b.email ?? '').trim().toLowerCase();
    const notes = String(b.notes ?? '').trim();
    const start = new Date(String(b.starts_at ?? ''));
    const problems = [
      (name.length < 2 || name.length > 100) && 'name',
      !/^\d{7,15}$/.test(phone.replace(/\D/g, '')) && 'phone',
      email && (!EMAIL.test(email) || email.length > 200) && 'email',
      !UUID.test(String(b.service_id ?? '')) && 'service_id',
      isNaN(start.getTime()) && 'starts_at',
      notes.length > 500 && 'notes',
    ].filter(Boolean);
    if (problems.length) return reply(400, { error: `Please check: ${problems.join(', ')}` });

    const now = Date.now();
    if (start.getTime() < now + MIN_NOTICE_MIN * 60_000) return reply(400, { error: `Bookings need at least ${MIN_NOTICE_MIN} minutes' notice` });
    if (start.getTime() > now + MAX_DAYS_AHEAD * 86400_000) return reply(400, { error: `Bookings can be made up to ${MAX_DAYS_AHEAD} days ahead` });

    const svc = await mine(db.from('services').select('id, name, price, duration_min')).eq('id', b.service_id).eq('active', true).maybeSingle();
    if (svc.error) throw svc.error;
    if (!svc.data) return reply(400, { error: 'That service is not available' });
    const end = new Date(start.getTime() + svc.data.duration_min * 60_000);

    const clash = await mine(db.from('appointments').select('id')).eq('status', 'booked')
      .lt('starts_at', end.toISOString()).gt('ends_at', start.toISOString()).limit(1);
    if (clash.error) throw clash.error;
    if (clash.data.length) return reply(409, { error: 'Sorry, that time was just taken. Please pick another.' });

    // Returning client? Match on phone number, then on email
    let client = await findClient(phone, email);
    if (!client) {
      const created = await db.from('clients').insert({ ...owner(), full_name: name, phone, email: email || null })
        .select('id, phone, email').single();
      if (created.error) throw created.error;
      client = created.data;
    } else if (email && !client.email) {
      await db.from('clients').update({ email }).eq('id', client.id);
    }

    const appt = await db.from('appointments').insert({
      ...owner(), client_id: client.id, service_id: svc.data.id, service_name: svc.data.name, price: svc.data.price,
      starts_at: start.toISOString(), ends_at: end.toISOString(),
      notes: `[Website] ${notes}`.trim(),
    }).select('id, starts_at, ends_at, service_name, price').single();
    if (appt.error) throw appt.error;

    return reply(201, appt.data);
  } catch (e) {
    console.error(e);
    return reply(500, { error: 'Something went wrong. Please call the salon to book.' });
  }
});

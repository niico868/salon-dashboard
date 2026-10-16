// Public booking endpoint for the salon's website (built in Lovable).
//
//   GET  /website-booking                  -> { services, hours }
//   GET  /website-booking?date=2026-10-20  -> { services, hours, closed, busy: [{ starts_at, ends_at }] }  (no client details)
//   POST /website-booking  { name, phone, email?, service_id | service_name, starts_at, notes?, duration_min? }  -> 201 { id, ... }
//        service_name is matched to the app's menu; an unknown name is still booked at TT$0 and flagged in the notes
//   POST /website-booking  { type: 'enquiry', name, phone, email?, message?, source? }  -> 201 { ok: true }
//        (other website forms: creates/updates the client and adds them to today's follow-ups)
//
// The website never gets database keys. This function uses the server-side secret key,
// validates everything, refuses double bookings and matches returning clients by phone.
// Because the secret key skips the database's security rules, every query below is limited
// to ONE account: the salon owner's (the OWNER_ID secret).
//
// Required secret (supabase secrets set NAME=value):
//   OWNER_ID                 the owner's User UID from Supabase: Authentication -> Users
// Optional secrets:
//   ALLOWED_ORIGINS          comma-separated site URLs allowed to call this, e.g. https://meltawaysspa.com
//   WEBSITE_BOOKING_SECRET   if set, callers must send it in the x-booking-secret header (only for server-to-server calls)
//   SALON_UTC_OFFSET         defaults to -04:00 (Trinidad); used for opening hours and ?date=
import { createClient } from 'npm:@supabase/supabase-js@2';

// ---- Salon settings -------------------------------------------------------
const OPEN_DAYS = [2, 3, 4, 5, 6]; // 0 = Sunday ... 6 = Saturday -> Tuesday to Saturday
const OPEN_HOUR = 10;              // 10:00 AM
const CLOSE_HOUR = 16;             // 4:00 PM: appointments must finish by then
const MAX_DAYS_AHEAD = 120;
const MIN_NOTICE_MIN = 60;
// ---------------------------------------------------------------------------

const OWNER_ID = (Deno.env.get('OWNER_ID') ?? '').trim();
const OFFSET = Deno.env.get('SALON_UTC_OFFSET') ?? '-04:00';
const OFFSET_MIN = (() => {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(OFFSET);
  if (!m) return -240;
  const v = Number(m[2]) * 60 + Number(m[3]);
  return m[1] === '-' ? -v : v;
})();

const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  ?? JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default;
const db = createClient(Deno.env.get('SUPABASE_URL')!, secretKey, { auth: { persistSession: false } });

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
// "Silk Press", "silk-press" and " silk press " all count as the same service
const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The salon's local clock for a moment in time: weekday and minutes since midnight
function local(d: Date) {
  const l = new Date(d.getTime() + OFFSET_MIN * 60_000);
  return { day: l.getUTCDay(), minutes: l.getUTCHours() * 60 + l.getUTCMinutes() };
}

// Returning client? Match on phone number, then on email (only among the owner's clients).
// Otherwise create a new client in the owner's account.
async function findOrCreateClient(name: string, phone: string, email: string) {
  const existing = await db.from('clients').select('id, phone, email').eq('owner_id', OWNER_ID);
  if (existing.error) throw existing.error;
  const want = normPhone(phone);
  const found = existing.data.find((c) => c.phone && normPhone(c.phone) === want)
    ?? (email ? existing.data.find((c) => c.email?.toLowerCase() === email) : undefined);
  if (found) {
    if (email && !found.email) await db.from('clients').update({ email }).eq('id', found.id).eq('owner_id', OWNER_ID);
    return found;
  }
  const created = await db.from('clients')
    .insert({ owner_id: OWNER_ID, full_name: name, phone, email: email || null })
    .select('id, phone, email').single();
  if (created.error) throw created.error;
  return created.data;
}

const HOURS = {
  days: OPEN_DAYS,
  open: `${String(OPEN_HOUR).padStart(2, '0')}:00`,
  close: `${String(CLOSE_HOUR).padStart(2, '0')}:00`,
  utc_offset: OFFSET,
};

Deno.serve(async (req) => {
  const headers = { ...cors(req), 'Content-Type': 'application/json' };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  const origin = req.headers.get('origin');
  if (allowed.length && origin && !allowed.includes(origin)) return reply(403, { error: 'Origin not allowed' });
  const secret = Deno.env.get('WEBSITE_BOOKING_SECRET');
  if (secret && req.headers.get('x-booking-secret') !== secret) return reply(401, { error: 'Unauthorized' });

  if (!UUID.test(OWNER_ID)) {
    console.error('OWNER_ID secret is missing or not a User UID. Set it with: npx supabase secrets set OWNER_ID=...');
    return reply(500, { error: 'Online booking is not set up yet. Please call the salon to book.' });
  }

  try {
    if (req.method === 'GET') {
      const services = await db.from('services').select('id, name, category, price, duration_min')
        .eq('owner_id', OWNER_ID).eq('active', true).order('category').order('name');
      if (services.error) throw services.error;

      const date = new URL(req.url).searchParams.get('date');
      if (!date) return reply(200, { services: services.data, hours: HOURS });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return reply(400, { error: 'date must look like 2026-10-20' });
      const from = new Date(`${date}T00:00:00${OFFSET}`);
      if (isNaN(from.getTime())) return reply(400, { error: 'date must look like 2026-10-20' });
      const to = new Date(from.getTime() + 24 * 3600_000);
      const closed = !OPEN_DAYS.includes(local(from).day);
      if (closed) return reply(200, { services: services.data, hours: HOURS, closed: true, busy: [] });

      const busy = await db.from('appointments').select('starts_at, ends_at')
        .eq('owner_id', OWNER_ID).eq('status', 'booked')
        .lt('starts_at', to.toISOString()).gt('ends_at', from.toISOString()).order('starts_at');
      if (busy.error) throw busy.error;
      return reply(200, { services: services.data, hours: HOURS, closed: false, busy: busy.data });
    }

    if (req.method !== 'POST') return reply(405, { error: 'Use GET or POST' });

    const b = await req.json().catch(() => null);
    if (!b || typeof b !== 'object') return reply(400, { error: 'Send a JSON body' });
    // Hidden form field that people leave empty and spam bots fill in
    if (b.company) return reply(201, { ok: true });

    const name = String(b.name ?? '').trim();
    const phone = String(b.phone ?? '').trim();
    const email = String(b.email ?? '').trim().toLowerCase();

    // ---- Enquiries from the other website forms (treatment finder, visits, consultations) ----
    // No time slot: create or update the client, and put them on the app's Follow-ups list for today.
    if (b.type === 'enquiry') {
      const message = String(b.message ?? '').trim();
      const source = String(b.source ?? 'enquiry').trim().slice(0, 50) || 'enquiry';
      const bad = [
        (name.length < 2 || name.length > 100) && 'name',
        !/^\d{7,15}$/.test(phone.replace(/\D/g, '')) && 'phone',
        email && (!EMAIL.test(email) || email.length > 200) && 'email',
        message.length > 2000 && 'message',
      ].filter(Boolean);
      if (bad.length) return reply(400, { error: `Please check: ${bad.join(', ')}` });

      const client = await findOrCreateClient(name, phone, email);
      const today = new Date(Date.now() + OFFSET_MIN * 60_000).toISOString().slice(0, 10);
      const line = `Website ${source}: ${message || '(no message)'}`;
      const current = await db.from('clients').select('notes').eq('id', client.id).eq('owner_id', OWNER_ID).single();
      if (current.error) throw current.error;
      const notesText = [current.data.notes, `[${today}] ${line}`].filter(Boolean).join('\n').slice(-5000);
      const upd = await db.from('clients').update({
        notes: notesText,
        follow_up_date: today,
        follow_up_note: line.slice(0, 300),
      }).eq('id', client.id).eq('owner_id', OWNER_ID);
      if (upd.error) throw upd.error;
      return reply(201, { ok: true });
    }

    const notes = String(b.notes ?? '').trim();
    const start = new Date(String(b.starts_at ?? ''));
    const serviceId = String(b.service_id ?? '').trim();
    const serviceName = String(b.service_name ?? '').trim().slice(0, 100);
    const problems = [
      (name.length < 2 || name.length > 100) && 'name',
      !/^\d{7,15}$/.test(phone.replace(/\D/g, '')) && 'phone',
      email && (!EMAIL.test(email) || email.length > 200) && 'email',
      !UUID.test(serviceId) && serviceName.length < 2 && 'service',
      isNaN(start.getTime()) && 'starts_at',
      notes.length > 500 && 'notes',
    ].filter(Boolean);
    if (problems.length) return reply(400, { error: `Please check: ${problems.join(', ')}` });

    const now = Date.now();
    if (start.getTime() < now + MIN_NOTICE_MIN * 60_000) return reply(400, { error: `Bookings need at least ${MIN_NOTICE_MIN} minutes' notice` });
    if (start.getTime() > now + MAX_DAYS_AHEAD * 86400_000) return reply(400, { error: `Bookings can be made up to ${MAX_DAYS_AHEAD} days ahead` });

    // Which service? By app id first, then by name against the app's menu (ignoring case,
    // spaces and punctuation). The app's own price and duration are always used, never the website's.
    type Svc = { id: string | null; name: string; price: number; duration_min: number };
    let service: Svc | null = null;
    if (UUID.test(serviceId)) {
      const r = await db.from('services').select('id, name, price, duration_min')
        .eq('owner_id', OWNER_ID).eq('id', serviceId).eq('active', true).maybeSingle();
      if (r.error) throw r.error;
      service = r.data;
    }
    if (!service && serviceName) {
      const r = await db.from('services').select('id, name, price, duration_min')
        .eq('owner_id', OWNER_ID).eq('active', true);
      if (r.error) throw r.error;
      service = r.data.find((s) => normName(s.name) === normName(serviceName)) ?? null;
    }
    // Not on the app's menu: still take the booking so it isn't lost, at TT$0, flagged for the owner
    const unmatched = !service;
    if (!service) {
      if (!serviceName) return reply(400, { error: 'That service is not available' });
      const dur = Math.min(480, Math.max(15, Math.round(Number(b.duration_min) || 60)));
      service = { id: null, name: serviceName, price: 0, duration_min: dur };
    }
    const svc = { data: service };
    const end = new Date(start.getTime() + svc.data.duration_min * 60_000);

    // Opening hours: an open day, starting at or after opening, finishing by closing
    const s = local(start);
    if (!OPEN_DAYS.includes(s.day) || s.minutes < OPEN_HOUR * 60 || s.minutes + svc.data.duration_min > CLOSE_HOUR * 60) {
      return reply(400, { error: `We're open Tuesday to Saturday, ${HOURS.open} to ${HOURS.close}. Please pick a time that finishes by closing.` });
    }

    const clash = await db.from('appointments').select('id')
      .eq('owner_id', OWNER_ID).eq('status', 'booked')
      .lt('starts_at', end.toISOString()).gt('ends_at', start.toISOString()).limit(1);
    if (clash.error) throw clash.error;
    if (clash.data.length) return reply(409, { error: 'Sorry, that time was just taken. Please pick another.' });

    const client = await findOrCreateClient(name, phone, email);

    const appt = await db.from('appointments').insert({
      owner_id: OWNER_ID, client_id: client.id, service_id: svc.data.id, service_name: svc.data.name,
      price: svc.data.price, status: 'booked',
      starts_at: start.toISOString(), ends_at: end.toISOString(),
      notes: `[Website]${unmatched ? ' Not on app menu, set price.' : ''} ${notes}`.trim(),
    }).select('id, starts_at, ends_at, service_name, price').single();
    if (appt.error) throw appt.error;

    return reply(201, appt.data);
  } catch (e) {
    console.error(e);
    return reply(500, { error: 'Something went wrong. Please call the salon to book.' });
  }
});
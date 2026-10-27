// Decides which automatic messages are due right now. Pure logic: no database, no sending,
// so it can be tested on its own (see rules.test.ts) and reused later for WhatsApp.

export type Kind = 'reminder_2d' | 'reminder_1d' | 'aftercare' | 'checkin_1w' | 'rebook_1m' | 'rebook_2m' | 'birthday';

export type ClientRow = {
  id: string; full_name: string; email: string | null; birthday: string | null;
  marketing_opt_in: boolean; emails_off: boolean;
};
export type AppointmentRow = {
  id: string; client_id: string; service_name: string; starts_at: string; created_at: string;
  status: 'booked' | 'completed' | 'cancelled' | 'no_show'; completed_at: string | null;
};
export type Due = { kind: Kind; key: string; client: ClientRow; appointment?: AppointmentRow };

// Offers and birthday wishes are marketing: only for clients who said yes.
export const MARKETING: Kind[] = ['rebook_1m', 'rebook_2m', 'birthday'];

export const TIME_ZONE = 'America/Port_of_Spain';
export const SEND_FROM_HOUR = 8;   // no emails before 8 AM salon time…
export const SEND_UNTIL_HOUR = 20; // …or from 8 PM on. Anything due waits for the morning.

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Salon-time calendar parts for an instant
export function salonParts(d: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23',
  }).formatToParts(d).map((x) => [x.type, x.value]));
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day), hour: Number(p.hour) };
}

export const isSendingHours = (now: Date) => {
  const h = salonParts(now).hour;
  return h >= SEND_FROM_HOUR && h < SEND_UNTIL_HOUR;
};

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// Is today (salon time) this client's birthday? 29 Feb birthdays are celebrated on 28 Feb in other years.
export function isBirthdayToday(birthday: string | null, now: Date) {
  if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return false;
  const [, m, d] = birthday.split('-').map(Number);
  const t = salonParts(now);
  const day = m === 2 && d === 29 && !isLeap(t.year) ? 28 : d;
  return t.month === m && t.day === day;
}

export function dueMessages(now: Date, clients: ClientRow[], appointments: AppointmentRow[], alreadySent: Set<string>): Due[] {
  if (!isSendingHours(now)) return [];
  const t = now.getTime();
  const out: Due[] = [];
  const reachable = new Map(clients
    .filter((c) => !c.emails_off && c.email && EMAIL.test(c.email.trim()))
    .map((c) => [c.id, c]));

  const add = (kind: Kind, key: string, client: ClientRow, appointment?: AppointmentRow) => {
    if (alreadySent.has(key)) return;
    if (MARKETING.includes(kind) && !client.marketing_opt_in) return;
    out.push({ kind, key, client, appointment });
  };

  // Per client: their most recent visit and whether they already have one booked
  const lastDone = new Map<string, AppointmentRow>();
  const hasUpcoming = new Set<string>();
  for (const a of appointments) {
    if (a.status === 'completed' && a.completed_at) {
      const prev = lastDone.get(a.client_id);
      if (!prev || Date.parse(a.completed_at) > Date.parse(prev.completed_at!)) lastDone.set(a.client_id, a);
    }
    if (a.status === 'booked' && Date.parse(a.starts_at) > t) hasUpcoming.add(a.client_id);
  }

  for (const a of appointments) {
    const c = reachable.get(a.client_id);
    if (!c) continue;

    if (a.status === 'booked') {
      const start = Date.parse(a.starts_at);
      const left = start - t;
      const bookedAhead = start - Date.parse(a.created_at);
      // Two days out, only if they booked more than two days ahead (otherwise it repeats the booking email)
      if (left > DAY && left <= 2 * DAY && bookedAhead > 2 * DAY) add('reminder_2d', `reminder_2d:${a.id}`, c, a);
      // The day before, only if they booked more than a day ahead
      if (left > HOUR && left <= DAY && bookedAhead > DAY) add('reminder_1d', `reminder_1d:${a.id}`, c, a);
    }

    if (a.status === 'completed' && a.completed_at) {
      const since = t - Date.parse(a.completed_at);
      if (since < 0) continue;
      // Straight after the visit (up to 2 days, so a visit finished after 8 PM still gets it next morning)
      if (since <= 2 * DAY) add('aftercare', `aftercare:${a.id}`, c, a);
      if (since >= 7 * DAY && since <= 9 * DAY) add('checkin_1w', `checkin_1w:${a.id}`, c, a);

      // Rebooking nudges: only about their latest visit, and not if they've already booked again
      const latest = lastDone.get(a.client_id)?.id === a.id && !hasUpcoming.has(a.client_id);
      if (latest && since >= 30 * DAY && since <= 33 * DAY) add('rebook_1m', `rebook_1m:${a.id}`, c, a);
      if (latest && since >= 60 * DAY && since <= 63 * DAY) add('rebook_2m', `rebook_2m:${a.id}`, c, a);
    }
  }

  const year = salonParts(now).year;
  for (const c of reachable.values()) {
    if (isBirthdayToday(c.birthday, now)) add('birthday', `birthday:${c.id}:${year}`, c);
  }
  return out;
}

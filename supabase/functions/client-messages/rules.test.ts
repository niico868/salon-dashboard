// Run: node --experimental-strip-types --test supabase/functions/client-messages/rules.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dueMessages, isBirthdayToday, type AppointmentRow, type ClientRow } from './rules.ts';
import { renderEmail } from './templates.ts';

const H = 3600_000, D = 24 * H;
// Tue 10 Nov 2026, 9:00 AM in Trinidad (UTC-4)
const NOW = new Date('2026-11-10T13:00:00Z');
const at = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

const client = (o: Partial<ClientRow> = {}): ClientRow => ({
  id: 'c1', full_name: 'Ana Lee', email: 'ana@example.com', birthday: null, marketing_opt_in: false, emails_off: false, ...o,
});
const appt = (o: Partial<AppointmentRow> = {}): AppointmentRow => ({
  id: 'a1', client_id: 'c1', service_name: 'Cavitation', starts_at: at(36 * H), created_at: at(-10 * D),
  status: 'booked', completed_at: null, ...o,
});
const kinds = (clients: ClientRow[], appts: AppointmentRow[], sent = new Set<string>(), now = NOW) =>
  dueMessages(now, clients, appts, sent).map((d) => d.kind).sort();

test('two-day and day-before reminders', () => {
  assert.deepEqual(kinds([client()], [appt({ starts_at: at(36 * H) })]), ['reminder_2d']);
  assert.deepEqual(kinds([client()], [appt({ starts_at: at(20 * H) })]), ['reminder_1d']);
  assert.deepEqual(kinds([client()], [appt({ starts_at: at(72 * H) })]), []);
});

test('no reminder that repeats a recent booking confirmation', () => {
  assert.deepEqual(kinds([client()], [appt({ starts_at: at(36 * H), created_at: at(-2 * H) })]), []);
  assert.deepEqual(kinds([client()], [appt({ starts_at: at(20 * H), created_at: at(-2 * H) })]), []);
});

test('nothing is sent twice', () => {
  assert.deepEqual(kinds([client()], [appt()], new Set(['reminder_2d:a1'])), []);
});

test('quiet hours: nothing at night', () => {
  assert.deepEqual(kinds([client()], [appt()], new Set(), new Date('2026-11-10T03:00:00Z')), []); // 11 PM Trinidad
});

test('no email, or unsubscribed: nothing', () => {
  assert.deepEqual(kinds([client({ email: null })], [appt()]), []);
  assert.deepEqual(kinds([client({ email: 'not-an-email' })], [appt()]), []);
  assert.deepEqual(kinds([client({ emails_off: true })], [appt()]), []);
});

test('aftercare right after Done, then the 1-week check-in', () => {
  assert.deepEqual(kinds([client()], [appt({ status: 'completed', completed_at: at(-1 * H) })]), ['aftercare']);
  assert.deepEqual(kinds([client()], [appt({ status: 'completed', completed_at: at(-8 * D) })]), ['checkin_1w']);
  assert.deepEqual(kinds([client()], [appt({ status: 'completed', completed_at: at(-5 * D) })]), []);
});

test('cancelled and no-show appointments get nothing', () => {
  assert.deepEqual(kinds([client()], [appt({ status: 'cancelled' }), appt({ id: 'a2', status: 'no_show' })]), []);
});

test('rebooking offers need consent', () => {
  const done = appt({ status: 'completed', completed_at: at(-31 * D) });
  assert.deepEqual(kinds([client()], [done]), []);
  assert.deepEqual(kinds([client({ marketing_opt_in: true })], [done]), ['rebook_1m']);
  assert.deepEqual(kinds([client({ marketing_opt_in: true })], [{ ...done, completed_at: at(-61 * D) }]), ['rebook_2m']);
});

test('no rebooking offer if they already booked again or came back since', () => {
  const c = client({ marketing_opt_in: true });
  const done = appt({ status: 'completed', completed_at: at(-31 * D) });
  assert.deepEqual(kinds([c], [done, appt({ id: 'a2', starts_at: at(10 * D) })]), []);
  assert.deepEqual(kinds([c], [done, appt({ id: 'a3', status: 'completed', completed_at: at(-12 * D) })]), []);
});

test('birthday on the day, consent needed, 29 Feb handled', () => {
  assert.deepEqual(kinds([client({ birthday: '1990-11-10', marketing_opt_in: true })], []), ['birthday']);
  assert.deepEqual(kinds([client({ birthday: '1990-11-10' })], []), []);
  assert.deepEqual(kinds([client({ birthday: '1990-11-11', marketing_opt_in: true })], []), []);
  assert.equal(isBirthdayToday('2000-02-29', new Date('2027-02-28T15:00:00Z')), true);
  assert.equal(isBirthdayToday('2000-02-29', new Date('2028-02-29T15:00:00Z')), true);
  assert.equal(isBirthdayToday('2000-02-29', new Date('2028-02-28T15:00:00Z')), false);
});

test('birthday key includes the year', () => {
  const [d] = dueMessages(NOW, [client({ birthday: '1990-11-10', marketing_opt_in: true })], [], new Set());
  assert.equal(d.key, 'birthday:c1:2026');
});

test('every email renders with an unsubscribe link and safe text', () => {
  for (const kind of ['reminder_2d', 'reminder_1d', 'aftercare', 'checkin_1w', 'rebook_1m', 'rebook_2m', 'birthday'] as const) {
    const e = renderEmail(kind, { firstName: '<Ana>', serviceName: 'Cavitation', startsAt: at(36 * H),
      bookingUrl: 'https://meltawaysspa.com/booking', unsubscribeUrl: 'https://x/unsub', salonPhone: '' });
    assert.ok(e.subject.length > 5, kind);
    assert.ok(e.html.includes('https://x/unsub') && e.text.includes('https://x/unsub'), kind);
    assert.ok(!e.html.includes('<Ana>'), `${kind} escapes names`);
  }
});

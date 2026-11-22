// Run: node --experimental-strip-types --test supabase/functions/website-booking/emails.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clientEmail, EMAIL_RE, sendSubmissionEmails, spaEmail, type MailSettings, type Submission } from './emails.ts';

const M: MailSettings = {
  from: 'Melt Aways <hello@meltawaysspa.com>', replyTo: 'meltawaystt@gmail.com',
  spaTo: ['meltawaystt@gmail.com'], salonPhone: '1 (868) 378-5630', testRecipient: '',
};
const booking: Submission = {
  kind: 'booking', name: 'Ana <b>Lee</b>', email: 'ana@example.com', phone: '868 555 0000',
  service: 'Cavitation', startsAt: '2026-11-24T14:00:00Z', notes: 'first visit',
};
const enquiry: Submission = {
  kind: 'enquiry', name: 'Ana Lee', email: 'ana@example.com', phone: '', source: 'consultation',
  message: 'VIP consultation request. Preferred contact: WhatsApp. Goals: Fat loss, Toning',
};

test('email check', () => {
  for (const ok of ['a@b.co', 'first.last+tag@mail.example.com']) assert.ok(EMAIL_RE.test(ok), ok);
  for (const bad of ['', 'ana', 'ana@', 'ana@gmail', 'ana@gmail.c', 'a b@c.com']) assert.ok(!EMAIL_RE.test(bad), bad);
});

test('booking: client gets the details in Trinidad time, spa gets an alert that replies to the client', () => {
  const c = clientEmail(booking, M);
  assert.deepEqual(c.to, ['ana@example.com']);
  assert.equal(c.replyTo, 'meltawaystt@gmail.com');
  assert.match(c.subject, /You're booked: Cavitation on Tuesday, November 24 at 10:00 AM/);
  assert.ok(c.html.includes('Ana') && !c.html.includes('<b>'), 'name is escaped');
  assert.ok(c.text.includes('#240 Eastern Main Road'));

  const s = spaEmail(booking, M);
  assert.deepEqual(s.to, ['meltawaystt@gmail.com']);
  assert.equal(s.replyTo, 'ana@example.com');
  assert.match(s.subject, /^New booking: Ana <b>Lee<\/b>, Cavitation/);
  assert.ok(s.text.includes('Notes: first visit') && s.text.includes('Phone: 868 555 0000'));
});

test('enquiry: confirmation and a readable alert', () => {
  assert.equal(clientEmail(enquiry, M).subject, 'We received your consultation request');
  const s = spaEmail(enquiry, M);
  assert.equal(s.subject, 'VIP consultation request: Ana Lee');
  assert.ok(s.text.includes('Phone: not given'));
  assert.ok(s.text.includes('Preferred contact: WhatsApp\nGoals: Fat loss, Toning'), s.text);
});

test('TEST_RECIPIENT redirects only the client copy', () => {
  const m = { ...M, testRecipient: 'tester@example.com' };
  assert.deepEqual(clientEmail(booking, m).to, ['tester@example.com']);
  assert.deepEqual(spaEmail(booking, m).to, ['meltawaystt@gmail.com']);
});

test('sending: both emails go to Resend, and failures never throw', async () => {
  const calls: { to: string[]; from: string }[] = [];
  const ok = (async (_u: string, init: RequestInit) => {
    calls.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify({ id: 'r' + calls.length }), { status: 200 });
  }) as typeof fetch;
  const res = await sendSubmissionEmails('key', booking, M, ok);
  assert.equal(calls.length, 2);
  assert.ok(res.every((r) => r.ok));
  assert.equal(calls[0].from, M.from);

  const bad = (async () => new Response(JSON.stringify({ message: 'The meltawaysspa.com domain is not verified' }), { status: 403 })) as typeof fetch;
  const failed = await sendSubmissionEmails('key', booking, M, bad);
  assert.ok(failed.every((r) => !r.ok && /not verified/.test(r.error!)));

  assert.deepEqual(await sendSubmissionEmails('', booking, M, ok), [], 'no key: nothing sent, logged instead');
});

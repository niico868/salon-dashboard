// Emails sent the moment someone books or sends a request on the website:
//   1. the client gets a confirmation ("You're booked" / "We got your request")
//   2. the spa gets an alert with every detail, and Reply goes straight to the client
//
// Sent through Resend from the same address as the automatic emails (client-messages).
// Kept free of Deno-only code so the tests can run in Node:
//   node --experimental-strip-types --test supabase/functions/website-booking/emails.test.ts

export type Submission =
  | { kind: 'booking'; name: string; email: string; phone: string; service: string; startsAt: string; notes: string }
  | { kind: 'enquiry'; name: string; email: string; phone: string; source: string; message: string };

export type MailSettings = {
  from: string;        // "Melt Aways <hello@meltawaysspa.com>", on the domain verified in Resend
  replyTo: string;     // where client replies land
  spaTo: string[];     // who gets the new booking / request alerts
  salonPhone: string;
  testRecipient: string; // while set, the client's copy goes here instead (the spa alert is unchanged)
};

export type Email = { to: string[]; replyTo: string; subject: string; html: string; text: string; tag: string };

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const TIME_ZONE = 'America/Port_of_Spain';
const ADDRESS = '#240 Eastern Main Road, El Dorado, Trinidad';
const HOURS = 'Tuesday to Saturday, 10 AM to 4 PM';

const SOURCE_TITLE: Record<string, string> = {
  consultation: 'VIP consultation request',
  'treatment-finder': 'Treatment finder results',
  visit: 'Visiting Trinidad request',
  contact: 'Message from the contact form',
  other: 'Website request',
};

export const when = (iso: string) => new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
}).format(new Date(iso));

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const firstName = (full: string) => full.trim().split(/\s+/)[0] || 'there';
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

// ---------- Layout, matching the automatic emails ----------
const ROSE = '#9D3438', INK = '#1D1A19', TAUPE = '#60514F', CREAM = '#F9F2ED', BG = '#FFFCF9', BORDER = '#EBDEDC';
type Block = { p: string } | { rows: [string, string][] };

function layout(blocks: Block[], signOff: boolean, footer: string) {
  const body = blocks.map((b) => 'p' in b
    ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${INK}">${esc(b.p)}</p>`
    : `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;background:${CREAM};border-radius:8px">${
      b.rows.map(([k, v]) => `<tr><td style="padding:8px 12px;font-size:14px;color:${TAUPE};vertical-align:top;white-space:nowrap">${esc(k)}</td>` +
        `<td style="padding:8px 12px;font-size:15px;color:${INK};white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}</table>`,
  ).join('');
  const html = `<!doctype html><html><body style="margin:0;background:${BG};font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BORDER};border-radius:12px">
<tr><td style="background:${CREAM};border-radius:12px 12px 0 0;padding:24px;text-align:center;font-family:Georgia,serif;font-size:26px;color:${ROSE}">Melt Aways</td></tr>
<tr><td style="padding:28px 24px 12px">${body}${signOff ? `<p style="margin:0;font-size:16px;color:${INK}">With love,<br>The Melt Aways team</p>` : ''}</td></tr>
<tr><td style="padding:16px 24px 24px;font-size:12px;line-height:1.6;color:${TAUPE};text-align:center">${esc(footer)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    ...blocks.map((b) => 'p' in b ? b.p : b.rows.map(([k, v]) => `${k}: ${v}`).join('\n')),
    ...(signOff ? ['With love,\nThe Melt Aways team'] : []),
    footer,
  ].join('\n\n');
  return { html, text };
}

// ---------- The client's confirmation ----------
export function clientEmail(s: Submission, m: MailSettings): Email {
  const hi = `Hi ${firstName(s.name)},`;
  const contact = m.salonPhone ? `reply to this email or call/WhatsApp us on ${m.salonPhone}` : 'reply to this email';
  let subject: string, blocks: Block[];
  if (s.kind === 'booking') {
    subject = `You're booked: ${s.service} on ${when(s.startsAt)}`;
    blocks = [
      { p: hi },
      { p: 'Thank you for booking with Melt Aways. Here are your appointment details:' },
      { rows: [['Treatment', s.service], ['When', when(s.startsAt)], ['Where', ADDRESS]] },
      { p: `Need to change or cancel? Please ${contact}, at least 24 hours before your visit if you can.` },
      { p: 'We will send you a reminder before your appointment.' },
    ];
  } else {
    const what = s.source === 'consultation' ? 'consultation request' : s.source === 'treatment-finder' ? 'treatment finder answers' : 'message';
    subject = s.source === 'consultation' ? 'We received your consultation request' : 'We received your message';
    blocks = [
      { p: hi },
      { p: `Thank you for reaching out to Melt Aways. We have received your ${what} and will be in touch within one working day to arrange the next step.` },
      { p: `Our hours are ${HOURS}. If you have a question in the meantime, just ${contact}.` },
    ];
  }
  const footer = `Melt Aways Spa · ${ADDRESS}${m.salonPhone ? ` · ${m.salonPhone}` : ''}\nYou are getting this email because you used the form on meltawaysspa.com.`;
  const to = m.testRecipient || s.email;
  return { to: [to], replyTo: m.replyTo, subject, ...layout(blocks, true, footer), tag: `${s.kind}_confirmation` };
}

// ---------- The spa's alert ----------
export function spaEmail(s: Submission, m: MailSettings): Email {
  const who: [string, string][] = [['Name', s.name], ['Email', s.email], ['Phone', s.phone || 'not given']];
  let subject: string, blocks: Block[];
  if (s.kind === 'booking') {
    subject = `New booking: ${oneLine(s.name)}, ${s.service}, ${when(s.startsAt)}`;
    blocks = [
      { p: 'A new booking came in from the website. It is already in the app.' },
      { rows: [['Treatment', s.service], ['When', when(s.startsAt)], ...who, ...(s.notes ? [['Notes', s.notes] as [string, string]] : [])] },
    ];
  } else {
    const title = SOURCE_TITLE[s.source] ?? SOURCE_TITLE.other;
    subject = `${title}: ${oneLine(s.name)}`;
    // The forms send their answers as "Label: value. Label: value", one per line reads better
    const details = s.message.split(/\.\s+(?=[A-Z][^:.]{1,60}:)/).map((l) => l.trim()).filter(Boolean).join('\n');
    blocks = [
      { p: `${title} from the website. It is under Website enquiries in the app.` },
      { rows: [...who, ...(details ? [['Details', details] as [string, string]] : [])] },
    ];
  }
  blocks.push({ p: `Press Reply to answer ${firstName(s.name)} directly.` });
  const footer = 'Sent automatically by the Melt Aways booking system.';
  return { to: m.spaTo, replyTo: s.email, subject, ...layout(blocks, false, footer), tag: `${s.kind}_spa_alert` };
}

// ---------- Sending ----------
export async function sendViaResend(apiKey: string, from: string, e: Email, fetcher: typeof fetch = fetch) {
  const res = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to: e.to, reply_to: e.replyTo, subject: e.subject, html: e.html, text: e.text,
      tags: [{ name: 'kind', value: e.tag }],
    }),
  });
  const body = await res.json().catch(() => ({})) as { id?: string; message?: string };
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body?.message ?? JSON.stringify(body)}`);
  return String(body?.id ?? '');
}

// Never throws: an email problem must not fail the booking. Every outcome is written to the
// function's log, so "why didn't it send?" is answered in Supabase -> Edge Functions -> website-booking -> Logs.
export async function sendSubmissionEmails(apiKey: string, s: Submission, m: MailSettings, fetcher: typeof fetch = fetch) {
  if (!apiKey) {
    console.error('EMAIL NOT SENT: the RESEND_API_KEY secret is not set. Run: npx supabase secrets set RESEND_API_KEY=<key from resend.com>');
    return [];
  }
  const emails = [clientEmail(s, m), ...(m.spaTo.length ? [spaEmail(s, m)] : [])];
  return Promise.all(emails.map(async (e) => {
    try {
      const id = await sendViaResend(apiKey, m.from, e, fetcher);
      console.log(`Email sent (${e.tag}) to ${e.to.join(', ')}, Resend id ${id}`);
      return { tag: e.tag, ok: true, id };
    } catch (err) {
      const error = String((err as Error).message ?? err);
      console.error(`EMAIL NOT SENT (${e.tag}) to ${e.to.join(', ')}: ${error}`);
      return { tag: e.tag, ok: false, error };
    }
  }));
}

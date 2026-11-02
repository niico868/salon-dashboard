// The emails themselves: the layout. The words are in wording.ts and can be changed in the app.
import { aftercareFor, GENERAL_AFTERCARE } from './aftercare.ts';
import { MARKETING, TIME_ZONE, type Kind } from './rules.ts';
import { DEFAULT_SETTINGS, fillIn, wordingFor, type EmailSettings } from './wording.ts';

export type EmailData = {
  firstName: string; serviceName?: string; startsAt?: string;
  bookingUrl: string; unsubscribeUrl: string; salonPhone: string;
};
export type Email = { subject: string; html: string; text: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const when = (iso: string) => new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
}).format(new Date(iso));

type Block = { p: string } | { list: string[]; heading?: string } | { button: string };

const BUTTONS: Partial<Record<Kind, string>> = {
  rebook_1m: 'Book my next session', rebook_2m: 'Book a visit', birthday: 'Treat myself',
};

function content(kind: Kind, d: EmailData, settings: EmailSettings): { subject: string; blocks: Block[] } {
  const svc = d.serviceName ?? 'your treatment';
  const values = {
    name: d.firstName, treatment: svc, date: d.startsAt ? when(d.startsAt) : '',
    discount: String(settings.birthday_discount),
  };
  const words = wordingFor(kind, settings.wording);
  const subject = fillIn(words.subject, values).replace(/\s+/g, ' ').trim();
  const blocks: Block[] = words.body.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => ({ p: fillIn(l, values) }));

  if (kind === 'aftercare') {
    const specific = aftercareFor(svc, settings.aftercare);
    if (specific) blocks.push({ heading: `${specific.title} aftercare`, list: specific.points });
    blocks.push({ heading: 'General care', list: GENERAL_AFTERCARE });
    blocks.push({ p: 'Questions at any time? Just reply to this email.' });
  }
  const button = BUTTONS[kind];
  if (button) blocks.push({ button });
  return { subject, blocks };
}

const ROSE = '#9D3438', INK = '#1D1A19', TAUPE = '#60514F', CREAM = '#F9F2ED', BG = '#FFFCF9', BORDER = '#EBDEDC';

export function renderEmail(kind: Kind, d: EmailData, settings: EmailSettings = DEFAULT_SETTINGS): Email {
  const { subject, blocks } = content(kind, d, settings);
  const offers = MARKETING.includes(kind);

  const html = blocks.map((b) => {
    if ('p' in b) return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${INK}">${esc(b.p)}</p>`;
    if ('button' in b) return `<p style="margin:8px 0 24px"><a href="${esc(d.bookingUrl)}" style="display:inline-block;background:${ROSE};color:#ffffff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:8px">${esc(b.button)}</a></p>`;
    return `${b.heading ? `<p style="margin:8px 0 8px;font-family:Georgia,serif;font-size:17px;color:${INK}">${esc(b.heading)}</p>` : ''}<ul style="margin:0 0 16px;padding-left:20px;color:${INK};font-size:16px;line-height:1.6">${b.list.map((i) => `<li style="margin-bottom:6px">${esc(i)}</li>`).join('')}</ul>`;
  }).join('');

  const signature = d.salonPhone ? `Melt Aways Spa · ${d.salonPhone}` : 'Melt Aways Spa';
  const footer = `${esc(signature)}<br>` +
    `<a href="${esc(d.unsubscribeUrl)}" style="color:${TAUPE}">${offers ? 'Stop offers and birthday emails' : 'Unsubscribe from emails'}</a>`;

  const page = `<!doctype html><html><body style="margin:0;background:${BG};font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BORDER};border-radius:12px">
<tr><td style="background:${CREAM};border-radius:12px 12px 0 0;padding:24px;text-align:center;font-family:Georgia,serif;font-size:26px;color:${ROSE}">Melt Aways</td></tr>
<tr><td style="padding:28px 24px 12px">${html}<p style="margin:0;font-size:16px;color:${INK}">With love,<br>The Melt Aways team</p></td></tr>
<tr><td style="padding:16px 24px 24px;font-size:12px;line-height:1.6;color:${TAUPE};text-align:center">${footer}</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    ...blocks.map((b) => 'p' in b ? b.p : 'button' in b ? `${b.button}: ${d.bookingUrl}`
      : `${b.heading ? b.heading + '\n' : ''}${b.list.map((i) => `- ${i}`).join('\n')}`),
    'With love,\nThe Melt Aways team',
    signature,
    `${offers ? 'Stop offers and birthday emails' : 'Unsubscribe'}: ${d.unsubscribeUrl}`,
  ].join('\n\n');

  return { subject, html: page, text };
}

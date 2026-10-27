// The emails themselves. Words are easy to change here; keep sentences short and warm.
import { aftercareFor, GENERAL_AFTERCARE } from './aftercare.ts';
import { MARKETING, TIME_ZONE, type Kind } from './rules.ts';

export const BIRTHDAY_DISCOUNT = 10; // percent, same as the app's birthday WhatsApp message

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

function content(kind: Kind, d: EmailData): { subject: string; blocks: Block[] } {
  const svc = d.serviceName ?? 'your treatment';
  switch (kind) {
    case 'reminder_2d':
      return { subject: `See you soon: ${svc} on ${when(d.startsAt!)}`, blocks: [
        { p: `Hi ${d.firstName}, this is a friendly reminder that your ${svc} is booked for ${when(d.startsAt!)}.` },
        { p: 'If you need to change the time, just reply to this email or call us, and we will find a better slot.' },
      ] };
    case 'reminder_1d':
      return { subject: `Tomorrow: your ${svc} at Melt Aways`, blocks: [
        { p: `Hi ${d.firstName}, we are looking forward to seeing you for your ${svc} on ${when(d.startsAt!)}.` },
        { p: 'Running late or need to reschedule? Reply to this email or call us.' },
      ] };
    case 'aftercare': {
      const specific = aftercareFor(svc);
      return { subject: `Your aftercare for ${svc}`, blocks: [
        { p: `Hi ${d.firstName}, thank you for visiting Melt Aways. Here is how to look after yourself so you get the best results.` },
        ...(specific ? [{ heading: `${specific.title} aftercare`, list: specific.points }] : []),
        { heading: 'General care', list: GENERAL_AFTERCARE },
        { p: 'Questions at any time? Just reply to this email.' },
      ] };
    }
    case 'checkin_1w':
      return { subject: 'How are you feeling after your visit?', blocks: [
        { p: `Hi ${d.firstName}, it has been a week since your ${svc}. We hope you are feeling great and starting to see results.` },
        { p: 'If you have any questions, or anything does not feel right, reply to this email and we will help.' },
        { p: 'Loved your experience? A short review means the world to a small business like ours.' },
      ] };
    case 'rebook_1m':
      return { subject: `Ready for your next ${svc}?`, blocks: [
        { p: `Hi ${d.firstName}, it has been a month since your ${svc}. Regular sessions help you keep and build on your results.` },
        { p: 'Book your next visit whenever suits you.' },
        { button: 'Book my next session' },
      ] };
    case 'rebook_2m':
      return { subject: 'We miss you at Melt Aways', blocks: [
        { p: `Hi ${d.firstName}, it has been a little while since your last visit. Whenever you are ready to continue your journey, we would love to see you again.` },
        { p: 'Not sure which treatment is right for you now? Book a consultation and we will plan it together.' },
        { button: 'Book a visit' },
      ] };
    case 'birthday':
      return { subject: `Happy birthday, ${d.firstName}!`, blocks: [
        { p: `Happy birthday ${d.firstName}! Wishing you a wonderful year ahead.` },
        { p: `As a treat from all of us, enjoy ${BIRTHDAY_DISCOUNT}% off your next visit this month.` },
        { button: 'Treat myself' },
      ] };
  }
}

const ROSE = '#9D3438', INK = '#1D1A19', TAUPE = '#60514F', CREAM = '#F9F2ED', BG = '#FFFCF9', BORDER = '#EBDEDC';

export function renderEmail(kind: Kind, d: EmailData): Email {
  const { subject, blocks } = content(kind, d);
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

// The original words of every automatic email, and the settings Krystal can change in the app
// (More -> Email marketing). Saved changes live in the email_settings table; anything she
// hasn't changed uses the words below.
//
// Shared by the app and the email function, so keep this file free of imports.

export type EmailKind = 'reminder_2d' | 'reminder_1d' | 'aftercare' | 'checkin_1w' | 'rebook_1m' | 'rebook_2m' | 'birthday';

export type Wording = { subject: string; body: string };

export type EmailSettings = {
  paused: boolean;
  off_kinds: string[];
  birthday_discount: number;
  wording: Partial<Record<EmailKind, Partial<Wording>>>;
  aftercare: Record<string, string>; // treatment title -> one point per line
};

export const DEFAULT_SETTINGS: EmailSettings = {
  paused: false, off_kinds: [], birthday_discount: 10, wording: {}, aftercare: {},
};

// In `body`, each line becomes its own paragraph.
export const DEFAULT_WORDING: Record<EmailKind, Wording> = {
  reminder_2d: {
    subject: 'See you soon: {treatment} on {date}',
    body: 'Hi {name}, this is a friendly reminder that your {treatment} is booked for {date}.\n' +
      'If you need to change the time, just reply to this email or call us, and we will find a better slot.',
  },
  reminder_1d: {
    subject: 'Tomorrow: your {treatment} at Melt Aways',
    body: 'Hi {name}, we are looking forward to seeing you for your {treatment} on {date}.\n' +
      'Running late or need to reschedule? Reply to this email or call us.',
  },
  aftercare: {
    subject: 'Your aftercare for {treatment}',
    body: 'Hi {name}, thank you for visiting Melt Aways. Here is how to look after yourself so you get the best results.',
  },
  checkin_1w: {
    subject: 'How are you feeling after your visit?',
    body: 'Hi {name}, it has been a week since your {treatment}. We hope you are feeling great and starting to see results.\n' +
      'If you have any questions, or anything does not feel right, reply to this email and we will help.\n' +
      'Loved your experience? A short review means the world to a small business like ours.',
  },
  rebook_1m: {
    subject: 'Ready for your next {treatment}?',
    body: 'Hi {name}, it has been a month since your {treatment}. Regular sessions help you keep and build on your results.\n' +
      'Book your next visit whenever suits you.',
  },
  rebook_2m: {
    subject: "Hope you're doing well and sticking to your dietary regimen",
    body: "Hi {name}, we hope you're doing well and sticking to your dietary regimen. It has been a little while since your last visit. Whenever you are ready to continue your journey, we would love to see you again.\n" +
      'Not sure which treatment is right for you now? Book a consultation and we will plan it together.',
  },
  birthday: {
    subject: 'Happy birthday, {name}!',
    body: 'Happy birthday {name}! Wishing you a wonderful year ahead.\n' +
      'As a treat from all of us, enjoy {discount}% off your next visit this month.',
  },
};

// The fill-in words each email can use.
export const PLACEHOLDERS: Record<EmailKind, string[]> = {
  reminder_2d: ['name', 'treatment', 'date'],
  reminder_1d: ['name', 'treatment', 'date'],
  aftercare: ['name', 'treatment'],
  checkin_1w: ['name', 'treatment'],
  rebook_1m: ['name', 'treatment'],
  rebook_2m: ['name', 'treatment'],
  birthday: ['name', 'discount'],
};

export const fillIn = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (whole, key: string) => (typeof values[key] === 'string' ? values[key] : whole));

// Fill-in words this email doesn't know (usually a typo), which would otherwise reach clients as-is.
export const unknownPlaceholders = (text: string, kind: EmailKind) =>
  [...text.matchAll(/\{(\w*)\}/g)].map((m) => m[1]).filter((k) => !PLACEHOLDERS[kind].includes(k));

// The words to use: what Krystal saved, or the original when she hasn't saved any.
export function wordingFor(kind: EmailKind, saved: EmailSettings['wording']): Wording {
  const mine = saved?.[kind];
  return {
    subject: mine?.subject?.trim() || DEFAULT_WORDING[kind].subject,
    body: mine?.body?.trim() || DEFAULT_WORDING[kind].body,
  };
}

// Turns the client form's day, month and optional year into the stored "yyyy-MM-dd", and back.
// A birthday with no year is stored with the year 1900, which the rest of the app already understands.
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NO_YEAR = 1900;

export function parseBirthday(stored: string | null | undefined) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stored ?? '');
  if (!m) return { day: '', month: null as number | null, year: '' };
  return { day: String(Number(m[3])), month: Number(m[2]), year: Number(m[1]) === NO_YEAR ? '' : m[1] };
}

// `value` is what to save (null = no birthday). `error` is set when it can't be saved.
export function buildBirthday(day: string, month: number | null, year: string, now: Date): { value: string | null; error?: string } {
  const d = day.trim(), y = year.trim();
  if (!d && !month && !y) return { value: null };
  if (!/^\d{1,2}$/.test(d) || !month) return { value: null, error: 'Enter the day and pick the month.' };
  if (y && (!/^\d{4}$/.test(y) || Number(y) <= NO_YEAR || Number(y) > now.getFullYear())) {
    return { value: null, error: 'Enter the full year, for example 1985, or leave it empty.' };
  }
  if (!y && month === 2 && Number(d) === 29) return { value: null, error: 'For a 29 February birthday, please add the year.' };
  const full = y ? Number(y) : NO_YEAR;
  const check = new Date(full, month - 1, Number(d));
  if (check.getMonth() !== month - 1 || check.getDate() !== Number(d)) return { value: null, error: `${MONTHS[month - 1]} doesn't have a day ${d}.` };
  return { value: `${full}-${String(month).padStart(2, '0')}-${d.padStart(2, '0')}` };
}

// A phone number is believable with 7 to 15 digits. Empty is fine.
export function phoneLooksValid(phone: string) {
  const digits = phone.replace(/\D/g, '').length;
  return digits === 0 || (digits >= 7 && digits <= 15);
}

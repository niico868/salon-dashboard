import { addDays, isLeapYear, startOfDay } from 'date-fns';

const BIRTHDAY_DISCOUNT = 10;   // percent off, used in the WhatsApp message

export type Birthday<T> = { client: T; date: Date; turning: number | null };

// Next time a "yyyy-MM-dd" birthday falls on or after `from`. 29 Feb is marked on 28 Feb in other years.
export function nextBirthday(birthday: string, from: Date): Date {
  const [, m, d] = birthday.split('-').map(Number);
  const on = (year: number) => new Date(year, m - 1, m === 2 && d === 29 && !isLeapYear(new Date(year, 0, 1)) ? 28 : d);
  const today = startOfDay(from);
  const thisYear = on(today.getFullYear());
  return thisYear >= today ? thisYear : on(today.getFullYear() + 1);
}

// Clients whose birthday falls in the `days` days starting today, soonest first
export function birthdaysWithin<T extends { birthday: string | null }>(clients: T[], from: Date, days = 7): Birthday<T>[] {
  const end = addDays(startOfDay(from), days);
  return clients
    .filter((c) => c.birthday && /^\d{4}-\d{2}-\d{2}$/.test(c.birthday))
    .map((c) => {
      const date = nextBirthday(c.birthday!, from);
      const born = Number(c.birthday!.slice(0, 4));
      // Clients who don't share their year are often saved as 1900 or similar
      return { client: c, date, turning: born > 1900 ? date.getFullYear() - born : null };
    })
    .filter((b) => b.date < end)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export const birthdayMessage = (fullName: string) =>
  `Happy birthday ${fullName.split(' ')[0]}! 🎂 Wishing you a wonderful year. ` +
  `As a treat, enjoy ${BIRTHDAY_DISCOUNT}% off your next visit this month.`;

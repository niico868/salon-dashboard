// Melt Aways opening hours: used to pick a sensible default time and warn about closed times.
import { hours } from './theme';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

export function isOutsideHours(start: Date, end: Date) {
  return !hours.days.includes(start.getDay())
    || minutesOf(start) < hours.open * 60
    || end.toDateString() !== start.toDateString()
    || minutesOf(end) > hours.close * 60;
}

// Plain-words reason, for warnings. Empty when the time is fine.
export function outsideHoursMessage(start: Date, end: Date) {
  if (!isOutsideHours(start, end)) return '';
  return hours.days.includes(start.getDay())
    ? 'This is outside opening hours (10 AM to 4 PM).'
    : `The spa is closed on ${DAY_NAMES[start.getDay()]}s. Open Tuesday to Saturday, 10 AM to 4 PM.`;
}

// The next quarter-hour the spa is open, starting from `now`.
export function nextOpenSlot(now: Date) {
  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + (15 - (d.getMinutes() % 15)) % 15);
  for (let i = 0; i < 14; i++) {
    if (hours.days.includes(d.getDay())) {
      if (d.getHours() < hours.open) { d.setHours(hours.open, 0, 0, 0); return d; }
      if (d.getHours() < hours.close) return d;
    }
    d.setDate(d.getDate() + 1);
    d.setHours(hours.open, 0, 0, 0);
  }
  return d;
}

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

// The next `count` days the spa is open, starting from `from` (today included).
export function openDaysFrom(from: Date, count: number) {
  const days: Date[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (days.length < count) {
    if (hours.days.includes(d.getDay())) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// Start times on `day` where a treatment of this length fits inside opening hours.
export function slotsForDay(day: Date, durationMin: number, stepMin = 30) {
  const slots: Date[] = [];
  for (let m = hours.open * 60; m + Math.max(durationMin, stepMin) <= hours.close * 60; m += stepMin) {
    slots.push(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, m));
  }
  return slots;
}

export type Busy = { start: Date; end: Date };

// Does a treatment starting at `slot` run into an existing booking?
export const slotIsTaken = (slot: Date, durationMin: number, busy: Busy[]) => {
  const end = slot.getTime() + Math.max(durationMin, 1) * 60_000;
  return busy.some((b) => b.start.getTime() < end && b.end.getTime() > slot.getTime());
};

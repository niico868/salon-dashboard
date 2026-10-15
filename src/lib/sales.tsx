import { addDays, addMonths, addWeeks, eachDayOfInterval, format, startOfDay, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { supabase } from './supabase';
import type { AppointmentBalance } from './types';

export type Period = 'day' | 'week' | 'month';

export function rangeFor(period: Period, anchor: Date) {
  const from = period === 'day' ? startOfDay(anchor)
    : period === 'week' ? startOfWeek(anchor, { weekStartsOn: 1 }) : startOfMonth(anchor);
  const to = period === 'day' ? addDays(from, 1) : period === 'week' ? addWeeks(from, 1) : addMonths(from, 1);
  return { from, to };
}

export function shift(period: Period, anchor: Date, step: number) {
  return period === 'day' ? addDays(anchor, step) : period === 'week' ? addWeeks(anchor, step) : addMonths(anchor, step);
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export async function salesBetween(from: Date, to: Date) {
  const [pays, appts] = await Promise.all([
    supabase.from('payments').select('amount, method, paid_at, appointment_id')
      .eq('status', 'paid').gte('paid_at', from.toISOString()).lt('paid_at', to.toISOString()),
    supabase.from('appointment_balances').select('*')
      .in('status', ['booked', 'completed'])
      .gte('starts_at', from.toISOString()).lt('starts_at', to.toISOString()),
  ]);
  // Fail loudly: silently returning zeros would look like real sales figures
  if (pays.error) throw pays.error;
  if (appts.error) throw appts.error;
  const payments =(pays.data ?? []) as { amount: number; method: string; paid_at: string; appointment_id: string | null }[];
  const bookings = (appts.data ?? []) as AppointmentBalance[];
  const owed = (a: AppointmentBalance) => Math.max(0, Number(a.balance));

  // One entry per day for charts
  const days = eachDayOfInterval({ start: from, end: subDays(to, 1) }).map((d) => {
    const k = format(d, 'yyyy-MM-dd');
    return {
      date: d,
      actual: sum(payments.filter((p) => format(new Date(p.paid_at), 'yyyy-MM-dd') === k).map((p) => Number(p.amount))),
      potential: sum(bookings.filter((a) => format(new Date(a.starts_at), 'yyyy-MM-dd') === k).map(owed)),
    };
  });

  const byMethod: Record<string, number> = {};
  for (const p of payments) byMethod[p.method] = (byMethod[p.method] ?? 0) + Number(p.amount);

  const byService: Record<string, number> = {};
  for (const a of bookings) byService[a.service_name] = (byService[a.service_name] ?? 0) + Number(a.price);

  const actual = sum(payments.map((p) => Number(p.amount)));
  const potential = sum(bookings.map(owed));
  return { actual, potential, expected: actual + potential, bookings: bookings.length, days, byMethod, byService };
}

export type Sales = Awaited<ReturnType<typeof salesBetween>>;
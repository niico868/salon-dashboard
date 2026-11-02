import { format } from 'date-fns';
import { Alert } from 'react-native';
import { isOutsideHours, outsideHoursMessage } from './hours';
import { haptic } from './motion';
import { supabase } from './supabase';

const ask = (title: string, message: string, confirmLabel: string) => new Promise<boolean>((resolve) => {
  haptic.warning();
  Alert.alert(title, message, [
    { text: 'Go back', style: 'cancel', onPress: () => resolve(false) },
    { text: confirmLabel, onPress: () => resolve(true) },
  ]);
});

// Warns about closed times and overlapping bookings. Returns true if the booking should go ahead.
// `excludeId` is the booking being changed, so it doesn't count as overlapping itself.
export async function confirmBookingTime(start: Date, end: Date, confirmLabel: string, excludeId?: string) {
  if (isOutsideHours(start, end)
    && !await ask('Outside opening hours', `${outsideHoursMessage(start, end)} Continue anyway?`, confirmLabel)) return false;

  let query = supabase.from('appointments').select('id, service_name, starts_at')
    .eq('status', 'booked').lt('starts_at', end.toISOString()).gt('ends_at', start.toISOString());
  if (excludeId) query = query.neq('id', excludeId);
  const { data: clash, error } = await query;
  if (error) { Alert.alert("Couldn't check for overlaps", error.message); return false; }
  if (clash?.length) {
    return ask('This time overlaps another booking',
      `Already booked: ${clash[0].service_name} at ${format(new Date(clash[0].starts_at), 'h:mm a')}. Continue anyway?`, confirmLabel);
  }
  return true;
}

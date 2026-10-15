import { addDays, format, setHours, startOfDay, subMinutes } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const REMIND_BEFORE_MIN = 5;   // change to 30, 120, etc.
const BRIEF_HOUR = 8;           // morning brief time (24-hour clock)

// Show notifications even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

const at = (date: Date): Notifications.NotificationTriggerInput =>
  ({ type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'reminders' });

export async function setupNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders', importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  return (await Notifications.requestPermissionsAsync()).status === 'granted';
}

export async function scheduleAppointmentReminder(id: string, client: string, service: string, start: Date) {
  const when = subMinutes(start, REMIND_BEFORE_MIN);
  if (when <= new Date() || when > addDays(new Date(), 7)) return;  // syncReminders picks up later ones
  await Notifications.scheduleNotificationAsync({
    identifier: `appt-${id}`,
    content: { title: `${client} at ${format(start, 'h:mm a')}`, body: service, data: { url: `/appointment/${id}` } },
    trigger: at(when),
  });
}

export async function cancelAppointmentReminder(id: string) {
  await Notifications.cancelScheduledNotificationAsync(`appt-${id}`).catch(() => {});
}

// Rebuild everything for the next 7 days. Called when the app opens or comes back to the front.
export async function syncReminders() {
  const now = new Date();
  const end = addDays(startOfDay(now), 7);

  const [{ data: appts, error: apptsError }, { data: clients, error: clientsError }] = await Promise.all([
    supabase.from('appointment_balances').select('id, client_name, service_name, starts_at')
      .eq('status', 'booked').gte('starts_at', now.toISOString()).lt('starts_at', end.toISOString()),
    supabase.from('clients').select('follow_up_date').not('follow_up_date', 'is', null)
      .lte('follow_up_date', format(end, 'yyyy-MM-dd')),
  ]);
  // Offline? Keep the reminders already scheduled rather than wiping them
  if (apptsError || clientsError) return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const a of appts ?? []) {
    await scheduleAppointmentReminder(a.id, a.client_name, a.service_name, new Date(a.starts_at));
  }

  for (let i = 0; i < 7; i++) {
    const day = addDays(startOfDay(now), i);
    const when = setHours(day, BRIEF_HOUR);
    if (when <= now) continue;
    const key = format(day, 'yyyy-MM-dd');
    const bookings = (appts ?? []).filter((a) => format(new Date(a.starts_at), 'yyyy-MM-dd') === key).length;
    const due = (clients ?? []).filter((c) => c.follow_up_date! <= key).length;  // includes overdue
    if (!bookings && !due) continue;
    const parts = [
      bookings && `${bookings} booking${bookings > 1 ? 's' : ''} today`,
      due && `${due} follow-up${due > 1 ? 's' : ''} due`,
    ].filter(Boolean);
    await Notifications.scheduleNotificationAsync({
      identifier: `brief-${key}`,
      content: { title: 'Good morning', body: parts.join(' · '), data: { url: '/' } },
      trigger: at(when),
    });
  }
}
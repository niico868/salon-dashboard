import type { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, View } from 'react-native';
import { setupNotifications, setupWebNotifications, syncReminders, watchWebsiteBookings } from '../lib/notifications';
import { supabase } from '../lib/supabase';
import '../lib/web-alert';


export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Pop up an alert as soon as a website booking lands (phone and browser)
  useEffect(() => {
    if (!session) return;
    setupWebNotifications().catch(() => {});
    return watchWebsiteBookings();
  }, [session]);

  useEffect(() => {
    if (!session || Platform.OS === 'web') return;
    setupNotifications()
      .then((ok) => { if (ok) return syncReminders(); })
      .catch((e) => console.warn('Reminders not set up:', e?.message));

    // Re-sync whenever the app comes back to the front
    const appSub = AppState.addEventListener('change', (st) => {
      if (st === 'active') syncReminders().catch(() => {});
    });

    // Tapping a notification opens its screen
    const open = (r: Notifications.NotificationResponse | null) => {
      const url = r?.notification.request.content.data?.url as string | undefined;
      if (url) router.push(url as any);
    };
    Notifications.getLastNotificationResponseAsync().then(open);   // app was closed
    const tapSub = Notifications.addNotificationResponseReceivedListener(open);  // app was open

    return () => { appSub.remove(); tapSub.remove(); };
  }, [session]);

  if (!ready) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;

  return (
    <Stack>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="services" options={{ title: 'Service menu' }} />
        <Stack.Screen name="client/[id]" options={{ title: 'Client' }} />
        <Stack.Screen name="client/new" options={{ title: 'Client details', presentation: 'modal' }} />
        <Stack.Screen name="appointment/[id]" options={{ title: 'Appointment' }} />
        <Stack.Screen name="appointment/new" options={{ title: 'Book appointment', presentation: 'modal' }} />
        <Stack.Screen name="payment/new" options={{ title: 'Payment', presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

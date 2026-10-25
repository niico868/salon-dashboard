import { clearPasscode } from '@/lib/passcode';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { Text } from '../../components/AppText';
import PasscodePrompt from '../../components/PasscodePrompt';
import Screen from '../../components/Screen';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';
import { disablePush, enablePush, getPushState, type PushState } from '../../lib/webPush';

const ALERT_TEXT: Record<PushState, string> = {
  on: 'On for this phone. You\'ll get an alert for each new website booking or enquiry.',
  off: 'Get an alert on this phone when someone books or sends a message on the website.',
  blocked: 'Notifications are blocked for this app. Allow them in your browser or phone settings, then come back.',
  'install-first': 'On iPhone, first add this app to your Home Screen: tap Share, then "Add to Home Screen". Open it from there and turn alerts on.',
  unsupported: 'Alerts for website bookings work in the web app installed on your phone, not here.',
  'not-configured': 'Alerts aren\'t set up yet: the VAPID key is missing from the app\'s settings.',
};

export default function More() {
  const [changing, setChanging] = useState(false);
  const [push, setPush] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    getPushState().then(setPush).catch(() => setPush('unsupported'));
  }, []));

  async function togglePush() {
    setBusy(true);
    try {
      if (push === 'on') { await disablePush(); setPush('off'); }
      else setPush(await enablePush());
    } catch (e: any) {
      Alert.alert('Couldn\'t change alerts', e?.message ?? 'Please try again.');
    } finally { setBusy(false); }
  }

  const Row = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={{ backgroundColor: 'white', padding: 16, borderRadius: 12 }}>
      <Text style={{ fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
  const canToggle = push === 'on' || push === 'off';

  return (
    <Screen>
      <Row label="Service menu" onPress={() => router.push('/services')} />

      <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 16 }}>New booking alerts</Text>
          {push === null || busy ? <ActivityIndicator color={C.primary} /> : canToggle && (
            <Pressable onPress={togglePush} style={{
              backgroundColor: push === 'on' ? C.blush : C.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
            }}>
              <Text style={{ color: push === 'on' ? C.primary : 'white', fontWeight: '700' }}>{push === 'on' ? 'Turn off' : 'Turn on'}</Text>
            </Pressable>
          )}
        </View>
        {push && <Text style={{ color: C.muted }}>{ALERT_TEXT[push]}</Text>}
      </View>

      <Row label="Change passcode" onPress={() => setChanging(true)} />
      <Row label="Log out" onPress={() => Alert.alert('Log out?', '', [
        { text: 'Cancel' },
        { text: 'Log out', style: 'destructive', onPress: async () => {
          await disablePush().catch(() => {});   // stop this phone getting the owner's alerts
          await clearPasscode();
          await supabase.auth.signOut();
        } },
      ])} />
      <PasscodePrompt visible={changing} onCancel={() => setChanging(false)}
        onSuccess={async () => {
          setChanging(false);
          await clearPasscode();
          Alert.alert('Passcode cleared', 'You will create a new one next time it is needed.');
        }} />
    </Screen>
  );
}

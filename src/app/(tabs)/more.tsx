import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Logo from '../../components/Logo';
import PasscodePrompt from '../../components/PasscodePrompt';
import PressableScale from '../../components/PressableScale';
import Screen from '../../components/Screen';
import StatusChip from '../../components/StatusChip';
import { useToast } from '../../components/Toast';
import { Small } from '../../components/Typography';
import { haptic } from '../../lib/motion';
import { clearPasscode } from '../../lib/passcode';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, shadow, space } from '../../lib/theme';
import { disablePush, enablePush, getPushState, type PushState } from '../../lib/webPush';

const ALERT_TEXT: Record<PushState, string> = {
  on: 'On for this phone. You\'ll get an alert for each new website booking or message.',
  off: 'Get an alert on this phone when someone books or sends a message on the website.',
  blocked: 'Notifications are blocked for this app. Allow them in your browser or phone settings, then come back.',
  'install-first': 'On iPhone, first add this app to your Home Screen: tap Share, then "Add to Home Screen". Open it from there and turn alerts on.',
  unsupported: 'Alerts for website bookings work in the web app installed on your phone, not here.',
  'not-configured': 'Alerts aren\'t set up yet: the VAPID key is missing from the app\'s settings.',
};

type Icon = keyof typeof Ionicons.glyphMap;

function Row({ icon, label, hint, onPress, danger }: { icon: Icon; label: string; hint?: string; onPress: () => void; danger?: boolean }) {
  return (
    <PressableScale onPress={() => { haptic.tap(); onPress(); }} style={s.row} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[s.iconCircle, danger && { backgroundColor: colors.dangerBg }]}>
        <Ionicons name={icon} size={22} color={danger ? colors.danger : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.label, danger && { color: colors.danger }]}>{label}</Text>
        {hint ? <Small>{hint}</Small> : null}
      </View>
      {!danger && <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />}
    </PressableScale>
  );
}

export default function More() {
  const toast = useToast();
  const [changing, setChanging] = useState(false);
  const [push, setPush] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    getPushState().then(setPush).catch(() => setPush('unsupported'));
  }, []));

  async function togglePush() {
    setBusy(true);
    try {
      if (push === 'on') { await disablePush(); setPush('off'); toast.show('Alerts turned off'); }
      else {
        const next = await enablePush();
        setPush(next);
        if (next === 'on') toast.show('Alerts turned on');
      }
    } catch (e: any) {
      Alert.alert('Couldn\'t change alerts', e?.message ?? 'Please try again.');
    } finally { setBusy(false); }
  }

  const canToggle = push === 'on' || push === 'off';

  return (
    <Screen>
      <Row icon="pricetags-outline" label="Service menu and prices" hint="See or change what you offer"
        onPress={() => router.push('/services')} />

      <Card>
        <View style={s.alertHead}>
          <View style={s.iconCircle}><Ionicons name="notifications-outline" size={22} color={colors.primary} /></View>
          <Text style={[s.label, { flex: 1 }]}>New booking alerts</Text>
          {push === null ? <ActivityIndicator color={colors.primary} />
            : <StatusChip status={push === 'on' ? 'paid' : 'cancelled'} label={push === 'on' ? 'On' : 'Off'} />}
        </View>
        {push && <Small>{ALERT_TEXT[push]}</Small>}
        {canToggle && (
          <Button title={push === 'on' ? 'Turn alerts off' : 'Turn alerts on'} loading={busy}
            variant={push === 'on' ? 'outline' : 'primary'} icon={push === 'on' ? 'notifications-off-outline' : 'notifications'}
            onPress={togglePush} />
        )}
      </Card>

      <Row icon="key-outline" label="Change passcode" hint="The code that protects your prices" onPress={() => setChanging(true)} />
      <Row icon="log-out-outline" label="Log out" danger onPress={() => Alert.alert('Log out?', 'You will need your email and password to get back in.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', style: 'destructive', onPress: async () => {
          await disablePush().catch(() => {});   // stop this phone getting the owner's alerts
          await clearPasscode();
          await supabase.auth.signOut();
        } },
      ])} />

      <View style={s.footer}>
        <Logo width={140} />
        <Small>Melt Aways Spa Dashboard</Small>
      </View>

      <PasscodePrompt visible={changing} onCancel={() => setChanging(false)}
        onSuccess={async () => {
          setChanging(false);
          await clearPasscode();
          Alert.alert('Passcode cleared', 'You will create a new one next time it is needed.');
        }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: space.lg, minHeight: 72, ...shadow.card },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.bodyBold, fontSize: 17 },
  alertHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  footer: { alignItems: 'center', gap: space.xs, marginTop: space.xl, opacity: 0.85 },
});

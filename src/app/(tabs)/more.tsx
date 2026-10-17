import { clearPasscode } from '@/lib/passcode';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Logo from '../../components/Logo';
import PasscodePrompt from '../../components/PasscodePrompt';
import PressableScale from '../../components/PressableScale';
import Screen from '../../components/Screen';
import { useToast } from '../../components/Toast';
import { BodyStrong, Small } from '../../components/Typography';
import { haptic } from '../../lib/motion';
import { supabase } from '../../lib/supabase';
import { brand, colors, radius, shadow, space, touch } from '../../lib/theme';

type RowProps = { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; danger?: boolean };

const Row = ({ label, icon, onPress, danger }: RowProps) => (
  <PressableScale onPress={onPress} style={s.row} accessibilityRole="button" accessibilityLabel={label}>
    <View style={[s.icon, danger && { backgroundColor: colors.dangerBg }]}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
    </View>
    <BodyStrong style={[{ flex: 1 }, danger && { color: colors.danger }]}>{label}</BodyStrong>
    {!danger && <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />}
  </PressableScale>
);

export default function More() {
  const [changing, setChanging] = useState(false);
  const toast = useToast();
  return (
    <Screen>
      <Row label="Service menu" icon="list-outline" onPress={() => router.push('/services')} />
      <Row label="Change passcode" icon="key-outline" onPress={() => setChanging(true)} />
      <Row label="Log out" icon="log-out-outline" danger onPress={() => {
        haptic.warning();
        Alert.alert('Log out?', '', [
          { text: 'Cancel' },
          { text: 'Log out', style: 'destructive', onPress: async () => {
            await clearPasscode();
            await supabase.auth.signOut();
          } },
        ]);
      }} />
      <View style={s.footer}>
        <Logo width={140} />
        <Small style={{ fontStyle: 'italic', textAlign: 'center' }}>{brand.tagline}</Small>
      </View>
      <PasscodePrompt visible={changing} onCancel={() => setChanging(false)}
        onSuccess={async () => {
          setChanging(false);
          await clearPasscode();
          toast.show('Passcode cleared');
        }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, padding: space.md,
    minHeight: touch.min + 16, borderRadius: radius.lg, ...shadow.card },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center' },
  footer: { marginTop: 'auto', alignItems: 'center', gap: space.sm, paddingTop: space.xxl, opacity: 0.9 },
});

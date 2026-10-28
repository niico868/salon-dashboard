import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { colors, fonts, radius, space } from '../lib/theme';
import { haptic } from '../lib/motion';
import { Text } from './AppText';
import PressableScale from './PressableScale';

// A small labelled button with an icon, for actions inside a card: "WhatsApp", "Call", "Mark done".
type Tone = 'primary' | 'whatsapp' | 'plain' | 'success';
const TONES: Record<Tone, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.textOnPrimary },
  whatsapp: { bg: '#E3F4E7', fg: '#1E7A3C' },
  success: { bg: colors.successBg, fg: colors.success },
  plain: { bg: colors.surface, fg: colors.primary, border: colors.border },
};

export default function ActionPill({ label, icon, onPress, tone = 'plain' }:
  { label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <PressableScale onPress={() => { haptic.tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={label}
      style={[s.pill, { backgroundColor: t.bg }, t.border ? { borderWidth: 1, borderColor: t.border } : null]}>
      {icon ? <Ionicons name={icon} size={18} color={t.fg} /> : null}
      <Text style={[s.text, { color: t.fg }]}>{label}</Text>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, minHeight: 44,
    paddingHorizontal: space.lg, alignSelf: 'flex-start' },
  text: { fontFamily: fonts.bodyBold, fontSize: 15 },
});

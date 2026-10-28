import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors, fonts, radius, shadow, space } from '../lib/theme';
import AnimatedNumber from './AnimatedNumber';
import { Text } from './AppText';
import FadeInView from './FadeInView';

// A number tile for the dashboard. `amount` + `format` counts up; `value` shows plain text.
type Props = {
  label: string;
  amount?: number;
  format?: (n: number) => string;
  value?: string;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  hint?: string;
  index?: number;
};

export default function StatCard({ label, amount, format, value, color = colors.text, icon, hint, index = 0 }: Props) {
  return (
    <FadeInView index={index} style={s.wrap}>
      <View style={s.card}>
        <View style={s.top}>
          {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
          <Text style={s.label} numberOfLines={2}>{label}</Text>
        </View>
        {amount != null
          ? <AnimatedNumber value={amount} format={format} style={[s.value, { color }]} />
          : <Text style={[s.value, { color }]}>{value ?? ''}</Text>}
        {hint ? <Text style={s.hint}>{hint}</Text> : null}
      </View>
    </FadeInView>
  );
}

const s = StyleSheet.create({
  wrap: { flexGrow: 1, flexBasis: '45%', minWidth: 140 },
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.xs, ...shadow.card },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted, flexShrink: 1 },
  value: { fontFamily: fonts.title, fontSize: 23, lineHeight: 30 },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
});

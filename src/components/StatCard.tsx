import { StyleSheet, Text } from 'react-native';
import { colors, radius, shadow, space, type } from '../lib/theme';
import { Label } from './Typography';
import AnimatedNumber from './AnimatedNumber';
import FadeInView from './FadeInView';

// A number tile for the dashboard. Pass `amount` (a number) to get the count-up animation,
// or `value` (ready-made text) to show it as it is. Existing <StatCard label value color /> calls still work.
type Props = { label: string; value?: string; amount?: number; format?: (n: number) => string; color?: string; index?: number };

export default function StatCard({ label, value, amount, format, color = colors.text, index = 0 }: Props) {
  return (
    <FadeInView index={index} style={s.card}>
      <Label>{label}</Label>
      {amount !== undefined
        ? <AnimatedNumber value={amount} format={format} style={{ color }} />
        : <Text style={[type.number, { color }]}>{value}</Text>}
    </FadeInView>
  );
}

const s = StyleSheet.create({
  card: { flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.xs, ...shadow.card },
});

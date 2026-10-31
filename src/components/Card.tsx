import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, shadow, space } from '../lib/theme';

// White rounded card with a soft shadow. `tone="soft"` gives a light pink card for highlights.
export default function Card({ children, style, tone = 'plain' }:
  { children: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: 'plain' | 'soft' }) {
  return <View style={[s.card, tone === 'soft' && s.soft, style]}>{children}</View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm, ...shadow.card },
  soft: { backgroundColor: colors.blush, shadowOpacity: 0, elevation: 0 },
});

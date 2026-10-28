import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, fonts, radius, shadow, space, touch } from '../lib/theme';
import { Text } from './AppText';
import PressableScale from './PressableScale';

// One tappable line in a list: something on the left (time, avatar, icon), a title and subtitle,
// something on the right (a status chip or amount) and an arrow showing it opens.
type Props = {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  below?: React.ReactNode;
  onPress?: () => void;
  accent?: string;          // coloured stripe on the left edge
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export default function ListRow({ title, subtitle, left, right, below, onPress, accent, style, accessibilityLabel }: Props) {
  const body = (
    <View style={[s.row, accent ? { borderLeftWidth: 5, borderLeftColor: accent } : null, style]}>
      <View style={s.line}>
        {left}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={s.sub} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
        {right}
        {onPress ? <Ionicons name="chevron-forward" size={20} color={colors.textMuted} /> : null}
      </View>
      {below}
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title}>
      {body}
    </PressableScale>
  );
}

const s = StyleSheet.create({
  row: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: space.md,
    minHeight: touch.min + 16, justifyContent: 'center', gap: space.md, ...shadow.card },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted },
});

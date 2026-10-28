import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, space } from '../lib/theme';
import { Heading } from './Typography';
import { Text } from './AppText';

// A section title, with an optional count bubble and a small link on the right ("See all").
export default function SectionHeader({ title, count, actionLabel, onAction }:
  { title: string; count?: number; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={s.row}>
      <Heading accessibilityRole="header">{title}</Heading>
      {count ? <View style={s.count}><Text style={s.countText}>{count}</Text></View> : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={12} style={{ marginLeft: 'auto' }} accessibilityRole="button">
          <Text style={s.link}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  count: { minWidth: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 7 },
  countText: { color: colors.textOnPrimary, fontFamily: fonts.bodyBold, fontSize: 14 },
  link: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 16 },
});

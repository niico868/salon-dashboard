import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, radius, space, touch } from '../lib/theme';
import { Text } from './AppText';
import { haptic } from '../lib/motion';

// A row of 2–4 big buttons where exactly one is chosen, e.g. Day / Week / Month.
export default function Segmented<T extends string>({ options, value, onChange }:
  { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={s.wrap} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => { haptic.tap(); onChange(o.value); }}
            style={[s.btn, on && s.on]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Text style={[s.text, on && s.textOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: colors.blush, borderRadius: radius.md, padding: 4, gap: 4 },
  btn: { flex: 1, minHeight: touch.min - 4, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, paddingHorizontal: space.sm },
  on: { backgroundColor: colors.surface, shadowColor: '#6E2427', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  text: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.textSoft },
  textOn: { fontFamily: fonts.bodyBold, color: colors.primary },
});

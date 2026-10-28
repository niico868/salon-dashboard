import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '../lib/theme';
import { Text } from './AppText';

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

// Round badge with a client's initials, e.g. "KM"
export default function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <View style={[s.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.text, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  circle: { backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.bodyBold, color: colors.primary },
});

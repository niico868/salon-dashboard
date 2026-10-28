import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors, fonts, radius, space } from '../lib/theme';
import { Text } from './AppText';
import Button from './Button';

type Props = { onRetry: () => void; message?: string };

// Shown in place of data when a Supabase load fails (usually no internet)
export default function LoadError({ onRetry, message = "Couldn't load this. Please check your internet connection." }: Props) {
  return (
    <View style={s.box} accessibilityRole="alert">
      <View style={s.line}>
        <Ionicons name="cloud-offline-outline" size={24} color={colors.primaryDeep} />
        <Text style={s.text}>{message}</Text>
      </View>
      <Button title="Try again" icon="refresh" onPress={onRetry} />
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: colors.blush, borderRadius: radius.lg, padding: space.lg, gap: space.md, borderWidth: 1, borderColor: colors.rose },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { color: colors.primaryDeep, fontFamily: fonts.bodyMedium, fontSize: 16, flex: 1 },
});

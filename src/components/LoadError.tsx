import { StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../lib/theme';
import Button from './Button';
import { Body } from './Typography';

type Props = { onRetry: () => void; message?: string };

// Shown in place of data when a Supabase load fails (usually no internet)
export default function LoadError({ onRetry, message = "Couldn't load. Check your internet connection." }: Props) {
  return (
    <View style={s.box}>
      <Body style={s.text}>{message}</Body>
      <Button title="Try again" icon="refresh" onPress={onRetry} />
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: colors.dangerBg, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  text: { color: colors.danger, textAlign: 'center' },
});

import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';

type Props = { onRetry: () => void; message?: string };

// Shown in place of data when a Supabase load fails (usually no internet)
export default function LoadError({ onRetry, message = "Couldn't load. Check your internet connection." }: Props) {
  return (
    <View style={s.box}>
      <Text style={s.text}>{message}</Text>
      <Pressable style={s.btn} onPress={onRetry}><Text style={s.btnText}>Try again</Text></Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: '#F8E2E1', borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: '#E3B8B7' },
  text: { color: '#6E2427', textAlign: 'center' },
  btn: { backgroundColor: '#9D3438', borderRadius: 10, padding: 12, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '600' },
});

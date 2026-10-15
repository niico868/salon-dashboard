import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  box: { backgroundColor: '#FCE4EC', borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: '#F48FB1' },
  text: { color: '#880E4F', textAlign: 'center' },
  btn: { backgroundColor: '#C2185B', borderRadius: 10, padding: 12, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '600' },
});

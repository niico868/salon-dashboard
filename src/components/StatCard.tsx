import { Text, View } from 'react-native';

export default function StatCard({ label, value, color = '#222' }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, minWidth: '45%', backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 4 }}>
      <Text style={{ color: '#777', fontSize: 13 }}>{label}</Text>
      <Text style={{ fontSize: 20, fontWeight: '700', color }}>{value}</Text>
    </View>
  );
}
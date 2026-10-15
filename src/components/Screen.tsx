import { ScrollView, StyleSheet, ViewStyle } from 'react-native';

export default function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <ScrollView contentContainerStyle={[styles.c, style]}>{children}</ScrollView>;
}
const styles = StyleSheet.create({ c: { padding: 16, gap: 12, backgroundColor: '#FFF7FA', flexGrow: 1 } });

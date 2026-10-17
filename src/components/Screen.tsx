import { RefreshControl, ScrollView, ViewStyle } from 'react-native';
import { colors, space } from '../lib/theme';

// Shared page wrapper: blush background, even padding, optional pull-to-refresh.
// <Screen onRefresh={load} refreshing={busy}>…</Screen>
export default function Screen({ children, style, onRefresh, refreshing = false }:
  { children: React.ReactNode; style?: ViewStyle; onRefresh?: () => void; refreshing?: boolean }) {
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[{ padding: space.lg, gap: space.md, flexGrow: 1, paddingBottom: space.xxl }, style]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
        tintColor={colors.primary} colors={[colors.primary]} /> : undefined}>
      {children}
    </ScrollView>
  );
}

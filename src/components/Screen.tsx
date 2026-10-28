import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, space } from '../lib/theme';

// Page wrapper: warm background, comfortable padding, pull-down-to-refresh when `onRefresh` is given.
// Content is kept to a readable width on tablets and computers.
export default function Screen({ children, style, onRefresh, footer }: {
  children: React.ReactNode; style?: ViewStyle; onRefresh?: () => Promise<unknown> | void; footer?: React.ReactNode;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = onRefresh ? (
    <RefreshControl refreshing={refreshing} tintColor={colors.primary} colors={[colors.primary]}
      onRefresh={async () => { setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); } }} />
  ) : undefined;
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={refresh} keyboardShouldPersistTaps="handled">
        <View style={[styles.inner, style]}>{children}</View>
      </ScrollView>
      {footer ? <View style={styles.footer}><View style={styles.footerInner}>{footer}</View></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingBottom: space.xxl },
  inner: { padding: space.lg, gap: space.md, width: '100%', maxWidth: 640, alignSelf: 'center' },
  footer: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface,
    paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.lg },
  footerInner: { width: '100%', maxWidth: 608, alignSelf: 'center' },
});

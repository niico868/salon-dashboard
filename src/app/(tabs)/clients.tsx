import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import EmptyState from '../../components/EmptyState';
import LoadError from '../../components/LoadError';
import PressableScale from '../../components/PressableScale';
import { SkeletonList } from '../../components/Skeleton';
import { BodyStrong, Label } from '../../components/Typography';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, shadow, space, touch } from '../../lib/theme';
import type { Client } from '../../lib/types';

export default function Clients() {
  const [list, setList] = useState<Client[]>([]);
  const [q, setQ] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (term: string) => {
    let query = supabase.from('clients').select('*').order('full_name').limit(200);
    if (term.trim()) query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
    const { data, error } = await query;
    setLoaded(true);
    if (error) return setLoadError(true);
    setLoadError(false);
    setList((data as Client[]) ?? []);
  }, []);

  useFocusEffect(useCallback(() => { load(q); }, [load, q]));

  const addClient = () => router.push('/client/new');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={s.top}>
        <View style={s.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput style={s.searchInput} placeholder="Search name or phone" placeholderTextColor={colors.placeholder}
            accessibilityLabel="Search clients" value={q} onChangeText={setQ} />
        </View>
        <PressableScale style={s.add} onPress={addClient} accessibilityRole="button" accessibilityLabel="Add client">
          <Ionicons name="person-add" size={20} color={colors.textOnPrimary} />
        </PressableScale>
      </View>
      {loadError && <View style={{ padding: space.lg, paddingBottom: 0 }}><LoadError onRetry={() => load(q)} /></View>}
      <FlatList data={list} keyExtractor={(c) => c.id} contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} colors={[colors.primary]}
          onRefresh={async () => { setRefreshing(true); await load(q); setRefreshing(false); }} />}
        ListEmptyComponent={loadError ? null : !loaded ? <SkeletonList count={5} /> : q.trim()
          ? <EmptyState icon="search-outline" title="No matches" message={`No client matches “${q.trim()}”.`} />
          : <EmptyState icon="people-outline" title="No clients yet" message="Add your first client to start booking."
              actionLabel="Add client" onAction={addClient} />}
        renderItem={({ item }) => (
          <PressableScale style={s.row} onPress={() => router.push(`/client/${item.id}`)}>
            <View style={{ flex: 1, gap: 2 }}>
              <BodyStrong>{item.full_name}</BodyStrong>
              <Label>{item.phone ?? 'No phone'}</Label>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
          </PressableScale>
        )} />
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', gap: space.sm, padding: space.lg, paddingBottom: 0 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.surface,
    borderRadius: radius.md, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, minHeight: touch.min + 4 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.text, paddingVertical: space.md },
  add: { width: touch.min + 4, height: touch.min + 4, borderRadius: radius.md, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center' },
  list: { padding: space.lg, gap: space.sm, paddingBottom: space.xxl, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: space.lg,
    borderRadius: radius.lg, ...shadow.card },
});

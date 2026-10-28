import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../components/AppText';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ListRow from '../../components/ListRow';
import LoadError from '../../components/LoadError';
import { SkeletonList } from '../../components/Skeleton';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, space, touch } from '../../lib/theme';
import type { Client } from '../../lib/types';

export default function Clients() {
  const [list, setList] = useState<Client[] | null>(null);
  const [q, setQ] = useState('');
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async (term: string) => {
    let query = supabase.from('clients').select('*').order('full_name').limit(200);
    const t = term.trim().replace(/[,()%]/g, ' ');
    if (t) query = query.or(`full_name.ilike.%${t}%,phone.ilike.%${t}%`);
    const { data, error } = await query;
    if (error) return setLoadError(true);
    setLoadError(false);
    setList((data as Client[]) ?? []);
  }, []);

  useFocusEffect(useCallback(() => { load(q); }, [load, q]));

  const searching = q.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={s.top}>
        <View style={s.search}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput style={s.searchInput} placeholder="Find a client by name or phone" value={q} onChangeText={setQ}
            placeholderTextColor={colors.placeholder} accessibilityLabel="Find a client" returnKeyType="search" />
          {searching && (
            <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={22} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        <Button title="Add a new client" icon="person-add" onPress={() => router.push('/client/new')} />
      </View>
      {loadError && <View style={{ paddingHorizontal: space.lg }}><LoadError onRetry={() => load(q)} /></View>}
      {list === null && !loadError ? <View style={s.list}><SkeletonList count={4} /></View> : (
        <FlatList data={list ?? []} keyExtractor={(c) => c.id} contentContainerStyle={s.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={list && list.length > 0
            ? <Text style={s.count}>{searching ? `${list.length} found` : `${list.length} client${list.length === 1 ? '' : 's'}`}</Text>
            : null}
          ListEmptyComponent={loadError ? null : searching ? (
            <EmptyState icon="search-outline" title="No one found" message={`No client matches "${q.trim()}".`}
              actionLabel="Add them as a new client" onAction={() => router.push({ pathname: '/client/new', params: { name: q.trim() } })} />
          ) : (
            <EmptyState icon="people-outline" title="No clients yet" message="Add your first client to start booking."
              actionLabel="Add client" onAction={() => router.push('/client/new')} />
          )}
          renderItem={({ item }) => (
            <ListRow title={item.full_name} subtitle={item.phone ?? 'No phone number saved'}
              left={<Avatar name={item.full_name} />}
              onPress={() => router.push(`/client/${item.id}`)} />
          )} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  top: { gap: space.md, padding: space.lg, paddingBottom: space.sm, width: '100%', maxWidth: 640, alignSelf: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, minHeight: touch.min + 4 },
  searchInput: { flex: 1, fontSize: 17, paddingVertical: 10, fontFamily: fonts.body },
  list: { padding: space.lg, paddingTop: space.sm, gap: space.sm, width: '100%', maxWidth: 640, alignSelf: 'center' },
  count: { color: colors.textMuted, fontSize: 14, marginBottom: 2 },
});

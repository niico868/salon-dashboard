import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../components/AppText';
import LoadError from '../../components/LoadError';
import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/types';

export default function Clients() {
  const [list, setList] = useState<Client[]>([]);
  const [q, setQ] = useState('');
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async (term: string) => {
    let query = supabase.from('clients').select('*').order('full_name').limit(200);
    if (term.trim()) query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
    const { data, error } = await query;
    if (error) return setLoadError(true);
    setLoadError(false);
    setList((data as Client[]) ?? []);
  }, []);

  useFocusEffect(useCallback(() => { load(q); }, [load, q]));

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFCF9' }}>
      <View style={s.top}>
        <TextInput style={s.search} placeholder="Search name or phone" value={q} onChangeText={setQ} />
        <Pressable style={s.add} onPress={() => router.push('/client/new')}><Text style={s.addText}>+</Text></Pressable>
      </View>
      {loadError && <View style={{ padding: 16, paddingBottom: 0 }}><LoadError onRetry={() => load(q)} /></View>}
      <FlatList data={list} keyExtractor={(c) => c.id} contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={loadError ? null : <Text style={{ color: '#777' }}>No clients yet.</Text>}
        renderItem={({ item }) => (
          <Pressable style={s.row} onPress={() => router.push(`/client/${item.id}`)}>
            <Text style={s.name}>{item.full_name}</Text>
            <Text style={s.sub}>{item.phone ?? 'No phone'}</Text>
          </Pressable>
        )} />
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 0 },
  search: { flex: 1, backgroundColor: 'white', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#eee' },
  add: { width: 48, borderRadius: 10, backgroundColor: '#9D3438', alignItems: 'center', justifyContent: 'center' },
  addText: { color: 'white', fontSize: 24 },
  row: { backgroundColor: 'white', padding: 14, borderRadius: 12 },
  name: { fontSize: 16, fontWeight: '500' },
  sub: { color: '#777', marginTop: 2 },
});
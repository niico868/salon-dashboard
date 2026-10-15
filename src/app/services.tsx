import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Screen from '../components/Screen';
import LoadError from '../components/LoadError';
import PasscodePrompt from '../components/PasscodePrompt';
import { supabase } from '../lib/supabase';
import { TTD } from '../lib/money';
import type { Service } from '../lib/types';

type Draft = { id?: string; name: string; category: string; price: string; duration_min: string; active: boolean };
const EMPTY: Draft = { name: '', category: 'Hair', price: '', duration_min: '60', active: true };

export default function Services() {
  const [items, setItems] = useState<Service[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [asking, setAsking] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('services').select('*').order('category').order('name');
    if (error) return setLoadError(true);
    setLoadError(false);
    setItems(data as Service[]);
  }, []);

  // Reload on open; re-lock on leaving
  useFocusEffect(useCallback(() => { load(); return () => setUnlocked(false); }, [load]));

  async function save() {
    if (!draft) return;
    const price = Number(draft.price), duration = Number(draft.duration_min);
    if (!draft.name.trim()) return Alert.alert('Name is required');
    if (!(price >= 0)) return Alert.alert('Price must be a number');
    if (!(duration > 0)) return Alert.alert('Duration must be minutes, e.g. 45');
    const row = { name: draft.name.trim(), category: draft.category.trim() || 'General', price,
      duration_min: duration, active: draft.active };
    const { error } = draft.id
      ? await supabase.from('services').update(row).eq('id', draft.id)
      : await supabase.from('services').insert(row);
    if (error) return Alert.alert('Save failed', error.message);
    setDraft(null); load();
  }

  // Group by category; hide retired ones unless unlocked
  const visible = items.filter((s) => unlocked || s.active);
  const groups = visible.reduce<Record<string, Service[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s); return acc;
  }, {});

  return (
    <Screen>
      <Pressable style={[st.btn, unlocked && st.btnOutline]}
        onPress={() => (unlocked ? setDraft({ ...EMPTY }) : setAsking(true))}>
        <Text style={[st.btnText, unlocked && { color: '#C2185B' }]}>
          {unlocked ? '+ Add service' : '🔒 Edit menu'}
        </Text>
      </Pressable>
      {loadError && <LoadError onRetry={load} />}

      {Object.entries(groups).map(([cat, list]) => (
        <View key={cat} style={{ gap: 6 }}>
          <Text style={st.cat}>{cat}</Text>
          {list.map((s) => (
            <Pressable key={s.id} disabled={!unlocked}
              onPress={() => setDraft({ id: s.id, name: s.name, category: s.category, price: String(s.price),
                duration_min: String(s.duration_min), active: s.active })}
              style={[st.row, !s.active && { opacity: 0.4 }]}>
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{s.name}{!s.active ? ' (retired)' : ''}</Text>
                <Text style={st.sub}>{s.duration_min} min</Text>
              </View>
              <Text style={st.price}>{TTD(Number(s.price))}</Text>
            </Pressable>
          ))}
        </View>
      ))}
      {visible.length === 0 && !loadError && <Text style={st.sub}>No services yet. Tap Edit menu to add your first.</Text>}

      <PasscodePrompt visible={asking} onCancel={() => setAsking(false)}
        onSuccess={() => { setAsking(false); setUnlocked(true); }} />

      <Modal visible={!!draft} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDraft(null)}>
        {draft && (
          <Screen>
            <Text style={st.cat}>{draft.id ? 'Edit service' : 'New service'}</Text>
            <TextInput style={st.input} placeholder="Name (e.g. Silk press)" value={draft.name}
              onChangeText={(name) => setDraft({ ...draft, name })} />
            <TextInput style={st.input} placeholder="Category (e.g. Hair, Nails, Lashes)" value={draft.category}
              onChangeText={(category) => setDraft({ ...draft, category })} />
            <TextInput style={st.input} placeholder="Price in TT$" keyboardType="decimal-pad" value={draft.price}
              onChangeText={(price) => setDraft({ ...draft, price })} />
            <TextInput style={st.input} placeholder="Duration in minutes" keyboardType="number-pad"
              value={draft.duration_min} onChangeText={(duration_min) => setDraft({ ...draft, duration_min })} />
            <View style={st.switchRow}>
              <Text>Available for booking</Text>
              <Switch value={draft.active} onValueChange={(active) => setDraft({ ...draft, active })} />
            </View>
            <Pressable style={st.btn} onPress={save}><Text style={st.btnText}>Save</Text></Pressable>
            <Pressable onPress={() => setDraft(null)}><Text style={st.cancel}>Cancel</Text></Pressable>
          </Screen>
        )}
      </Modal>
    </Screen>
  );
}

const st = StyleSheet.create({
  btn: { backgroundColor: '#C2185B', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnOutline: { backgroundColor: 'white', borderWidth: 1, borderColor: '#C2185B' },
  btnText: { color: 'white', fontWeight: '600' },
  cat: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 14, borderRadius: 12 },
  name: { fontSize: 16, fontWeight: '500' },
  sub: { color: '#777' },
  price: { fontWeight: '600' },
  input: { backgroundColor: 'white', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#eee' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 4 },
  cancel: { textAlign: 'center', color: '#C2185B', padding: 8 },
});

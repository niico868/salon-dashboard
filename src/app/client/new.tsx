import { addWeeks, format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Screen from '../../components/Screen';
import { supabase } from '../../lib/supabase';

const blank = { full_name: '', phone: '', email: '', birthday: '', preferences: '', notes: '',
  follow_up_date: '', follow_up_note: '' };

export default function ClientForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [f, setF] = useState(blank);

  useEffect(() => {
    if (!id) return;
    supabase.from('clients').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setF(Object.fromEntries(Object.keys(blank).map((k) => [k, (data as any)[k] ?? ''])) as typeof blank);
    });
  }, [id]);

  const set = (k: keyof typeof blank) => (v: string) => setF({ ...f, [k]: v });
  const followIn = (w: number) => setF({ ...f, follow_up_date: format(addWeeks(new Date(), w), 'yyyy-MM-dd') });

  async function save() {
    if (!f.full_name.trim()) return Alert.alert('Name is required');
    if (f.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(f.birthday)) return Alert.alert('Birthday must look like 1990-05-21');
    const row = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null]));
    const { error } = id
      ? await supabase.from('clients').update(row).eq('id', id)
      : await supabase.from('clients').insert(row);
    if (error) return Alert.alert('Save failed', error.message);
    router.back();
  }

  return (
    <Screen>
      <TextInput style={s.in} placeholder="Full name *" value={f.full_name} onChangeText={set('full_name')} />
      <TextInput style={s.in} placeholder="Phone (e.g. 868 555 1234)" keyboardType="phone-pad" value={f.phone} onChangeText={set('phone')} />
      <TextInput style={s.in} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={f.email} onChangeText={set('email')} />
      <TextInput style={s.in} placeholder="Birthday (YYYY-MM-DD)" value={f.birthday} onChangeText={set('birthday')} />
      <TextInput style={[s.in, s.multi]} multiline placeholder="Preferences (products, style)" value={f.preferences} onChangeText={set('preferences')} />
      <TextInput style={[s.in, s.multi]} multiline placeholder="Notes" value={f.notes} onChangeText={set('notes')} />

      <Text style={s.label}>Follow up {f.follow_up_date ? `on ${f.follow_up_date}` : '(none)'}</Text>
      <View style={s.chips}>
        {[2, 4, 6].map((w) => (
          <Pressable key={w} style={s.chip} onPress={() => followIn(w)}><Text>In {w} wks</Text></Pressable>
        ))}
        <Pressable style={s.chip} onPress={() => setF({ ...f, follow_up_date: '' })}><Text>Clear</Text></Pressable>
      </View>
      <TextInput style={s.in} placeholder="Follow-up note (e.g. check colour fade)" value={f.follow_up_note} onChangeText={set('follow_up_note')} />

      <Pressable style={s.btn} onPress={save}><Text style={s.btnText}>Save client</Text></Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  in: { backgroundColor: 'white', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#eee' },
  multi: { minHeight: 80, textAlignVertical: 'top' },
  label: { fontWeight: '600', marginTop: 4 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: 'white', borderWidth: 1, borderColor: '#C2185B', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  btn: { backgroundColor: '#C2185B', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: 'white', fontWeight: '600' },
});

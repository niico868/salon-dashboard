import { addWeeks, format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import Field from '../../components/Field';
import LoadError from '../../components/LoadError';
import Screen from '../../components/Screen';
import { useToast } from '../../components/Toast';
import { BodyStrong, Small } from '../../components/Typography';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, space, touch } from '../../lib/theme';

const blank = { full_name: '', phone: '', email: '', birthday: '', preferences: '', notes: '',
  follow_up_date: '', follow_up_note: '' };

export default function ClientForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [f, setF] = useState(blank);
  const [loadError, setLoadError] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    if (!id) return;
    supabase.from('clients').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error) return setLoadError(true);
      setLoadError(false);
      if (data) setF(Object.fromEntries(Object.keys(blank).map((k) => [k, (data as any)[k] ?? ''])) as typeof blank);
    });
  }, [id]);
  useEffect(load, [load]);

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
    toast.show('Client saved');
    router.back();
  }

  // Editing but the client didn't load: hide the form so a save can't blank their details
  if (loadError) return <Screen><LoadError onRetry={load} /></Screen>;

  return (
    <Screen>
      <Field label="Full name" required placeholder="e.g. Aaliyah Mohammed" autoCapitalize="words"
        value={f.full_name} onChangeText={set('full_name')} />
      <Field label="Phone" placeholder="e.g. 868 555 1234" hint="Used for calls and WhatsApp" keyboardType="phone-pad"
        value={f.phone} onChangeText={set('phone')} />
      <Field label="Email" placeholder="e.g. aaliyah@example.com" autoCapitalize="none" keyboardType="email-address"
        value={f.email} onChangeText={set('email')} />
      <Field label="Birthday" placeholder="e.g. 1990-05-21" hint="Year-month-day. Shows on Home the week of their birthday."
        value={f.birthday} onChangeText={set('birthday')} />
      <Field label="Preferences" multiline placeholder="e.g. Prefers morning appointments, sensitive skin"
        value={f.preferences} onChangeText={set('preferences')} />
      <Field label="Notes" multiline placeholder="e.g. Allergic to latex" value={f.notes} onChangeText={set('notes')} />

      <BodyStrong style={{ marginTop: space.xs }}>Follow up {f.follow_up_date ? `on ${f.follow_up_date}` : '(none)'}</BodyStrong>
      <View style={s.chips}>
        {[2, 4, 6].map((w) => (
          <Pressable key={w} style={s.chip} onPress={() => followIn(w)} accessibilityRole="button">
            <Text style={s.chipText}>In {w} wks</Text>
          </Pressable>
        ))}
        <Pressable style={[s.chip, s.chipClear]} onPress={() => setF({ ...f, follow_up_date: '' })} accessibilityRole="button">
          <Text style={[s.chipText, { color: colors.textMuted }]}>Clear</Text>
        </Pressable>
      </View>
      <Field label="Follow-up note" placeholder="e.g. Check colour fade" value={f.follow_up_note} onChangeText={set('follow_up_note')} />
      <Small>Fields marked * are required.</Small>

      <Button title="Save client" icon="checkmark" onPress={save} style={{ marginTop: space.sm }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  chip: { minHeight: touch.min - 8, justifyContent: 'center', backgroundColor: colors.blush, borderRadius: radius.pill,
    paddingHorizontal: 14 },
  chipClear: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary },
});

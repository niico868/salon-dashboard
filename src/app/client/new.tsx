import { addWeeks, format } from 'date-fns';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Field from '../../components/Field';
import LoadError from '../../components/LoadError';
import Screen from '../../components/Screen';
import { useToast } from '../../components/Toast';
import { Heading, Small } from '../../components/Typography';
import { haptic } from '../../lib/motion';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, space } from '../../lib/theme';

const blank = { full_name: '', phone: '', email: '', birthday: '', preferences: '', notes: '',
  follow_up_date: '', follow_up_note: '' };

export default function ClientForm() {
  // Coming from a website enquiry: start with their details and link the enquiry once saved
  const { id, name, phone, email, notes, enquiry } =
    useLocalSearchParams<{ id?: string; name?: string; phone?: string; email?: string; notes?: string; enquiry?: string }>();
  const navigation = useNavigation();
  const toast = useToast();
  const [f, setF] = useState(() => id ? blank
    : { ...blank, full_name: name ?? '', phone: phone ?? '', email: email ?? '', notes: notes ?? '' });
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [birthdayError, setBirthdayError] = useState('');

  useEffect(() => { navigation.setOptions({ title: id ? 'Edit client' : 'New client' }); }, [navigation, id]);

  const load = useCallback(() => {
    if (!id) return;
    supabase.from('clients').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error) return setLoadError(true);
      setLoadError(false);
      if (data) setF(Object.fromEntries(Object.keys(blank).map((k) => [k, (data as any)[k] ?? ''])) as typeof blank);
    });
  }, [id]);
  useEffect(load, [load]);

  const set = (k: keyof typeof blank) => (v: string) => setF((cur) => ({ ...cur, [k]: v }));
  const followIn = (w: number) => { haptic.tap(); setF((cur) => ({ ...cur, follow_up_date: format(addWeeks(new Date(), w), 'yyyy-MM-dd') })); };

  async function save() {
    setNameError(''); setBirthdayError('');
    if (!f.full_name.trim()) return setNameError('Please type the client\'s name.');
    if (f.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(f.birthday.trim()))
      return setBirthdayError('Write it as year-month-day, for example 1985-05-21.');
    const row = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null]));
    setSaving(true);
    try {
      if (id) {
        const { error } = await supabase.from('clients').update(row).eq('id', id);
        if (error) return Alert.alert('Save failed', error.message);
      } else {
        const { data, error } = await supabase.from('clients').insert(row).select('id').single();
        if (error) return Alert.alert('Save failed', error.message);
        if (enquiry) await supabase.from('enquiries').update({ client_id: data.id }).eq('id', enquiry);
      }
      toast.show(id ? 'Client updated' : 'Client saved');
      router.back();
    } finally {
      setSaving(false);
    }
  }

  // Editing but the client didn't load: hide the form so a save can't blank their details
  if (loadError) return <Screen><LoadError onRetry={load} /></Screen>;

  const followLabel = f.follow_up_date
    ? `On ${format(new Date(f.follow_up_date + 'T12:00'), 'EEEE d MMMM')}`
    : 'No follow-up set';

  return (
    <Screen footer={<Button title={id ? 'Save changes' : 'Save client'} icon="checkmark-circle" size="lg" loading={saving} onPress={save} />}>
      <Card>
        <Heading>Contact details</Heading>
        <Field label="Full name" required value={f.full_name} onChangeText={set('full_name')} placeholder="e.g. Keisha Mohammed"
          autoCapitalize="words" error={nameError} />
        <Field label="Phone" keyboardType="phone-pad" value={f.phone} onChangeText={set('phone')} placeholder="e.g. 868 555 1234"
          hint="Used for WhatsApp and calls" />
        <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={f.email} onChangeText={set('email')}
          placeholder="e.g. keisha@gmail.com" />
        <Field label="Birthday" value={f.birthday} onChangeText={set('birthday')} placeholder="e.g. 1985-05-21"
          keyboardType="numbers-and-punctuation" error={birthdayError}
          hint="Year-month-day. Don't know the year? Use 1900, e.g. 1900-05-21" />
      </Card>

      <Card>
        <Heading>About them</Heading>
        <Field label="Preferences" multiline value={f.preferences} onChangeText={set('preferences')}
          placeholder="e.g. Likes firm pressure, sensitive skin, prefers mornings" />
        <Field label="Notes" multiline value={f.notes} onChangeText={set('notes')} placeholder="Anything else to remember" />
      </Card>

      <Card>
        <Heading>Follow up</Heading>
        <Small>A reminder on your Home screen to check in with this client.</Small>
        <Text style={s.followLabel}>{followLabel}</Text>
        <View style={s.chips}>
          {[2, 4, 6].map((w) => (
            <Pressable key={w} style={s.chip} onPress={() => followIn(w)} accessibilityRole="button">
              <Text style={s.chipText}>In {w} weeks</Text>
            </Pressable>
          ))}
          {!!f.follow_up_date && (
            <Pressable style={[s.chip, s.chipClear]} onPress={() => setF((cur) => ({ ...cur, follow_up_date: '' }))} accessibilityRole="button">
              <Text style={[s.chipText, { color: colors.textMuted }]}>Remove</Text>
            </Pressable>
          )}
        </View>
        <Field label="What to follow up about" value={f.follow_up_note} onChangeText={set('follow_up_note')}
          placeholder="e.g. Check how the colour is holding" />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  followLabel: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.primaryDeep },
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  chip: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.pill,
    paddingHorizontal: space.lg, minHeight: 44, justifyContent: 'center' },
  chipClear: { borderColor: colors.border },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
});

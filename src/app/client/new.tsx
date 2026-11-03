import { addWeeks, format } from 'date-fns';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Text } from '../../components/AppText';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Field from '../../components/Field';
import LoadError from '../../components/LoadError';
import Screen from '../../components/Screen';
import { useToast } from '../../components/Toast';
import { Heading, Small } from '../../components/Typography';
import { buildBirthday, MONTHS, parseBirthday, phoneLooksValid } from '../../lib/birthdayInput';
import { haptic } from '../../lib/motion';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, space } from '../../lib/theme';

const blank = { full_name: '', phone: '', email: '', preferences: '', notes: '',
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
  const [phoneError, setPhoneError] = useState('');
  const [birthday, setBirthday] = useState(() => parseBirthday(null));

  useEffect(() => { navigation.setOptions({ title: id ? 'Edit client' : 'New client' }); }, [navigation, id]);
  // Email consent (needs supabase/sql/client-messages.sql). Offers and birthday emails only go out when this is on.
  const [optIn, setOptIn] = useState(false);
  const [emailsOff, setEmailsOff] = useState(false);
  const [hasConsent, setHasConsent] = useState(false); // false until that SQL has been run

  const load = useCallback(() => {
    if (!id) return;
    supabase.from('clients').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error) return setLoadError(true);
      setLoadError(false);
      if (!data) return;
      setF(Object.fromEntries(Object.keys(blank).map((k) => [k, (data as any)[k] ?? ''])) as typeof blank);
      setBirthday(parseBirthday(data.birthday));
      setHasConsent('marketing_opt_in' in data);
      setOptIn(!!data.marketing_opt_in);
      setEmailsOff(!!data.emails_off);
    });
  }, [id]);
  useEffect(load, [load]);

  const set = (k: keyof typeof blank) => (v: string) => setF((cur) => ({ ...cur, [k]: v }));
  const followIn = (w: number) => { haptic.tap(); setF((cur) => ({ ...cur, follow_up_date: format(addWeeks(new Date(), w), 'yyyy-MM-dd') })); };

  async function save() {
    setNameError(''); setBirthdayError(''); setPhoneError('');
    if (!f.full_name.trim()) return setNameError('Please type the client\'s name.');
    if (!phoneLooksValid(f.phone)) return setPhoneError('Check this number. It should have at least 7 digits, for example 868 555 1234.');
    const born = buildBirthday(birthday.day, birthday.month, birthday.year, new Date());
    if (born.error) return setBirthdayError(born.error);
    const row: Record<string, string | boolean | null> = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null]));
    row.birthday = born.value;
    // Only send consent once the database has the column, so saving still works before the SQL is run
    if (hasConsent || optIn) row.marketing_opt_in = optIn;
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
          hint="Used for WhatsApp and calls" error={phoneError} />
        <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={f.email} onChangeText={set('email')}
          placeholder="e.g. keisha@gmail.com" />
        <Text style={s.birthdayLabel}>Birthday</Text>
        <View style={s.months}>
          {MONTHS.map((label, i) => {
            const on = birthday.month === i + 1;
            return (
              <Pressable key={label} style={[s.month, on && s.monthOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}
                onPress={() => { haptic.tap(); setBirthday((b) => ({ ...b, month: on ? null : i + 1 })); }}>
                <Text style={[s.monthText, on && { color: colors.textOnPrimary }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={s.birthdayRow}>
          <View style={{ flex: 1 }}>
            <Field label="Day" keyboardType="number-pad" value={birthday.day} placeholder="e.g. 21" maxLength={2}
              onChangeText={(day) => setBirthday((b) => ({ ...b, day }))} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Year (optional)" keyboardType="number-pad" value={birthday.year} placeholder="e.g. 1985" maxLength={4}
              onChangeText={(year) => setBirthday((b) => ({ ...b, year }))} />
          </View>
        </View>
        {!!birthdayError && <Small style={{ color: colors.danger }}>{birthdayError}</Small>}
      </Card>

      <Card>
        <Heading>Emails</Heading>
        <View style={s.consent}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.consentLabel}>Offers & birthday emails</Text>
            <Small>Only turn on if the client agreed. Reminders and aftercare are sent either way.</Small>
          </View>
          <Switch value={optIn} onValueChange={setOptIn} disabled={emailsOff}
            trackColor={{ true: colors.primary, false: colors.border }} accessibilityLabel="Offers and birthday emails" />
        </View>
        {emailsOff && <Small>This client unsubscribed from all emails, so none are sent.</Small>}
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
          placeholder="e.g. Check how the treatment went" />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  birthdayLabel: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  months: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  month: { flexGrow: 1, flexBasis: '14%', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  monthOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  birthdayRow: { flexDirection: 'row', gap: space.md },
  followLabel: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.primaryDeep },
  chips: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  chip: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.pill,
    paddingHorizontal: space.lg, minHeight: 44, justifyContent: 'center' },
  chipClear: { borderColor: colors.border },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  consent: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  consentLabel: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
});

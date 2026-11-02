import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { AFTERCARE } from '../../supabase/functions/client-messages/aftercare';
import {
  DEFAULT_SETTINGS, DEFAULT_WORDING, PLACEHOLDERS, fillIn, unknownPlaceholders, wordingFor,
  type EmailKind, type EmailSettings, type Wording,
} from '../../supabase/functions/client-messages/wording';
import { Text } from '../components/AppText';
import Button from '../components/Button';
import Card from '../components/Card';
import Field from '../components/Field';
import LoadError from '../components/LoadError';
import Screen from '../components/Screen';
import { SkeletonList } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { Heading, Small } from '../components/Typography';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius, space } from '../lib/theme';

type EmailInfo = { kind: EmailKind; label: string; when: string };

const OFFERS: EmailInfo[] = [
  { kind: 'rebook_1m', label: 'Rebooking offer', when: '1 month after their last visit' },
  { kind: 'rebook_2m', label: 'Second rebooking offer', when: '2 months after their last visit' },
  { kind: 'birthday', label: 'Birthday wishes', when: 'On their birthday' },
];
const APPOINTMENT: EmailInfo[] = [
  { kind: 'reminder_2d', label: 'Reminder', when: '2 days before the appointment' },
  { kind: 'reminder_1d', label: 'Reminder', when: 'The day before the appointment' },
  { kind: 'aftercare', label: 'Aftercare', when: 'Right after you mark a visit Done' },
  { kind: 'checkin_1w', label: 'Check-in', when: '1 week after the visit' },
];

const FILL_IN_HELP: Record<string, string> = {
  name: 'their first name', treatment: 'the treatment', date: 'the appointment day and time', discount: 'the birthday discount',
};
const SAMPLE = { name: 'Ana', treatment: 'Cavitation', date: 'Friday 14 November at 10:00 AM' };

type Form = {
  paused: boolean;
  off: EmailKind[];
  discount: string;
  words: Record<EmailKind, Wording>;
  aftercare: Record<string, string>;
};

const KINDS = Object.keys(DEFAULT_WORDING) as EmailKind[];

function toForm(s: EmailSettings): Form {
  return {
    paused: s.paused,
    off: s.off_kinds.filter((k): k is EmailKind => KINDS.includes(k as EmailKind)),
    discount: String(s.birthday_discount),
    words: Object.fromEntries(KINDS.map((k) => [k, wordingFor(k, s.wording)])) as Form['words'],
    aftercare: Object.fromEntries(AFTERCARE.map((a) => [a.title, s.aftercare[a.title] ?? a.points.join('\n')])),
  };
}

// Only words that differ from the originals are saved, so later fixes to the originals still reach her.
function savedWording(words: Form['words']) {
  const out: EmailSettings['wording'] = {};
  for (const k of KINDS) {
    const subject = words[k].subject.trim(), body = words[k].body.trim();
    const mine: Partial<Wording> = {};
    if (subject && subject !== DEFAULT_WORDING[k].subject) mine.subject = subject;
    if (body && body !== DEFAULT_WORDING[k].body) mine.body = body;
    if (mine.subject || mine.body) out[k] = mine;
  }
  return out;
}

function validDiscount(text: string) {
  const n = Number(text.trim());
  return /^\d+$/.test(text.trim()) && n >= 1 && n <= 100 ? n : null;
}

export default function EmailMarketing() {
  const toast = useToast();
  const navigation = useNavigation();
  const [form, setForm] = useState<Form | null>(null);
  const [savedAs, setSavedAs] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(() => supabase.from('email_settings').select('*').maybeSingle().then(({ data, error }) => {
    if (error) {
      // The table isn't there until supabase/sql/email-settings.sql has been run
      if (error.code === 'PGRST205' || error.code === '42P01') { setNeedsSetup(true); setLoadError(false); return; }
      setLoadError(true);
      return;
    }
    setLoadError(false); setNeedsSetup(false);
    const next = toForm({ ...DEFAULT_SETTINGS, ...(data ?? {}) });
    setForm(next); setSavedAs(JSON.stringify(next));
  }), []);
  useEffect(() => { load(); }, [load]);

  const dirty = !!form && JSON.stringify(form) !== savedAs;

  // Typing out aftercare takes a while: don't lose it to a stray tap on Back
  useEffect(() => {
    if (!dirty) return;
    return navigation.addListener('beforeRemove' as any, (e: any) => {
      e.preventDefault();
      Alert.alert('Leave without saving?', 'Your changes to these emails will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
  }, [dirty, navigation]);

  if (loadError) return <Screen><LoadError onRetry={load} /></Screen>;
  if (needsSetup) return (
    <Screen>
      <Card tone="soft">
        <Heading>Almost ready</Heading>
        <Small>These settings need one quick database update before they can be used. Your emails carry on as normal until then.</Small>
      </Card>
    </Screen>
  );
  if (!form) return <Screen><SkeletonList count={4} /></Screen>;

  const change = (patch: Partial<Form>) => setForm({ ...form, ...patch });
  const setWord = (kind: EmailKind, key: keyof Wording, text: string) =>
    change({ words: { ...form.words, [kind]: { ...form.words[kind], [key]: text } } });
  const toggle = (kind: EmailKind, on: boolean) =>
    change({ off: on ? form.off.filter((k) => k !== kind) : [...form.off, kind] });

  async function save() {
    if (!form) return;
    const found: Record<string, string> = {};
    const discount = validDiscount(form.discount);
    if (discount === null) found.discount = 'Type a whole number from 1 to 100, for example 10.';
    let firstBad: string | null = null;
    for (const k of KINDS) {
      for (const key of ['subject', 'body'] as const) {
        const bad = unknownPlaceholders(form.words[k][key], k);
        if (bad.length) {
          found[`${k}.${key}`] = `{${bad[0]}} isn't a word this email can fill in. Check the spelling or remove it.`;
          firstBad ??= k;
        }
      }
    }
    setErrors(found);
    if (Object.keys(found).length) {
      if (firstBad) setOpen(firstBad);
      return Alert.alert('Check your changes', 'Something needs fixing before this can be saved.');
    }

    const aftercare = Object.fromEntries(Object.entries(form.aftercare).map(([t, v]) => [t, v.trim()]).filter(([, v]) => v));
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return Alert.alert('Please log in again', 'Your login has ended.');
    setSaving(true);
    const { error } = await supabase.from('email_settings').upsert({
      owner_id: auth.user.id, paused: form.paused, off_kinds: form.off, birthday_discount: discount,
      wording: savedWording(form.words), aftercare, updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) return Alert.alert('Save failed', error.message);
    toast.show('Email settings saved');
    await load(); // shows what was really saved, e.g. the original words back in a field left blank
  }

  const row = ({ kind, label, when }: EmailInfo) => {
    const isOn = !form.off.includes(kind);
    const isOpen = open === kind;
    const w = form.words[kind];
    const values = { ...SAMPLE, discount: form.discount.trim() || '10' };
    const changed = w.subject.trim() !== DEFAULT_WORDING[kind].subject || w.body.trim() !== DEFAULT_WORDING[kind].body;
    return (
      <Card key={kind} style={!isOn || form.paused ? s.dimmed : undefined}>
        <View style={s.head}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.label}>{label}</Text>
            <Small>{when}</Small>
          </View>
          <Switch value={isOn} onValueChange={(v) => toggle(kind, v)} accessibilityLabel={`${label}: ${when}`}
            trackColor={{ true: colors.primary, false: colors.border }} />
        </View>
        <Pressable style={s.expand} onPress={() => setOpen(isOpen ? null : kind)} accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}>
          <Text style={s.expandText}>{isOpen ? 'Close' : 'Change the words'}</Text>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
        </Pressable>
        {isOpen && (
          <View style={{ gap: space.md }}>
            <Field label="Subject line" value={w.subject} onChangeText={(t) => setWord(kind, 'subject', t)} error={errors[`${kind}.subject`]} />
            <Field label="Message" multiline value={w.body} onChangeText={(t) => setWord(kind, 'body', t)} error={errors[`${kind}.body`]}
              hint="Each line becomes its own paragraph." />
            <View style={s.help}>
              <Small>The app fills these in for each client, so keep the curly brackets:</Small>
              {PLACEHOLDERS[kind].map((p) => <Small key={p}>{`{${p}}  →  ${FILL_IN_HELP[p]}`}</Small>)}
            </View>
            {kind === 'aftercare' && <Small>Aftercare points for the treatment and the general care section are added below your message.</Small>}
            <View style={s.preview}>
              <Text style={s.previewTag}>How it will read</Text>
              <Text style={s.previewSubject}>{fillIn(w.subject, values)}</Text>
              {w.body.split(/\n+/).filter((l) => l.trim()).map((l, i) => <Text key={i} style={s.previewBody}>{fillIn(l, values)}</Text>)}
            </View>
            {changed && (
              <Button title="Use the original words" variant="ghost" onPress={() => change({ words: { ...form.words, [kind]: DEFAULT_WORDING[kind] } })} />
            )}
          </View>
        )}
      </Card>
    );
  };

  return (
    <Screen onRefresh={dirty ? undefined : async () => { await load(); }} footer={
      <Button title="Save changes" icon="checkmark-circle" size="lg" loading={saving} disabled={!dirty} onPress={save} />
    }>
      <Card tone={form.paused ? 'soft' : 'plain'}>
        <View style={s.head}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.label}>Send automatic emails</Text>
            <Small>{form.paused ? 'Paused. No emails go out until you turn this back on.' : 'On. Emails go out between 8 AM and 8 PM.'}</Small>
          </View>
          <Switch value={!form.paused} onValueChange={(v) => change({ paused: !v })} accessibilityLabel="Send automatic emails"
            trackColor={{ true: colors.primary, false: colors.border }} />
        </View>
      </Card>

      <Text style={s.section}>Offers</Text>
      <Small>Only for clients who agreed to offers. You can see this on their profile.</Small>
      {OFFERS.map(row)}
      <Card>
        <Field label="Birthday discount (%)" keyboardType="number-pad" value={form.discount} placeholder="e.g. 10"
          onChangeText={(discount) => change({ discount })} error={errors.discount}
          hint="Used in the birthday email and the birthday WhatsApp message." />
      </Card>

      <Text style={s.section}>Appointment emails</Text>
      <Small>Sent to every client with an email address, unless they unsubscribed.</Small>
      {APPOINTMENT.map(row)}

      <Text style={s.section}>Aftercare by treatment</Text>
      <Small>Your own points for each treatment, one per line. Only add guidance you already give clients. Leave a treatment empty and its email carries the general care section only.</Small>
      {AFTERCARE.map(({ title }) => {
        const isOpen = open === `care:${title}`;
        const filled = !!form.aftercare[title]?.trim();
        return (
          <Card key={title}>
            <Pressable style={s.careHead} onPress={() => setOpen(isOpen ? null : `care:${title}`)} accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}>
              <Text style={[s.label, { flex: 1 }]}>{title}</Text>
              <Small>{filled ? 'Added' : 'Empty'}</Small>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
            </Pressable>
            {isOpen && (
              <Field label={`${title} aftercare points`} multiline value={form.aftercare[title]}
                placeholder="One point per line"
                onChangeText={(t) => change({ aftercare: { ...form.aftercare, [title]: t } })} />
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  label: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text },
  dimmed: { opacity: 0.7 },
  section: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: space.md },
  expand: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44 },
  expandText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  careHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  help: { gap: 2, backgroundColor: colors.cream, borderRadius: radius.md, padding: space.md },
  preview: { gap: space.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md },
  previewTag: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textMuted },
  previewSubject: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  previewBody: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.text },
});

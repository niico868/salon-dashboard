import { useCallback, useState } from 'react';
import { Alert, Modal, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import Screen from '../components/Screen';
import LoadError from '../components/LoadError';
import PasscodePrompt from '../components/PasscodePrompt';
import PressableScale from '../components/PressableScale';
import { SkeletonList } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { BodyStrong, Heading, Label, Title } from '../components/Typography';
import { supabase } from '../lib/supabase';
import { TTD } from '../lib/money';
import { colors, radius, shadow, space } from '../lib/theme';
import type { Service } from '../lib/types';

type Draft = { id?: string; name: string; category: string; price: string; duration_min: string; active: boolean };
const EMPTY: Draft = { name: '', category: 'Hair', price: '', duration_min: '60', active: true };

export default function Services() {
  const [items, setItems] = useState<Service[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [asking, setAsking] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('services').select('*').order('category').order('name');
    setLoaded(true);
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
    toast.show(draft.id ? 'Service updated' : 'Service added');
    setDraft(null); load();
  }

  // Group by category; hide retired ones unless unlocked
  const visible = items.filter((s) => unlocked || s.active);
  const groups = visible.reduce<Record<string, Service[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s); return acc;
  }, {});

  const addOrUnlock = () => (unlocked ? setDraft({ ...EMPTY }) : setAsking(true));

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}>
      <Button title={unlocked ? 'Add service' : 'Edit menu'} icon={unlocked ? 'add' : 'lock-closed-outline'}
        variant={unlocked ? 'outline' : 'primary'} onPress={addOrUnlock} />
      {loadError && <LoadError onRetry={load} />}
      {!loaded && !loadError && <SkeletonList count={3} />}

      {Object.entries(groups).map(([cat, list]) => (
        <View key={cat} style={{ gap: space.sm }}>
          <Heading style={{ marginTop: space.sm }}>{cat}</Heading>
          {list.map((s) => (
            <PressableScale key={s.id} disabled={!unlocked}
              onPress={() => setDraft({ id: s.id, name: s.name, category: s.category, price: String(s.price),
                duration_min: String(s.duration_min), active: s.active })}
              style={[st.row, !s.active && { opacity: 0.5 }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <BodyStrong>{s.name}{!s.active ? ' (retired)' : ''}</BodyStrong>
                <Label>{s.duration_min} min</Label>
              </View>
              <BodyStrong>{TTD(Number(s.price))}</BodyStrong>
            </PressableScale>
          ))}
        </View>
      ))}
      {loaded && visible.length === 0 && !loadError && (
        <EmptyState icon="list-outline" title="Your menu is empty" message="Add the services clients can book."
          actionLabel="Add service" onAction={addOrUnlock} />
      )}

      <PasscodePrompt visible={asking} onCancel={() => setAsking(false)}
        onSuccess={() => { setAsking(false); setUnlocked(true); }} />

      <Modal visible={!!draft} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDraft(null)}>
        {draft && (
          <Screen style={{ paddingTop: space.xl }}>
            <Title accessibilityRole="header">{draft.id ? 'Edit service' : 'New service'}</Title>
            <Field label="Name" required placeholder="e.g. Body sculpting session" value={draft.name}
              onChangeText={(name) => setDraft({ ...draft, name })} />
            <Field label="Category" placeholder="e.g. Body, Facials, Massage" hint="Services are grouped by this on the menu"
              value={draft.category} onChangeText={(category) => setDraft({ ...draft, category })} />
            <Field label="Price (TT$)" required placeholder="e.g. 350" keyboardType="decimal-pad" value={draft.price}
              onChangeText={(price) => setDraft({ ...draft, price })} />
            <Field label="Duration (minutes)" required placeholder="e.g. 45" keyboardType="number-pad"
              hint="Used to block out the calendar" value={draft.duration_min}
              onChangeText={(duration_min) => setDraft({ ...draft, duration_min })} />
            <View style={st.switchRow}>
              <BodyStrong>Available for booking</BodyStrong>
              <Switch value={draft.active} onValueChange={(active) => setDraft({ ...draft, active })}
                trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.surface}
                ios_backgroundColor={colors.border} accessibilityLabel="Available for booking" />
            </View>
            <Button title="Save" icon="checkmark" onPress={save} />
            <Button title="Cancel" variant="ghost" onPress={() => setDraft(null)} />
          </Screen>
        )}
      </Modal>
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, padding: space.lg,
    borderRadius: radius.lg, ...shadow.card },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.xs },
});

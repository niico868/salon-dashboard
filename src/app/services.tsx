import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Text } from '../components/AppText';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import LoadError from '../components/LoadError';
import PasscodePrompt from '../components/PasscodePrompt';
import Screen from '../components/Screen';
import { SkeletonList } from '../components/Skeleton';
import StatusChip from '../components/StatusChip';
import { useToast } from '../components/Toast';
import { Heading, Small } from '../components/Typography';
import { supabase } from '../lib/supabase';
import { TTD } from '../lib/money';
import { colors, fonts, radius, space } from '../lib/theme';
import type { Service } from '../lib/types';

type Draft = { id?: string; name: string; category: string; price: string; duration_min: string; active: boolean };
const EMPTY: Draft = { name: '', category: 'Hair', price: '', duration_min: '60', active: true };

export default function Services() {
  const toast = useToast();
  const [items, setItems] = useState<Service[] | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [asking, setAsking] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

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
    if (!draft.name.trim()) return Alert.alert('Name is required', 'For example "Silk press".');
    if (draft.price.trim() === '' || !(price >= 0)) return Alert.alert('Price must be a number', 'For example 350');
    if (!(duration > 0)) return Alert.alert('How long does it take?', 'Type the minutes, for example 45.');
    const row = { name: draft.name.trim(), category: draft.category.trim() || 'General', price,
      duration_min: duration, active: draft.active };
    setSaving(true);
    const { error } = draft.id
      ? await supabase.from('services').update(row).eq('id', draft.id)
      : await supabase.from('services').insert(row);
    setSaving(false);
    if (error) return Alert.alert('Save failed', error.message);
    toast.show(draft.id ? 'Service updated' : 'Service added');
    setDraft(null); load();
  }

  // Group by category; hide retired ones unless unlocked
  const visible = (items ?? []).filter((s) => unlocked || s.active);
  const groups = visible.reduce<Record<string, Service[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s); return acc;
  }, {});

  return (
    <Screen onRefresh={load}>
      {unlocked ? (
        <Card tone="soft">
          <View style={st.lockLine}>
            <Ionicons name="lock-open-outline" size={20} color={colors.primaryDeep} />
            <Text style={st.lockText}>Editing is on. Tap a service to change it.</Text>
          </View>
          <Button title="Add a service" icon="add-circle" onPress={() => setDraft({ ...EMPTY })} />
        </Card>
      ) : (
        <Button title="Edit menu and prices" icon="lock-closed-outline" variant="outline" onPress={() => setAsking(true)} />
      )}
      {loadError && <LoadError onRetry={load} />}
      {items === null && !loadError && <SkeletonList count={3} />}

      {Object.entries(groups).map(([cat, list]) => (
        <View key={cat} style={{ gap: space.sm }}>
          <Text style={st.cat}>{cat}</Text>
          {list.map((s) => (
            <Pressable key={s.id} disabled={!unlocked} accessibilityRole={unlocked ? 'button' : undefined}
              onPress={() => setDraft({ id: s.id, name: s.name, category: s.category, price: String(s.price),
                duration_min: String(s.duration_min), active: s.active })}
              style={[st.row, !s.active && { opacity: 0.55 }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.name}>{s.name}</Text>
                <Small>{s.duration_min} min</Small>
                {!s.active && <StatusChip status="cancelled" label="Not bookable" />}
              </View>
              <Text style={st.price}>{TTD(Number(s.price))}</Text>
              {unlocked && <Ionicons name="create-outline" size={20} color={colors.primary} />}
            </Pressable>
          ))}
        </View>
      ))}
      {items !== null && visible.length === 0 && !loadError && (
        <EmptyState icon="pricetags-outline" title="Your menu is empty"
          message="Tap Edit menu and prices to add your first service." />
      )}

      <PasscodePrompt visible={asking} onCancel={() => setAsking(false)}
        onSuccess={() => { setAsking(false); setUnlocked(true); }} />

      <Modal visible={!!draft} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDraft(null)}>
        {draft && (
          <Screen footer={
            <View style={{ gap: space.xs }}>
              <Button title="Save service" icon="checkmark-circle" size="lg" loading={saving} onPress={save} />
              <Button title="Cancel" variant="ghost" onPress={() => setDraft(null)} />
            </View>
          }>
            <Heading>{draft.id ? 'Edit service' : 'New service'}</Heading>
            <Field label="Name" required placeholder="e.g. Silk press" value={draft.name}
              onChangeText={(name) => setDraft({ ...draft, name })} />
            <Field label="Category" placeholder="e.g. Hair, Nails, Lashes" value={draft.category}
              onChangeText={(category) => setDraft({ ...draft, category })} hint="Services are grouped by this" />
            <Field label="Price (TT$)" required placeholder="e.g. 350" keyboardType="decimal-pad" value={draft.price}
              onChangeText={(price) => setDraft({ ...draft, price })} />
            <Field label="How long it takes (minutes)" required placeholder="e.g. 60" keyboardType="number-pad"
              value={draft.duration_min} onChangeText={(duration_min) => setDraft({ ...draft, duration_min })} />
            <View style={st.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={st.name}>Clients can book this</Text>
                <Small>Turn off to hide it without deleting it</Small>
              </View>
              <Switch value={draft.active} onValueChange={(active) => setDraft({ ...draft, active })}
                trackColor={{ true: colors.primary, false: colors.border }} />
            </View>
          </Screen>
        )}
      </Modal>
    </Screen>
  );
}

const st = StyleSheet.create({
  lockLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  lockText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.primaryDeep, flex: 1 },
  cat: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, padding: space.lg,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  name: { fontSize: 17, fontFamily: fonts.bodyBold },
  price: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.primary },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md, backgroundColor: colors.surface,
    padding: space.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
});

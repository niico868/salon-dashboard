import { format } from 'date-fns';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import Button from '../../components/Button';
import LoadError from '../../components/LoadError';
import PressableScale from '../../components/PressableScale';
import Screen from '../../components/Screen';
import { SkeletonList } from '../../components/Skeleton';
import StatusChip from '../../components/StatusChip';
import { useToast } from '../../components/Toast';
import { Body, BodyStrong, Heading, Label, Title } from '../../components/Typography';
import { shareAppointmentInvoice, shareClientStatement } from '../../lib/invoice';
import { TTD } from '../../lib/money';
import { waLink } from '../../lib/phone';
import { haptic } from '../../lib/motion';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, shadow, space, type } from '../../lib/theme';
import type { AppointmentBalance, Client } from '../../lib/types';

export default function ClientProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [c, setC] = useState<Client | null>(null);
  const [visits, setVisits] = useState<AppointmentBalance[]>([]);
  const [loadError, setLoadError] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    const [cr, vr] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('appointment_balances').select('*').eq('client_id', id).order('starts_at', { ascending: false }),
    ]);
    if (cr.error || vr.error) return setLoadError(true);
    setLoadError(false);
    setC(cr.data as Client);
    setVisits((vr.data as AppointmentBalance[]) ?? []);
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loadError) return <Screen><LoadError onRetry={load} /></Screen>;
  if (!c) return <Screen><SkeletonList count={4} /></Screen>;
  const done = visits.filter((v) => v.status === 'completed');
  const spent = visits.reduce((t, v) => t + Number(v.paid), 0);
  const owed = visits.filter((v) => v.status !== 'cancelled').reduce((t, v) => t + Math.max(0, Number(v.balance)), 0);

  async function remove() {
    haptic.warning();
    Alert.alert('Delete client?', 'This also deletes their appointments.', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) return Alert.alert('Delete failed', error.message);
        toast.show('Client deleted');
        router.back(); } },
    ]);
  }

  return (
    <Screen>
      <Title accessibilityRole="header">{c.full_name}</Title>
      <View style={s.actions}>
        {c.phone && <Button title="Call" icon="call-outline" variant="outline" style={s.act} onPress={() => Linking.openURL(`tel:${c.phone}`)} />}
        {c.phone && <Button title="WhatsApp" icon="logo-whatsapp" variant="outline" style={s.act} onPress={() => Linking.openURL(waLink(c.phone!))} />}
        <Button title="Edit" icon="create-outline" variant="outline" style={s.act} onPress={() => router.push(`/client/new?id=${id}`)} />
        {visits.length > 0 && <Button title="Statement PDF" icon="document-text-outline" variant="outline" style={s.act}
          onPress={() => shareClientStatement(c, visits)} />}
      </View>

      <View style={s.stats}>
        <Stat label="Visits" value={String(done.length)} />
        <Stat label="Spent" value={TTD(spent)} color={colors.success} />
        <Stat label="Owes" value={TTD(owed)} color={owed > 0 ? colors.warning : colors.text} />
      </View>

      {c.follow_up_date && (
        <View style={s.card}><Heading>Follow up {c.follow_up_date}</Heading>{c.follow_up_note ? <Body>{c.follow_up_note}</Body> : null}</View>
      )}
      {c.preferences && <View style={s.card}><Heading>Preferences</Heading><Body>{c.preferences}</Body></View>}
      {c.notes && <View style={s.card}><Heading>Notes</Heading><Body>{c.notes}</Body></View>}

      <Button title="Book appointment" icon="calendar-outline" onPress={() => router.push(`/appointment/new?clientId=${id}`)} />

      <Heading style={{ marginTop: space.sm }}>History</Heading>
      {visits.length === 0 && <Label>No visits yet.</Label>}
      {visits.map((v) => (
        <View key={v.id} style={[s.card, s.visit]}>
          <View style={{ flex: 1 }}>
            <PressableScale style={{ gap: space.xs }} onPress={() => router.push(`/appointment/${v.id}`)}>
              <BodyStrong>{v.service_name} · {TTD(Number(v.price))}</BodyStrong>
              <Label>{format(new Date(v.starts_at), 'EEE d MMM yyyy, h:mm a')}</Label>
              <View style={s.chips}>
                <StatusChip status={v.status} />
                {Number(v.balance) > 0 && v.status !== 'cancelled' && <StatusChip status="owes" label={`Owes ${TTD(Number(v.balance))}`} />}
              </View>
            </PressableScale>
          </View>
          {v.status !== 'cancelled' && (
            <Pressable onPress={() => shareAppointmentInvoice(v.id)} hitSlop={8} style={s.pdf} accessibilityRole="button">
              <Label style={s.pdfText}>Invoice</Label>
            </Pressable>
          )}
        </View>
      ))}
      <Button title="Delete client" icon="trash-outline" variant="danger" onPress={remove} style={{ marginTop: space.lg }} />
    </Screen>
  );
}

const Stat = ({ label, value, color = colors.text }: { label: string; value: string; color?: string }) => (
  <View style={s.stat}><Label>{label}</Label><Body style={[s.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Body></View>
);

const s = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  act: { minHeight: 40, paddingHorizontal: 14 },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.xs, ...shadow.card },
  statValue: { ...type.number, fontSize: 17 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.xs, ...shadow.card },
  visit: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  pdf: { paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: colors.blush },
  pdfText: { fontFamily: fonts.bodyBold, color: colors.primary },
});

import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import ActionPill from '../../components/ActionPill';
import { Text } from '../../components/AppText';
import Avatar from '../../components/Avatar';
import BookingChip from '../../components/BookingChip';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ListRow from '../../components/ListRow';
import LoadError from '../../components/LoadError';
import Screen from '../../components/Screen';
import SectionHeader from '../../components/SectionHeader';
import { SkeletonList } from '../../components/Skeleton';
import StatusChip from '../../components/StatusChip';
import { useToast } from '../../components/Toast';
import { Body, Small } from '../../components/Typography';
import { shareAppointmentInvoice, shareClientStatement } from '../../lib/invoice';
import { haptic } from '../../lib/motion';
import { TTD } from '../../lib/money';
import { waLink } from '../../lib/phone';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, space } from '../../lib/theme';
import type { AppointmentBalance, Client, ClientMessage, MessageKind } from '../../lib/types';

const MESSAGE_LABEL: Record<MessageKind, string> = {
  reminder_2d: 'Reminder (2 days before)', reminder_1d: 'Reminder (day before)', aftercare: 'Aftercare',
  checkin_1w: '1-week check-in', rebook_1m: 'Rebooking offer (1 month)', rebook_2m: 'Rebooking offer (2 months)', birthday: 'Birthday wishes',
};

export default function ClientProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [c, setC] = useState<Client | null>(null);
  const [visits, setVisits] = useState<AppointmentBalance[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [messages, setMessages] = useState<ClientMessage[]>([]);

  const load = useCallback(async () => {
    const [cr, vr] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('appointment_balances').select('*').eq('client_id', id).order('starts_at', { ascending: false }),
    ]);
    if (cr.error || vr.error) return setLoadError(true);
    setLoadError(false);
    setC(cr.data as Client);
    setVisits((vr.data as AppointmentBalance[]) ?? []);
    // Automatic emails sent to this client. Quietly empty until supabase/sql/client-messages.sql has been run.
    const mr = await supabase.from('client_messages').select('id, kind, channel, status, error, created_at')
      .eq('client_id', id).order('created_at', { ascending: false }).limit(10);
    setMessages(mr.error ? [] : (mr.data as ClientMessage[]));
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loadError) return <Screen><LoadError onRetry={load} /></Screen>;
  if (!c) return <Screen><SkeletonList count={3} /></Screen>;
  const done = visits.filter((v) => v.status === 'completed');
  const spent = visits.reduce((t, v) => t + Number(v.paid), 0);
  const owed = visits.filter((v) => v.status !== 'cancelled').reduce((t, v) => t + Math.max(0, Number(v.balance)), 0);
  const now = Date.now();
  const upcoming = visits.filter((v) => v.status === 'booked' && new Date(v.starts_at).getTime() >= now).reverse();
  const past = visits.filter((v) => !upcoming.includes(v));

  function remove() {
    haptic.warning();
    Alert.alert(`Delete ${c!.full_name}?`, 'This also deletes all their appointments and cannot be undone.', [
      { text: 'Keep client', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) return Alert.alert('Delete failed', error.message);
        toast.show('Client deleted');
        router.back(); } },
    ]);
  }

  return (
    <Screen onRefresh={load}>
      <Card style={{ alignItems: 'center', gap: space.sm }}>
        <Avatar name={c.full_name} size={72} />
        <Text style={s.name}>{c.full_name}</Text>
        {c.phone ? <Body style={{ color: colors.textSoft }}>{c.phone}</Body> : null}
        {c.email ? <Small>{c.email}</Small> : null}
        <View style={s.actions}>
          {c.phone && <ActionPill label="Call" icon="call" onPress={() => Linking.openURL(`tel:${c.phone}`)} />}
          {c.phone && <ActionPill label="WhatsApp" icon="logo-whatsapp" tone="whatsapp" onPress={() => Linking.openURL(waLink(c.phone!))} />}
          <ActionPill label="Edit" icon="create-outline" onPress={() => router.push(`/client/new?id=${id}`)} />
        </View>
      </Card>

      <Button title={`Book ${c.full_name.split(' ')[0]} in`} icon="add-circle" size="lg"
        onPress={() => router.push(`/appointment/new?clientId=${id}`)} />

      <View style={s.stats}>
        <Stat label="Visits" value={String(done.length)} />
        <Stat label="Spent" value={TTD(spent)} />
        <Stat label="Owes" value={TTD(owed)} color={owed > 0 ? colors.primary : undefined} />
      </View>

      {c.follow_up_date && (
        <Card tone="soft">
          <View style={s.noteHead}>
            <Ionicons name="alarm-outline" size={20} color={colors.primary} />
            <Text style={s.noteTitle}>Follow up on {format(new Date(c.follow_up_date + 'T12:00'), 'EEEE d MMMM')}</Text>
          </View>
          {c.follow_up_note ? <Body>{c.follow_up_note}</Body> : null}
        </Card>
      )}
      {(c.preferences || c.notes || c.birthday) && (
        <Card>
          {c.birthday && (
            <View style={s.noteBlock}>
              <Small>Birthday</Small>
              <Body>🎂 {format(new Date(c.birthday + 'T12:00'), 'd MMMM')}</Body>
            </View>
          )}
          {c.preferences && <View style={s.noteBlock}><Small>Preferences</Small><Body>{c.preferences}</Body></View>}
          {c.notes && <View style={s.noteBlock}><Small>Notes</Small><Body>{c.notes}</Body></View>}
        </Card>
      )}

      {upcoming.length > 0 && <SectionHeader title="Coming up" count={upcoming.length} />}
      {upcoming.map((v) => (
        <ListRow key={v.id} title={v.service_name} subtitle={format(new Date(v.starts_at), 'EEEE d MMM, h:mm a')}
          right={<StatusChip status="booked" />} accent={colors.primary}
          onPress={() => router.push(`/appointment/${v.id}`)} />
      ))}

      <SectionHeader title="Past visits" actionLabel={visits.length > 0 ? 'Statement' : undefined}
        onAction={() => shareClientStatement(c, visits)} />
      {past.length === 0 && <Body style={{ color: colors.textMuted }}>No past visits yet.</Body>}
      {past.map((v) => (
        <View key={v.id} style={s.visit}>
          <Pressable style={{ flex: 1, gap: 4 }} onPress={() => router.push(`/appointment/${v.id}`)} accessibilityRole="button">
            <Text style={s.visitTitle}>{v.service_name} · {TTD(Number(v.price))}</Text>
            <Small>{format(new Date(v.starts_at), 'EEE d MMM yyyy, h:mm a')}</Small>
            {v.status === 'completed' && Number(v.balance) <= 0 ? <StatusChip status="completed" /> : <BookingChip a={v} />}
          </Pressable>
          {v.status !== 'cancelled' && (
            <Pressable onPress={() => shareAppointmentInvoice(v.id)} hitSlop={8} style={s.pdf}
              accessibilityRole="button" accessibilityLabel="Invoice">
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <Text style={s.pdfText}>Invoice</Text>
            </Pressable>
          )}
        </View>
      ))}

      {messages.length > 0 && <SectionHeader title="Automatic emails" count={messages.length} />}
      {messages.map((m) => (
        <ListRow key={m.id} title={MESSAGE_LABEL[m.kind] ?? m.kind}
          subtitle={`${format(new Date(m.created_at), 'd MMM yyyy, h:mm a')} · ${m.status === 'failed' ? `Not delivered: ${m.error ?? 'error'}` : m.status === 'test' ? 'Test send' : 'Sent'}`}
          accent={m.status === 'failed' ? colors.danger : undefined} />
      ))}
      {!!c.email && (c.emails_off
        ? <Small>Unsubscribed from emails.</Small>
        : c.marketing_opt_in === false && <Small>Gets reminders and aftercare. Offers and birthday emails are off.</Small>)}

      <Button title="Delete client" icon="trash-outline" variant="ghost" onPress={remove} style={{ marginTop: space.xl }} />
    </Screen>
  );
}

const Stat = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <View style={s.stat}>
    <Small>{label}</Small>
    <Text style={[s.statValue, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  name: { fontFamily: fonts.title, fontSize: 26, lineHeight: 32, textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center', marginTop: space.xs },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: 2, borderWidth: 1, borderColor: colors.border },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 17 },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  noteTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.primaryDeep, flex: 1 },
  noteBlock: { gap: 2 },
  visit: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: space.lg, borderWidth: 1, borderColor: colors.border },
  visitTitle: { fontFamily: fonts.bodyBold, fontSize: 17 },
  pdf: { alignItems: 'center', gap: 2, padding: 8, borderRadius: radius.md, backgroundColor: colors.blush, minWidth: 64 },
  pdfText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 13 },
});

import { Ionicons } from '@expo/vector-icons';
import { addMinutes, differenceInMinutes, format } from 'date-fns';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import ActionPill from '../../components/ActionPill';
import { Text } from '../../components/AppText';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Card from '../../components/Card';
import DateTimeField from '../../components/DateTimeField';
import LoadError from '../../components/LoadError';
import Screen from '../../components/Screen';
import { SkeletonList } from '../../components/Skeleton';
import StatusChip from '../../components/StatusChip';
import { useToast } from '../../components/Toast';
import { Body, Heading, Small } from '../../components/Typography';
import { shareAppointmentInvoice } from '../../lib/invoice';
import { haptic } from '../../lib/motion';
import { TTD } from '../../lib/money';
import { cancelAppointmentReminder, scheduleAppointmentReminder } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import { colors, fonts, space } from '../../lib/theme';
import type { AppointmentBalance, AppointmentStatus, Payment } from '../../lib/types';

const METHOD: Record<string, string> = { cash: 'Cash', card: 'Card', transfer: 'Bank transfer', online: 'Online link' };
const DONE_MESSAGE: Record<AppointmentStatus, string> = {
  completed: 'Marked as done', no_show: 'Marked as no-show', cancelled: 'Booking cancelled', booked: 'Back to booked',
};

export default function AppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [a, setA] = useState<AppointmentBalance | null>(null);
  const [pays, setPays] = useState<Payment[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [moving, setMoving] = useState(false);

  const load = useCallback(async () => {
    const [ar, pr] = await Promise.all([
      supabase.from('appointment_balances').select('*').eq('id', id).single(),
      supabase.from('payments').select('*').eq('appointment_id', id).order('created_at'),
    ]);
    if (ar.error || pr.error) return setLoadError(true);
    setLoadError(false);
    setA(ar.data as AppointmentBalance);
    setPays((pr.data as Payment[]) ?? []);
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loadError) return <Screen><LoadError onRetry={load} /></Screen>;
  if (!a) return <Screen><SkeletonList count={2} /></Screen>;

  async function setStatus(status: AppointmentStatus) {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (error) return Alert.alert('Update failed', error.message);
    if (status !== 'booked') await cancelAppointmentReminder(id);
    toast.show(DONE_MESSAGE[status]);
    load();
  }
  async function reschedule(newStart: Date) {
    const len = differenceInMinutes(new Date(a!.ends_at), new Date(a!.starts_at));
    const { error } = await supabase.from('appointments').update({ starts_at: newStart.toISOString(),
      ends_at: addMinutes(newStart, len).toISOString() }).eq('id', id);
    if (error) return Alert.alert('Reschedule failed', error.message);
    await cancelAppointmentReminder(id);
    await scheduleAppointmentReminder(id, a!.client_name, a!.service_name, newStart);
    toast.show('Rescheduled');
    load();
  }
  async function markPaid(paymentId: string) {
    const { error } = await supabase.from('payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', paymentId);
    if (error) return Alert.alert('Update failed', error.message);
    toast.show('Payment marked as paid');
    load();
  }

  const start = new Date(a.starts_at), end = new Date(a.ends_at);
  const balance = Math.max(0, Number(a.balance));
  const open = a.status === 'booked';
  const chip = a.status === 'booked' ? <StatusChip status="booked" />
    : a.status === 'completed' ? <StatusChip status="completed" />
    : <StatusChip status={a.status} />;

  return (
    <Screen>
      <Card>
        <View style={s.head}>
          <Avatar name={a.client_name} size={52} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.name}>{a.client_name}</Text>
            <Body style={{ color: colors.textSoft }}>{a.service_name}</Body>
          </View>
          {chip}
        </View>
        <View style={s.when}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Body style={{ flex: 1 }}>{format(start, 'EEEE d MMMM yyyy')}</Body>
        </View>
        <View style={s.when}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <Body style={{ flex: 1 }}>{format(start, 'h:mm a')} to {format(end, 'h:mm a')}</Body>
        </View>
        {!!a.notes && (
          <View style={s.when}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Body style={{ flex: 1 }}>{a.notes}</Body>
          </View>
        )}
        <View style={s.actions}>
          <ActionPill label="View client" icon="person" onPress={() => router.push(`/client/${a.client_id}`)} />
          {open && <ActionPill label={moving ? 'Close' : 'Change time'} icon="swap-horizontal"
            onPress={() => setMoving(!moving)} />}
        </View>
        {open && moving && (
          <View style={{ gap: space.xs }}>
            <Small>Pick the new date and time. It saves as soon as you change it.</Small>
            <DateTimeField value={start} onChange={reschedule} />
          </View>
        )}
      </Card>

      <Card>
        <Heading>Payment</Heading>
        <View style={s.moneyRow}><Body>Price</Body><Body style={s.bold}>{TTD(Number(a.price))}</Body></View>
        <View style={s.moneyRow}><Body>Paid so far</Body><Body style={[s.bold, { color: colors.success }]}>{TTD(Number(a.paid))}</Body></View>
        <View style={[s.moneyRow, s.balanceRow]}>
          <Text style={s.balanceLabel}>Still owes</Text>
          <Text style={[s.balance, { color: balance > 0 ? colors.primary : colors.success }]}>
            {balance > 0 ? TTD(balance) : 'Nothing'}
          </Text>
        </View>
        {pays.length > 0 && <Small style={{ marginTop: space.sm }}>Payments</Small>}
        {pays.map((p) => (
          <View key={p.id} style={s.payment}>
            <View style={{ flex: 1 }}>
              <Body>{TTD(Number(p.amount))} · {METHOD[p.method] ?? p.method}</Body>
              <Small>{p.paid_at ? format(new Date(p.paid_at), 'd MMM yyyy') : 'Waiting for client to pay'}</Small>
            </View>
            {p.status === 'pending' ? (
              <View style={{ gap: space.xs, alignItems: 'flex-end' }}>
                <ActionPill label="Mark paid" icon="checkmark" tone="success" onPress={() => markPaid(p.id)} />
                {p.payment_url && <ActionPill label="Resend link" icon="share-outline"
                  onPress={() => Share.share({ message: `Your payment link: ${p.payment_url}` })} />}
              </View>
            ) : <StatusChip status={p.status === 'paid' ? 'paid' : 'cancelled'} label={p.status === 'paid' ? 'Paid' : p.status} />}
          </View>
        ))}
        {balance > 0 && a.status !== 'cancelled' && (
          <Button title={`Take payment (${TTD(balance)})`} icon="cash-outline" size="lg"
            onPress={() => router.push(`/payment/new?appointmentId=${id}`)} style={{ marginTop: space.sm }} />
        )}
        {a.status !== 'cancelled' && (
          <Button title="Share invoice (PDF)" icon="document-text-outline" variant="outline"
            onPress={() => shareAppointmentInvoice(a.id)} />
        )}
      </Card>

      {open ? (
        <Card>
          <Heading>How did it go?</Heading>
          <Button title="Mark as done" icon="checkmark-circle" variant="success" size="lg" onPress={() => setStatus('completed')} />
          <View style={s.twoUp}>
            <Button title="Didn't show up" icon="person-remove-outline" variant="outline" style={{ flex: 1 }}
              onPress={() => setStatus('no_show')} />
            <Button title="Cancel booking" icon="close-circle-outline" variant="danger" style={{ flex: 1 }} onPress={() => {
              haptic.warning();
              Alert.alert('Cancel this booking?', `${a.client_name} · ${format(start, 'EEE d MMM, h:mm a')}`, [
                { text: 'Keep it', style: 'cancel' },
                { text: 'Cancel booking', style: 'destructive', onPress: () => setStatus('cancelled') },
              ]);
            }} />
          </View>
        </Card>
      ) : (
        <Button title="Undo: put back to booked" icon="arrow-undo-outline" variant="ghost" onPress={() => setStatus('booked')} />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xs },
  name: { fontFamily: fonts.title, fontSize: 22, lineHeight: 28 },
  when: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bold: { fontFamily: fonts.bodyBold },
  balanceRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm, marginTop: space.xs },
  balanceLabel: { fontFamily: fonts.bodyBold, fontSize: 18 },
  balance: { fontFamily: fonts.title, fontSize: 24 },
  payment: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  twoUp: { flexDirection: 'row', gap: space.sm },
});

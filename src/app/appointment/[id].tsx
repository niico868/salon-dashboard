import { addMinutes, differenceInMinutes, format } from 'date-fns';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import Button from '../../components/Button';
import DateTimeField from '../../components/DateTimeField';
import LoadError from '../../components/LoadError';
import Screen from '../../components/Screen';
import { SkeletonList } from '../../components/Skeleton';
import StatusChip from '../../components/StatusChip';
import { useToast } from '../../components/Toast';
import { Body, BodyStrong, Heading, Label, Title } from '../../components/Typography';
import { shareAppointmentInvoice } from '../../lib/invoice';
import { TTD } from '../../lib/money';
import { cancelAppointmentReminder, scheduleAppointmentReminder } from '../../lib/notifications';
import { haptic } from '../../lib/motion';
import { supabase } from '../../lib/supabase';
import { colors, radius, shadow, space } from '../../lib/theme';
import type { AppointmentBalance, AppointmentStatus, Payment } from '../../lib/types';

export default function AppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [a, setA] = useState<AppointmentBalance | null>(null);
  const [pays, setPays] = useState<Payment[]>([]);
  const [loadError, setLoadError] = useState(false);
  const toast = useToast();

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
  if (!a) return <Screen><SkeletonList count={3} /></Screen>;

  async function setStatus(status: AppointmentStatus) {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (error) return Alert.alert('Update failed', error.message);
    if (status !== 'booked') await cancelAppointmentReminder(id);
    toast.show(STATUS_TOAST[status]);
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
    toast.show('Payment recorded');
    load();
  }

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <Title accessibilityRole="header">{a.client_name}</Title>
        <Body style={{ color: colors.textMuted }}>{a.service_name} · {TTD(Number(a.price))}</Body>
        <StatusChip status={a.status} />
      </View>
      {a.status === 'booked' && (
        <View style={{ gap: 6 }}>
          <Label>Date and time (change to reschedule)</Label>
          <DateTimeField value={new Date(a.starts_at)} onChange={reschedule} />
        </View>
      )}
      {a.status !== 'booked' && <Body>{format(new Date(a.starts_at), 'EEE d MMM yyyy, h:mm a')}</Body>}

      <View style={s.card}>
        <Heading>Payments</Heading>
        <View style={s.line}><Label>Paid</Label><Body>{TTD(Number(a.paid))}</Body></View>
        <View style={s.line}><Label>Balance</Label><BodyStrong style={Number(a.balance) > 0 ? { color: colors.warning } : undefined}>
          {TTD(Math.max(0, Number(a.balance)))}</BodyStrong></View>
        {pays.map((p) => (
          <View key={p.id} style={s.pay}>
            <View style={{ flex: 1, gap: space.xs }}>
              <Body style={{ textTransform: 'capitalize' }}>{p.method} · {TTD(Number(p.amount))}</Body>
              {p.status === 'paid' || p.status === 'pending'
                ? <StatusChip status={p.status} />
                : <StatusChip status="cancelled" label={p.status === 'failed' ? 'Failed' : 'Refunded'} />}
            </View>
            {p.status === 'pending' && (
              <View style={{ alignItems: 'flex-end' }}>
                <Button title="Mark paid" variant="ghost" onPress={() => markPaid(p.id)} />
                {p.payment_url && (
                  <Button title="Resend" variant="ghost" icon="share-outline"
                    onPress={() => Share.share({ message: `Your payment link: ${p.payment_url}` })} />
                )}
              </View>
            )}
          </View>
        ))}
        {a.status !== 'cancelled' && (
          <Button title="Invoice PDF" icon="document-text-outline" variant="outline" onPress={() => shareAppointmentInvoice(a.id)}
            style={{ marginTop: space.sm }} />
        )}
      </View>

      {Number(a.balance) > 0 && a.status !== 'cancelled' && (
        <Button title="Take payment" icon="cash-outline" onPress={() => router.push(`/payment/new?appointmentId=${id}`)} />
      )}

      {a.status === 'booked' && (
        <View style={s.row}>
          <Button title="Done" icon="checkmark" variant="outline" style={{ flex: 1 }} onPress={() => setStatus('completed')} />
          <Button title="No-show" variant="outline" style={{ flex: 1 }} onPress={() => setStatus('no_show')} />
          <Button title="Cancel" variant="danger" style={{ flex: 1 }} onPress={() => {
            haptic.warning();
            Alert.alert('Cancel appointment?', '', [{ text: 'Keep' }, { text: 'Cancel it', style: 'destructive', onPress: () => setStatus('cancelled') }]);
          }} />
        </View>
      )}
      {a.status !== 'booked' && (
        <Button title="Undo (back to booked)" icon="arrow-undo-outline" variant="ghost" onPress={() => setStatus('booked')} />
      )}
      <Button title="View client" icon="person-outline" variant="ghost" onPress={() => router.push(`/client/${a.client_id}`)} />
    </Screen>
  );
}

const STATUS_TOAST: Record<AppointmentStatus, string> = {
  completed: 'Marked as done',
  no_show: 'Marked as no-show',
  cancelled: 'Appointment cancelled',
  booked: 'Back to booked',
};

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm, ...shadow.card },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pay: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  row: { flexDirection: 'row', gap: space.sm },
});

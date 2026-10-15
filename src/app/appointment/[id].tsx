import { addMinutes, differenceInMinutes, format } from 'date-fns';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimeField from '../../components/DateTimeField';
import Screen from '../../components/Screen';
import { TTD } from '../../lib/money';
import { cancelAppointmentReminder, scheduleAppointmentReminder } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import type { AppointmentBalance, AppointmentStatus, Payment } from '../../lib/types';

export default function AppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [a, setA] = useState<AppointmentBalance | null>(null);
  const [pays, setPays] = useState<Payment[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from('appointment_balances').select('*').eq('id', id).single();
    setA(data as AppointmentBalance);
    const { data: p } = await supabase.from('payments').select('*').eq('appointment_id', id).order('created_at');
    setPays((p as Payment[]) ?? []);
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!a) return null;

  async function setStatus(status: AppointmentStatus) {
    await supabase.from('appointments').update({ status }).eq('id', id);
    if (status !== 'booked') await cancelAppointmentReminder(id);
    load();
  }
  async function reschedule(newStart: Date) {
    const len = differenceInMinutes(new Date(a!.ends_at), new Date(a!.starts_at));
    await supabase.from('appointments').update({ starts_at: newStart.toISOString(),
      ends_at: addMinutes(newStart, len).toISOString() }).eq('id', id);
    await cancelAppointmentReminder(id);
    await scheduleAppointmentReminder(id, a!.client_name, a!.service_name, newStart);
    load();
  }

  return (
    <Screen>
      <Text style={s.title}>{a.client_name}</Text>
      <Text style={s.sub}>{a.service_name} · {TTD(Number(a.price))} · {a.status}</Text>
      {a.status === 'booked' && <DateTimeField value={new Date(a.starts_at)} onChange={reschedule} />}
      {a.status !== 'booked' && <Text>{format(new Date(a.starts_at), 'EEE d MMM yyyy, h:mm a')}</Text>}

      <View style={s.card}>
        <Text>Paid: {TTD(Number(a.paid))}</Text>
        <Text style={{ fontWeight: '700' }}>Balance: {TTD(Math.max(0, Number(a.balance)))}</Text>
        {pays.map((p) => (
  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Text style={[s.sub, { flex: 1 }]}>{p.method} · {TTD(Number(p.amount))} · {p.status}</Text>
    {p.status === 'pending' && (
      <>
        <Pressable onPress={async () => {
          await supabase.from('payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', p.id);
          load();
        }}><Text style={{ color: '#2E7D32', fontWeight: '600' }}>Mark paid</Text></Pressable>
        {p.payment_url && (
          <Pressable onPress={() => Share.share({ message: `Your payment link: ${p.payment_url}` })}>
            <Text style={{ color: '#C2185B' }}>Resend</Text></Pressable>
        )}
      </>
    )}
  </View>
))}
      </View>

      {Number(a.balance) > 0 && a.status !== 'cancelled' && (
        <Pressable style={s.btn} onPress={() => router.push(`/payment/new?appointmentId=${id}`)}>
          <Text style={s.btnText}>Take payment</Text>
        </Pressable>
      )}

      {a.status === 'booked' && (
        <View style={s.row}>
          <Pressable style={[s.small, { backgroundColor: '#2E7D32' }]} onPress={() => setStatus('completed')}><Text style={s.btnText}>Done</Text></Pressable>
          <Pressable style={[s.small, { backgroundColor: '#757575' }]} onPress={() => setStatus('no_show')}><Text style={s.btnText}>No-show</Text></Pressable>
          <Pressable style={[s.small, { backgroundColor: '#B00020' }]} onPress={() =>
            Alert.alert('Cancel appointment?', '', [{ text: 'Keep' }, { text: 'Cancel it', style: 'destructive', onPress: () => setStatus('cancelled') }])}>
            <Text style={s.btnText}>Cancel</Text></Pressable>
        </View>
      )}
      {a.status !== 'booked' && (
        <Pressable onPress={() => setStatus('booked')}><Text style={{ color: '#C2185B', textAlign: 'center' }}>Undo (back to booked)</Text></Pressable>
      )}
      <Pressable onPress={() => router.push(`/client/${a.client_id}`)}><Text style={{ color: '#C2185B', textAlign: 'center' }}>View client</Text></Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700' },
  sub: { color: '#777' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 4 },
  btn: { backgroundColor: '#C2185B', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8 },
  small: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
});
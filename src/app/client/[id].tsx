import { format } from 'date-fns';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import LoadError from '../../components/LoadError';
import Screen from '../../components/Screen';
import { shareAppointmentInvoice, shareClientStatement } from '../../lib/invoice';
import { TTD } from '../../lib/money';
import { waLink } from '../../lib/phone';
import { supabase } from '../../lib/supabase';
import type { AppointmentBalance, Client } from '../../lib/types';

export default function ClientProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [c, setC] = useState<Client | null>(null);
  const [visits, setVisits] = useState<AppointmentBalance[]>([]);
  const [loadError, setLoadError] = useState(false);

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
  if (!c) return null;
  const done = visits.filter((v) => v.status === 'completed');
  const spent = visits.reduce((t, v) => t + Number(v.paid), 0);
  const owed = visits.filter((v) => v.status !== 'cancelled').reduce((t, v) => t + Math.max(0, Number(v.balance)), 0);

  async function remove() {
    Alert.alert('Delete client?', 'This also deletes their appointments.', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) return Alert.alert('Delete failed', error.message);
        router.back(); } },
    ]);
  }

  return (
    <Screen>
      <Text style={s.name}>{c.full_name}</Text>
      <View style={s.actions}>
        {c.phone && <Pressable style={s.act} onPress={() => Linking.openURL(`tel:${c.phone}`)}><Text>Call</Text></Pressable>}
        {c.phone && <Pressable style={s.act} onPress={() => Linking.openURL(waLink(c.phone!))}><Text>WhatsApp</Text></Pressable>}
        <Pressable style={s.act} onPress={() => router.push(`/client/new?id=${id}`)}><Text>Edit</Text></Pressable>
        {visits.length > 0 && <Pressable style={s.act} onPress={() => shareClientStatement(c, visits)}><Text>Statement PDF</Text></Pressable>}
      </View>

      <View style={s.stats}>
        <Stat label="Visits" value={String(done.length)} />
        <Stat label="Spent" value={TTD(spent)} />
        <Stat label="Owes" value={TTD(owed)} />
      </View>

      {c.follow_up_date && (
        <View style={s.card}><Text style={s.h}>Follow up {c.follow_up_date}</Text><Text>{c.follow_up_note}</Text></View>
      )}
      {c.preferences && <View style={s.card}><Text style={s.h}>Preferences</Text><Text>{c.preferences}</Text></View>}
      {c.notes && <View style={s.card}><Text style={s.h}>Notes</Text><Text>{c.notes}</Text></View>}

      <Pressable style={s.btn} onPress={() => router.push(`/appointment/new?clientId=${id}`)}>
        <Text style={s.btnText}>Book appointment</Text>
      </Pressable>

      <Text style={s.h}>History</Text>
      {visits.map((v) => (
        <View key={v.id} style={[s.card, s.visit]}>
          <Pressable style={{ flex: 1, gap: 4 }} onPress={() => router.push(`/appointment/${v.id}`)}>
            <Text style={{ fontWeight: '500' }}>{v.service_name} · {TTD(Number(v.price))}</Text>
            <Text style={{ color: '#777' }}>{format(new Date(v.starts_at), 'EEE d MMM yyyy, h:mm a')} · {v.status}
              {Number(v.balance) > 0 && v.status !== 'cancelled' ? ` · owes ${TTD(Number(v.balance))}` : ''}</Text>
          </Pressable>
          {v.status !== 'cancelled' && (
            <Pressable onPress={() => shareAppointmentInvoice(v.id)} hitSlop={8}><Text style={s.pdf}>Invoice</Text></Pressable>
          )}
        </View>
      ))}
      <Pressable onPress={remove}><Text style={{ color: '#B00020', textAlign: 'center', padding: 12 }}>Delete client</Text></Pressable>
    </Screen>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={s.stat}><Text style={{ color: '#777' }}>{label}</Text><Text style={{ fontWeight: '700', fontSize: 16 }}>{value}</Text></View>
);

const s = StyleSheet.create({
  name: { fontSize: 24, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  act: { backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#eee' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 12, gap: 4 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 4 },
  h: { fontWeight: '700', fontSize: 16 },
  visit: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pdf: { color: '#C2185B', fontWeight: '600' },
  btn: { backgroundColor: '#C2185B', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '600' },
});
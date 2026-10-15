import { format } from 'date-fns';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import { TTD } from '../../lib/money';
import { supabase } from '../../lib/supabase';
import type { AppointmentBalance, Client } from '../../lib/types';

// "868 555 1234" -> "18685551234" for WhatsApp links
const waNumber = (p: string) => { const d = p.replace(/\D/g, ''); return d.length === 7 ? '1868' + d : d.length === 10 ? '1' + d : d; };

export default function ClientProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [c, setC] = useState<Client | null>(null);
  const [visits, setVisits] = useState<AppointmentBalance[]>([]);

  useFocusEffect(useCallback(() => {
    supabase.from('clients').select('*').eq('id', id).single().then(({ data }) => setC(data as Client));
    supabase.from('appointment_balances').select('*').eq('client_id', id).order('starts_at', { ascending: false })
      .then(({ data }) => setVisits((data as AppointmentBalance[]) ?? []));
  }, [id]));

  if (!c) return null;
  const done = visits.filter((v) => v.status === 'completed');
  const spent = visits.reduce((t, v) => t + Number(v.paid), 0);
  const owed = visits.filter((v) => v.status !== 'cancelled').reduce((t, v) => t + Math.max(0, Number(v.balance)), 0);

  async function remove() {
    Alert.alert('Delete client?', 'This also deletes their appointments.', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('clients').delete().eq('id', id); router.back(); } },
    ]);
  }

  return (
    <Screen>
      <Text style={s.name}>{c.full_name}</Text>
      <View style={s.actions}>
        {c.phone && <Pressable style={s.act} onPress={() => Linking.openURL(`tel:${c.phone}`)}><Text>Call</Text></Pressable>}
        {c.phone && <Pressable style={s.act} onPress={() => Linking.openURL(`https://wa.me/${waNumber(c.phone!)}`)}><Text>WhatsApp</Text></Pressable>}
        <Pressable style={s.act} onPress={() => router.push(`/client/new?id=${id}`)}><Text>Edit</Text></Pressable>
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
        <Pressable key={v.id} style={s.card} onPress={() => router.push(`/appointment/${v.id}`)}>
          <Text style={{ fontWeight: '500' }}>{v.service_name} · {TTD(Number(v.price))}</Text>
          <Text style={{ color: '#777' }}>{format(new Date(v.starts_at), 'EEE d MMM yyyy, h:mm a')} · {v.status}
            {Number(v.balance) > 0 && v.status !== 'cancelled' ? ` · owes ${TTD(Number(v.balance))}` : ''}</Text>
        </Pressable>
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
  actions: { flexDirection: 'row', gap: 8 },
  act: { backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#eee' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 12, gap: 4 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 4 },
  h: { fontWeight: '700', fontSize: 16 },
  btn: { backgroundColor: '#C2185B', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '600' },
});
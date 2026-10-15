import { addMinutes, setHours } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimeField from '../../components/DateTimeField';
import LoadError from '../../components/LoadError';
import Screen from '../../components/Screen';
import { TTD } from '../../lib/money';
import { scheduleAppointmentReminder } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import type { Client, Service } from '../../lib/types';

export default function BookAppointment() {
  const { clientId, date } = useLocalSearchParams<{ clientId?: string; date?: string }>();
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientQ, setClientQ] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [start, setStart] = useState(() => setHours(date ? new Date(date + 'T00:00') : new Date(), 10));
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      supabase.from('services').select('*').eq('active', true).order('name'),
      supabase.from('clients').select('*').order('full_name'),
    ]).then(([sv, cl]) => {
      if (sv.error || cl.error) return setLoadError(true);
      setLoadError(false);
      setServices((sv.data as Service[]) ?? []);
      const list = (cl.data as Client[]) ?? []; setClients(list);
      if (clientId) setClient(list.find((c) => c.id === clientId) ?? null);
    });
  }, [clientId]);
  useEffect(load, [load]);

  async function save() {
    if (!client || !service) return Alert.alert('Pick a client and a service');
    const end = addMinutes(start, service.duration_min);
    // Overlap check: any booked appointment that starts before this ends and ends after this starts
    const { data: clash, error: clashError } = await supabase.from('appointments').select('id, service_name, starts_at')
      .eq('status', 'booked').lt('starts_at', end.toISOString()).gt('ends_at', start.toISOString());
    if (clashError) return Alert.alert("Couldn't check for overlaps", clashError.message);
    const go = async () => {
      const { data, error } = await supabase.from('appointments').insert({
        client_id: client.id, service_id: service.id, service_name: service.name,
        price: price ? Number(price) : service.price,
        starts_at: start.toISOString(), ends_at: end.toISOString(), notes: notes || null,
      }).select().single();
      if (error) return Alert.alert('Save failed', error.message);
      await scheduleAppointmentReminder(data.id, client.full_name, service.name, start);
      router.back();
    };
    if (clash && clash.length) {
      Alert.alert('Overlaps another booking', 'Book anyway?', [{ text: 'Cancel' }, { text: 'Book anyway', onPress: go }]);
    } else go();
  }

  const matches = clientQ ? clients.filter((c) => c.full_name.toLowerCase().includes(clientQ.toLowerCase())).slice(0, 5) : [];

  return (
    <Screen>
      {loadError && <LoadError onRetry={load} />}
      <Text style={s.h}>Client</Text>
      {client ? (
        <Pressable style={s.picked} onPress={() => setClient(null)}><Text>{client.full_name}  ✕</Text></Pressable>
      ) : (
        <>
          <TextInput style={s.in} placeholder="Type a client's name" value={clientQ} onChangeText={setClientQ} />
          {matches.map((c) => (
            <Pressable key={c.id} style={s.opt} onPress={() => { setClient(c); setClientQ(''); }}><Text>{c.full_name}</Text></Pressable>
          ))}
          <Pressable onPress={() => router.push('/client/new')}><Text style={s.link}>+ New client</Text></Pressable>
        </>
      )}

      <Text style={s.h}>Service</Text>
      <View style={s.wrap}>
        {services.map((sv) => (
          <Pressable key={sv.id} onPress={() => { setService(sv); setPrice(''); }}
            style={[s.chip, service?.id === sv.id && s.chipOn]}>
            <Text style={service?.id === sv.id ? { color: 'white' } : undefined}>{sv.name} · {TTD(Number(sv.price))}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.h}>Date and time</Text>
      <DateTimeField value={start} onChange={setStart} />

      <TextInput style={s.in} keyboardType="decimal-pad" value={price} onChangeText={setPrice}
        placeholder={service ? `Price (default ${TTD(Number(service.price))})` : 'Price'} />
      <TextInput style={s.in} placeholder="Notes" value={notes} onChangeText={setNotes} />
      <Pressable style={s.btn} onPress={save}><Text style={s.btnText}>Book</Text></Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  h: { fontWeight: '700', fontSize: 16, marginTop: 4 },
  in: { backgroundColor: 'white', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#eee' },
  opt: { backgroundColor: 'white', padding: 12, borderRadius: 8 },
  picked: { backgroundColor: '#F8BBD0', padding: 12, borderRadius: 10 },
  link: { color: '#C2185B', padding: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: 'white', borderWidth: 1, borderColor: '#C2185B', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: '#C2185B' },
  btn: { backgroundColor: '#C2185B', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: 'white', fontWeight: '600' },
});
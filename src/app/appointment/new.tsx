import { addMinutes, setHours, setMinutes } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import DateTimeField from '../../components/DateTimeField';
import Field from '../../components/Field';
import LoadError from '../../components/LoadError';
import PressableScale from '../../components/PressableScale';
import Screen from '../../components/Screen';
import { useToast } from '../../components/Toast';
import { Body, BodyStrong, Heading, Label } from '../../components/Typography';
import { TTD } from '../../lib/money';
import { scheduleAppointmentReminder } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, shadow, space, touch } from '../../lib/theme';
import type { Client, Service } from '../../lib/types';

export default function BookAppointment() {
  const { clientId, date, time } = useLocalSearchParams<{ clientId?: string; date?: string; time?: string }>();
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientQ, setClientQ] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [start, setStart] = useState(() => {
    // `time` ("14:30") comes from tapping an empty slot in the calendar's day view
    const [h, m] = /^\d{1,2}:\d{2}$/.test(time ?? '') ? time!.split(':').map(Number) : [10, 0];
    return setMinutes(setHours(date ? new Date(date + 'T00:00') : new Date(), h), m);
  });
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [loadError, setLoadError] = useState(false);
  const toast = useToast();

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
      toast.show('Appointment booked');
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
      <Heading>Client <Text style={{ color: colors.primary }}>*</Text></Heading>
      {client ? (
        <PressableScale style={s.picked} onPress={() => setClient(null)} accessibilityLabel={`Change client, ${client.full_name}`}>
          <Ionicons name="person" size={18} color={colors.primary} />
          <BodyStrong style={{ flex: 1 }}>{client.full_name}</BodyStrong>
          <Ionicons name="close-circle" size={20} color={colors.primary} />
        </PressableScale>
      ) : (
        <>
          <Field label="Find client" placeholder="e.g. Aaliyah" hint="Type part of their name, then tap them below"
            value={clientQ} onChangeText={setClientQ} />
          {matches.map((c) => (
            <PressableScale key={c.id} style={s.opt} onPress={() => { setClient(c); setClientQ(''); }}>
              <Body>{c.full_name}</Body>
            </PressableScale>
          ))}
          {clientQ !== '' && matches.length === 0 && <Label>No client with that name.</Label>}
          <Button title="New client" icon="person-add-outline" variant="ghost" style={{ alignSelf: 'flex-start' }}
            onPress={() => router.push('/client/new')} />
        </>
      )}

      <Heading>Service <Text style={{ color: colors.primary }}>*</Text></Heading>
      <View style={s.wrap}>
        {services.map((sv) => {
          const on = service?.id === sv.id;
          return (
            <Pressable key={sv.id} onPress={() => { setService(sv); setPrice(''); }}
              style={[s.chip, on && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Text style={[s.chipText, on && s.chipTextOn]}>{sv.name} · {TTD(Number(sv.price))}</Text>
            </Pressable>
          );
        })}
      </View>

      <Heading>Date and time</Heading>
      <DateTimeField value={start} onChange={setStart} />

      <Field label="Price (TT$)" keyboardType="decimal-pad" value={price} onChangeText={setPrice}
        placeholder={service ? `e.g. ${Number(service.price)}` : 'e.g. 350'}
        hint={service ? `Leave blank to use the menu price, ${TTD(Number(service.price))}` : 'Leave blank to use the menu price'} />
      <Field label="Notes" placeholder="e.g. Wants a shorter session today" value={notes} onChangeText={setNotes} />
      <Button title="Book" icon="calendar" onPress={save} style={{ marginTop: space.sm }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  opt: { backgroundColor: colors.surface, padding: space.md, borderRadius: radius.lg, ...shadow.card },
  picked: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.blush,
    padding: space.md, borderRadius: radius.md, minHeight: touch.min + 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { minHeight: touch.min - 4, justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  chipTextOn: { fontFamily: fonts.bodyBold, color: colors.textOnPrimary },
});

import { Ionicons } from '@expo/vector-icons';
import { addMinutes, format, setHours, setMinutes } from 'date-fns';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../components/AppText';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Card from '../../components/Card';
import DateTimeField from '../../components/DateTimeField';
import Field from '../../components/Field';
import LoadError from '../../components/LoadError';
import Screen from '../../components/Screen';
import { useToast } from '../../components/Toast';
import { Body, Small } from '../../components/Typography';
import { haptic } from '../../lib/motion';
import { TTD } from '../../lib/money';
import { scheduleAppointmentReminder } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, space, touch } from '../../lib/theme';
import type { Client, Service } from '../../lib/types';

const length = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <View style={s.stepHead}>
        <View style={[s.stepNum, done && { backgroundColor: colors.success }]}>
          {done ? <Ionicons name="checkmark" size={18} color={colors.textOnPrimary} />
            : <Text style={s.stepNumText}>{n}</Text>}
        </View>
        <Text style={s.stepTitle}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

export default function BookAppointment() {
  const { clientId, date, time } = useLocalSearchParams<{ clientId?: string; date?: string; time?: string }>();
  const toast = useToast();
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
  const [saving, setSaving] = useState(false);

  // Reloads when coming back from "New client", so the person just added can be picked
  const load = useCallback(() => {
    Promise.all([
      supabase.from('services').select('*').eq('active', true).order('category').order('name'),
      supabase.from('clients').select('*').order('full_name'),
    ]).then(([sv, cl]) => {
      if (sv.error || cl.error) return setLoadError(true);
      setLoadError(false);
      setServices((sv.data as Service[]) ?? []);
      const list = (cl.data as Client[]) ?? []; setClients(list);
      if (clientId) setClient((c) => c ?? list.find((x) => x.id === clientId) ?? null);
    });
  }, [clientId]);
  useFocusEffect(load);

  async function save() {
    if (!client) return Alert.alert('Who is the booking for?', 'Pick a client in step 1.');
    if (!service) return Alert.alert('Which service?', 'Pick a service in step 2.');
    if (price && !(Number(price) >= 0)) return Alert.alert('Price must be a number', 'For example 350');
    setSaving(true);
    try {
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
        haptic.warning();
        Alert.alert('This time overlaps another booking',
          `Already booked: ${clash[0].service_name} at ${format(new Date(clash[0].starts_at), 'h:mm a')}. Book anyway?`,
          [{ text: 'Go back', style: 'cancel' }, { text: 'Book anyway', onPress: go }]);
      } else await go();
    } finally {
      setSaving(false);
    }
  }

  const matches = clientQ.trim()
    ? clients.filter((c) => c.full_name.toLowerCase().includes(clientQ.trim().toLowerCase())
      || (c.phone ?? '').replace(/\D/g, '').includes(clientQ.replace(/\D/g, '') || '§')).slice(0, 6)
    : [];
  const groups = services.reduce<Record<string, Service[]>>((acc, sv) => { (acc[sv.category] ??= []).push(sv); return acc; }, {});

  const summary = client && service
    ? `${client.full_name.split(' ')[0]} · ${service.name} · ${format(start, 'EEE d MMM, h:mm a')}`
    : null;

  return (
    <Screen footer={
      <View style={{ gap: space.xs }}>
        {summary && <Small style={{ textAlign: 'center' }}>{summary}</Small>}
        <Button title="Book appointment" icon="checkmark-circle" size="lg" loading={saving} onPress={save} />
      </View>
    }>
      {loadError && <LoadError onRetry={load} />}

      <Step n={1} title="Who is it for?" done={!!client}>
        {client ? (
          <View style={s.picked}>
            <Avatar name={client.full_name} />
            <View style={{ flex: 1 }}>
              <Text style={s.pickedName}>{client.full_name}</Text>
              {client.phone ? <Small>{client.phone}</Small> : null}
            </View>
            <Pressable onPress={() => setClient(null)} hitSlop={10} accessibilityRole="button">
              <Text style={s.link}>Change</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={s.search}>
              <Ionicons name="search" size={20} color={colors.textMuted} />
              <TextInput style={s.searchInput} placeholder="Type their name or phone" value={clientQ} onChangeText={setClientQ}
                placeholderTextColor={colors.placeholder} accessibilityLabel="Find client" autoFocus={!clientId} />
            </View>
            {matches.map((c) => (
              <Pressable key={c.id} style={s.opt} onPress={() => { haptic.tap(); setClient(c); setClientQ(''); }} accessibilityRole="button">
                <Avatar name={c.full_name} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17 }}>{c.full_name}</Text>
                  {c.phone ? <Small>{c.phone}</Small> : null}
                </View>
              </Pressable>
            ))}
            {clientQ.trim() !== '' && matches.length === 0 && <Small>No client found with that name.</Small>}
            <Button title="New client" icon="person-add" variant="outline"
              onPress={() => router.push(clientQ.trim() ? { pathname: '/client/new', params: { name: clientQ.trim() } } : '/client/new')} />
          </>
        )}
      </Step>

      <Step n={2} title="Which service?" done={!!service}>
        {services.length === 0 && !loadError && <Small>No services yet. Add them in More → Service menu.</Small>}
        {Object.entries(groups).map(([cat, list]) => (
          <View key={cat} style={{ gap: space.sm }}>
            {Object.keys(groups).length > 1 && <Text style={s.cat}>{cat}</Text>}
            {list.map((sv) => {
              const on = service?.id === sv.id;
              return (
                <Pressable key={sv.id} onPress={() => { haptic.tap(); setService(sv); setPrice(''); }}
                  style={[s.service, on && s.serviceOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.primary : colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.serviceName}>{sv.name}</Text>
                    <Small>{length(sv.duration_min)}</Small>
                  </View>
                  <Text style={s.servicePrice}>{TTD(Number(sv.price))}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Step>

      <Step n={3} title="When?">
        <DateTimeField value={start} onChange={setStart} />
        {service && <Small>Ends at {format(addMinutes(start, service.duration_min), 'h:mm a')}</Small>}
      </Step>

      <Step n={4} title="Anything else? (optional)">
        <Field label="Price" keyboardType="decimal-pad" value={price} onChangeText={setPrice}
          placeholder={service ? `${Number(service.price)}` : 'e.g. 350'}
          hint={service ? `Leave empty to charge the usual ${TTD(Number(service.price))}` : 'Leave empty to use the menu price'} />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="e.g. Wants a lighter shade this time" />
      </Step>
      <Body style={{ color: colors.textMuted, textAlign: 'center' }}>Check the details, then tap Book appointment below.</Body>
    </Screen>
  );
}

const s = StyleSheet.create({
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs },
  stepNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: colors.textOnPrimary, fontFamily: fonts.bodyBold, fontSize: 16 },
  stepTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.background, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, minHeight: touch.min + 4 },
  searchInput: { flex: 1, fontSize: 17, paddingVertical: 10, fontFamily: fonts.body },
  opt: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md,
    backgroundColor: colors.background, minHeight: touch.min + 8 },
  picked: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.blush },
  pickedName: { fontFamily: fonts.bodyBold, fontSize: 18 },
  link: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 16 },
  cat: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: space.xs },
  service: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, minHeight: touch.min + 12 },
  serviceOn: { borderColor: colors.primary, backgroundColor: colors.blush },
  serviceName: { fontFamily: fonts.bodyBold, fontSize: 17 },
  servicePrice: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primary },
});

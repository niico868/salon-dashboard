import { Ionicons } from '@expo/vector-icons';
import { addMinutes, format, setHours, setMinutes } from 'date-fns';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../components/AppText';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Field from '../../components/Field';
import LoadError from '../../components/LoadError';
import Screen from '../../components/Screen';
import TimeSlotPicker from '../../components/TimeSlotPicker';
import { useToast } from '../../components/Toast';
import { Body, Small } from '../../components/Typography';
import { confirmBookingTime } from '../../lib/bookingChecks';
import { nextOpenSlot, outsideHoursMessage } from '../../lib/hours';
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
  const [serviceQ, setServiceQ] = useState('');
  const [recent, setRecent] = useState<string[]>([]);   // names of recently booked services
  const [showExtras, setShowExtras] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [start, setStart] = useState(() => {
    // `time` ("14:30") comes from tapping an empty slot in the calendar's day view
    // With nothing chosen yet, start at the next time the spa is open
    if (!date && !time) return nextOpenSlot(new Date());
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
      supabase.from('appointments').select('service_name').order('created_at', { ascending: false }).limit(30),
    ]).then(([sv, cl, rc]) => {
      if (sv.error || cl.error) return setLoadError(true);
      setLoadError(false);
      setServices((sv.data as Service[]) ?? []);
      setRecent([...new Set((rc.data ?? []).map((a) => a.service_name.toLowerCase()))]);
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
      if (!await confirmBookingTime(start, end, 'Book anyway')) return;
      const { data, error } = await supabase.from('appointments').insert({
        client_id: client.id, service_id: service.id, service_name: service.name,
        price: price ? Number(price) : service.price,
        starts_at: start.toISOString(), ends_at: end.toISOString(), notes: notes || null,
      }).select().single();
      if (error) return Alert.alert('Save failed', error.message);
      await scheduleAppointmentReminder(data.id, client.full_name, service.name, start);
      toast.show('Appointment booked');
      router.back();
    } finally {
      setSaving(false);
    }
  }

  const matches = clientQ.trim()
    ? clients.filter((c) => c.full_name.toLowerCase().includes(clientQ.trim().toLowerCase())
      || (c.phone ?? '').replace(/\D/g, '').includes(clientQ.replace(/\D/g, '') || '§')).slice(0, 6)
    : [];
  const closedWarning = outsideHoursMessage(start, addMinutes(start, service?.duration_min ?? 0));
  const term = serviceQ.trim().toLowerCase();
  const shown = term ? services.filter((sv) => sv.name.toLowerCase().includes(term)) : services;
  const recentServices = term ? [] : recent.map((r) => services.find((sv) => sv.name.toLowerCase() === r)).filter((sv): sv is Service => !!sv).slice(0, 3);
  const groups = shown.reduce<Record<string, Service[]>>((acc, sv) => { (acc[sv.category] ??= []).push(sv); return acc; }, {});
  const hasNoMenuPrice = !!service && Number(service.price) <= 0;
  const serviceOption = (sv: Service, keyPrefix: string) => (
    <Pressable key={keyPrefix + sv.id} onPress={() => { haptic.tap(); setService(sv); setPrice(''); setServiceQ(''); }}
      style={s.service} accessibilityRole="radio" accessibilityState={{ checked: false }}>
      <Ionicons name="radio-button-off" size={22} color={colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={s.serviceName}>{sv.name}</Text>
        <Small>{length(sv.duration_min)}</Small>
      </View>
      <Text style={s.servicePrice}>{Number(sv.price) > 0 ? TTD(Number(sv.price)) : 'Price needed'}</Text>
    </Pressable>
  );

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
        {service ? (
          <View style={s.picked}>
            <View style={{ flex: 1 }}>
              <Text style={s.pickedName}>{service.name}</Text>
              <Small>{length(service.duration_min)} · {Number(service.price) > 0 ? TTD(Number(service.price)) : 'Price needed'}</Small>
            </View>
            <Pressable onPress={() => setService(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Change service">
              <Text style={s.link}>Change</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {services.length === 0 && !loadError && <Small>No services yet. Add them in More → Service menu.</Small>}
            {services.length > 0 && (
              <View style={s.search}>
                <Ionicons name="search" size={20} color={colors.textMuted} />
                <TextInput style={s.searchInput} placeholder="Find a service" value={serviceQ} onChangeText={setServiceQ}
                  placeholderTextColor={colors.placeholder} accessibilityLabel="Find a service" />
              </View>
            )}
            {term !== '' && shown.length === 0 && <Small>No service found with that name.</Small>}
            {recentServices.length > 0 && (
              <View style={{ gap: space.sm }}>
                <Text style={s.cat}>Recently booked</Text>
                {recentServices.map((sv) => serviceOption(sv, 'recent-'))}
              </View>
            )}
            {Object.entries(groups).map(([cat, list]) => (
              <View key={cat} style={{ gap: space.sm }}>
                {Object.keys(groups).length > 1 && <Text style={s.cat}>{cat}</Text>}
                {list.map((sv) => serviceOption(sv, ''))}
              </View>
            ))}
          </>
        )}
      </Step>

      <Step n={3} title="When?">
        <TimeSlotPicker value={start} onChange={setStart} durationMin={service?.duration_min ?? 0} avoidTaken />
        {service && <Small>Ends at {format(addMinutes(start, service.duration_min), 'h:mm a')}</Small>}
        {!!closedWarning && <Small style={s.warning}>{closedWarning}</Small>}
      </Step>

      {showExtras || hasNoMenuPrice ? (
      <Step n={4} title="Anything else? (optional)">
        <Field label="Price" keyboardType="decimal-pad" value={price} onChangeText={setPrice}
          placeholder={service && Number(service.price) > 0 ? `${Number(service.price)}` : 'e.g. 350'}
          hint={!service ? 'Leave empty to use the menu price'
            : Number(service.price) > 0 ? `Leave empty to charge the usual ${TTD(Number(service.price))}`
            : 'This service has no menu price. Enter one here, or add it later.'} />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="e.g. Prefers morning appointments" />
      </Step>
      ) : (
        <Pressable onPress={() => setShowExtras(true)} style={s.extras} accessibilityRole="button">
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={s.link}>Add a different price or notes</Text>
        </Pressable>
      )}
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
  extras: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, minHeight: touch.min },
  warning: { color: colors.warning, fontFamily: fonts.bodyBold },
  link: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 16 },
  cat: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: space.xs },
  service: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, minHeight: touch.min + 12 },
  serviceName: { fontFamily: fonts.bodyBold, fontSize: 17 },
  servicePrice: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primary },
});

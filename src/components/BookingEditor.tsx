import { Ionicons } from '@expo/vector-icons';
import { addMinutes } from 'date-fns';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Button from './Button';
import Field from './Field';
import { useToast } from './Toast';
import { Small } from './Typography';
import { confirmBookingTime } from '../lib/bookingChecks';
import { TTD } from '../lib/money';
import { cancelAppointmentReminder, scheduleAppointmentReminder } from '../lib/notifications';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius, space, touch } from '../lib/theme';
import type { AppointmentBalance, Service } from '../lib/types';

const CONFIRM_WORDS = 'MELT AWAYS';

type Props = { booking: AppointmentBalance; visible: boolean; onClose: () => void; onSaved: () => void };

// Change a booking's service, price and notes. Saving needs MELT AWAYS typed, so nothing changes by accident.
export default function BookingEditor({ booking: b, visible, onClose, onSaved }: Props) {
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [service, setService] = useState<Service | null>(null);
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [typed, setTyped] = useState('');
  const [saving, setSaving] = useState(false);

  // Start from the booking as it is now, each time the editor opens
  useEffect(() => {
    if (!visible) return;
    setService(null);
    setPrice(Number(b.price) > 0 ? String(Number(b.price)) : '');
    setNotes(b.notes ?? '');
    setTyped('');
    supabase.from('services').select('*').eq('active', true).order('category').order('name').then(({ data, error }) => {
      if (error) Alert.alert("Couldn't load the service menu", error.message);
      else setServices((data as Service[]) ?? []);
    });
  }, [visible, b.price, b.notes]);

  const paid = Number(b.paid);
  const newPrice = price.trim() === '' ? NaN : Number(price);
  const priceOk = Number.isFinite(newPrice) && newPrice > 0 && newPrice >= paid;
  const priceError = price.trim() === '' ? undefined
    : !(Number.isFinite(newPrice) && newPrice > 0) ? 'Enter an amount, for example 350'
    : newPrice < paid ? `Must be at least ${TTD(paid)}, which is already paid` : undefined;
  const currentName = service?.name ?? b.service_name;
  const changes = [
    service && service.name !== b.service_name ? `Service: ${b.service_name} to ${service.name}` : null,
    priceOk && newPrice !== Number(b.price) ? `Price: ${TTD(Number(b.price))} to ${TTD(newPrice)}` : null,
    notes.trim() !== (b.notes ?? '').trim() ? 'Notes changed' : null,
  ].filter((c): c is string => !!c);
  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORDS;

  async function save() {
    setSaving(true);
    try {
      const start = new Date(b.starts_at);
      const serviceChanged = !!service && service.name !== b.service_name;
      const end = serviceChanged ? addMinutes(start, service.duration_min) : new Date(b.ends_at);
      if (serviceChanged && b.status === 'booked' && !await confirmBookingTime(start, end, 'Save anyway', b.id)) return;
      const { error } = await supabase.from('appointments').update({
        price: newPrice, notes: notes.trim() || null,
        ...(serviceChanged ? { service_id: service.id, service_name: service.name, ends_at: end.toISOString() } : {}),
      }).eq('id', b.id);
      if (error) return Alert.alert('Save failed', error.message);
      if (serviceChanged && b.status === 'booked') {
        await cancelAppointmentReminder(b.id);
        await scheduleAppointmentReminder(b.id, b.client_name, service.name, start);
      }
      toast.show('Booking updated');
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Edit booking</Text>
          <Pressable onPress={onClose} hitSlop={10} style={s.close} accessibilityRole="button" accessibilityLabel="Close without saving">
            <Ionicons name="close" size={28} color={colors.primary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Text style={s.section}>Service</Text>
          {services.map((sv) => {
            const on = sv.name.toLowerCase() === currentName.toLowerCase();
            return (
              <Pressable key={sv.id} style={[s.service, on && s.serviceOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}
                onPress={() => { setService(sv); if (Number(sv.price) > 0) setPrice(String(Number(sv.price))); }}>
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.primary : colors.textMuted} />
                <Text style={s.serviceName}>{sv.name}</Text>
                <Text style={s.servicePrice}>{Number(sv.price) > 0 ? TTD(Number(sv.price)) : 'Price needed'}</Text>
              </Pressable>
            );
          })}

          <Field label="Price (TT$)" required keyboardType="decimal-pad" value={price} onChangeText={setPrice}
            placeholder="e.g. 350" error={priceError} />
          <Field label="Notes" multiline value={notes} onChangeText={setNotes} placeholder="e.g. Prefers morning appointments" />

          <View style={s.confirm}>
            <Text style={s.section}>Confirm the changes</Text>
            {changes.length === 0 ? <Small>Nothing has changed yet.</Small> : changes.map((c) => <Small key={c}>{c}</Small>)}
            <Field label={`Type ${CONFIRM_WORDS} to save`} value={typed} onChangeText={setTyped}
              autoCapitalize="characters" autoCorrect={false} placeholder={CONFIRM_WORDS} />
          </View>
          <Button title="Save changes" icon="checkmark-circle" size="lg" loading={saving}
            disabled={!confirmed || !priceOk || changes.length === 0} onPress={save} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.lg },
  title: { fontFamily: fonts.title, fontSize: 24, color: colors.text },
  close: { minWidth: touch.min, minHeight: touch.min, alignItems: 'flex-end', justifyContent: 'center' },
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  section: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  service: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, minHeight: touch.min + 8 },
  serviceOn: { borderColor: colors.primary, backgroundColor: colors.blush },
  serviceName: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 17 },
  servicePrice: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  confirm: { gap: space.sm, backgroundColor: colors.cream, borderRadius: radius.lg, padding: space.lg },
});

import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import Field from '../../components/Field';
import LoadError from '../../components/LoadError';
import Screen from '../../components/Screen';
import { useToast } from '../../components/Toast';
import { BodyStrong, Label } from '../../components/Typography';
import { TTD } from '../../lib/money';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, shadow, space, touch } from '../../lib/theme';
import type { AppointmentBalance, Payment } from '../../lib/types';

const METHODS: Payment['method'][] = ['cash', 'card', 'transfer', 'online'];

export default function NewPayment() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const [appt, setAppt] = useState<AppointmentBalance | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<Payment['method']>('cash');
  const [reference, setReference] = useState('');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [loadError, setLoadError] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    if (!appointmentId) return;
    supabase.from('appointment_balances').select('*').eq('id', appointmentId).single().then(({ data, error }) => {
      if (error) return setLoadError(true);
      setLoadError(false);
      const a = data as AppointmentBalance; setAppt(a);
      setAmount(String(Math.max(0, Number(a.balance))));
    });
  }, [appointmentId]);
  useEffect(load, [load]);

  // Without the appointment, a save here would record a payment not linked to it
  if (loadError) return <Screen><LoadError onRetry={load} /></Screen>;

  async function save() {
    const value = Number(amount);
    if (!(value > 0)) return Alert.alert('Enter an amount');
    const online = method === 'online';
    if (online && !link.trim()) return Alert.alert('Paste the payment link');
    const { error } = await supabase.from('payments').insert({
      appointment_id: appt?.id ?? null, client_id: appt?.client_id ?? null,
      amount: value, method,
      status: online ? 'pending' : 'paid',          // online stays pending until the client pays
      paid_at: online ? null : new Date().toISOString(),
      reference: reference || null, payment_url: online ? link.trim() : null, note: note || null,
    });
    if (error) return Alert.alert('Save failed', error.message);
    if (online) {
      await Share.share({ message:
        `Hi${appt ? ' ' + appt.client_name.split(' ')[0] : ''}, here's your payment link for ${TTD(value)}: ${link.trim()}` });
    }
    toast.show(online ? 'Payment link saved' : 'Payment recorded');
    router.back();
  }

  return (
    <Screen>
      {appt && (
        <View style={s.card}>
          <BodyStrong>{appt.client_name}</BodyStrong>
          <Label>{appt.service_name} · balance {TTD(Number(appt.balance))}</Label>
        </View>
      )}
      <Field label="Amount (TT$)" required keyboardType="decimal-pad" value={amount} onChangeText={setAmount}
        placeholder="e.g. 350.00" style={s.big} />
      <View style={{ gap: 6 }}>
        <Label style={{ color: colors.text, fontSize: 14 }}>Paid by</Label>
        <View style={s.row}>
          {METHODS.map((m) => (
            <Pressable key={m} style={[s.chip, method === m && s.on]} onPress={() => setMethod(m)}
              accessibilityRole="button" accessibilityState={{ selected: method === m }}>
              <Text style={[s.chipText, method === m && s.chipTextOn]}>{m}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {method === 'online' ? (
        <Field label="Payment link" required placeholder="e.g. https://pay.wipay.co.tt/abc123" autoCapitalize="none"
          keyboardType="url" hint="Saved as pending until the client pays. You'll be asked to share it next."
          value={link} onChangeText={setLink} />
      ) : (
        <Field label="Reference" placeholder="e.g. Receipt 0042 or bank ref" hint="Optional"
          value={reference} onChangeText={setReference} />
      )}
      <Field label="Note" placeholder="e.g. Includes TT$50 tip" value={note} onChangeText={setNote} />
      <Button title={method === 'online' ? 'Save and share link' : 'Record payment'}
        icon={method === 'online' ? 'share-outline' : 'cash-outline'} onPress={save} style={{ marginTop: space.sm }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: 2, ...shadow.card },
  big: { fontFamily: fonts.title, fontSize: 32, textAlign: 'center', paddingVertical: space.lg },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  chip: { minHeight: touch.min - 4, justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.pill, paddingHorizontal: 16, backgroundColor: colors.surface },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text, textTransform: 'capitalize' },
  chipTextOn: { fontFamily: fonts.bodyBold, color: colors.textOnPrimary },
});

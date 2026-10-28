import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../components/AppText';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Field from '../../components/Field';
import LoadError from '../../components/LoadError';
import Screen from '../../components/Screen';
import { useToast } from '../../components/Toast';
import { Body, Heading, Small } from '../../components/Typography';
import { haptic } from '../../lib/motion';
import { TTD } from '../../lib/money';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, space } from '../../lib/theme';
import type { AppointmentBalance, Payment } from '../../lib/types';

type Icon = keyof typeof Ionicons.glyphMap;
const METHODS: { value: Payment['method']; label: string; icon: Icon }[] = [
  { value: 'cash', label: 'Cash', icon: 'cash-outline' },
  { value: 'card', label: 'Card', icon: 'card-outline' },
  { value: 'transfer', label: 'Bank transfer', icon: 'business-outline' },
  { value: 'online', label: 'Payment link', icon: 'link-outline' },
];

export default function NewPayment() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const toast = useToast();
  const [appt, setAppt] = useState<AppointmentBalance | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<Payment['method']>('cash');
  const [reference, setReference] = useState('');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const online = method === 'online';
  const value = Number(amount);

  async function save() {
    if (!(value > 0)) return Alert.alert('How much was paid?', 'Type the amount, for example 350.');
    if (online && !link.trim()) return Alert.alert('Paste the payment link', 'Copy the link from your payment app and paste it in the box.');
    setSaving(true);
    try {
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen footer={
      <Button title={online ? 'Save and send link' : value > 0 ? `Record ${TTD(value)} payment` : 'Record payment'}
        icon={online ? 'share-outline' : 'checkmark-circle'} size="lg" loading={saving} onPress={save} />
    }>
      {appt && (
        <Card tone="soft">
          <Text style={s.who}>{appt.client_name}</Text>
          <Body>{appt.service_name}</Body>
          <Small>Still owes {TTD(Math.max(0, Number(appt.balance)))} of {TTD(Number(appt.price))}</Small>
        </Card>
      )}

      <Card>
        <Heading>Amount paid</Heading>
        <View style={s.amountBox}>
          <Text style={s.currency}>TT$</Text>
          <TextInput style={s.amount} keyboardType="decimal-pad" value={amount} onChangeText={setAmount}
            placeholder="0.00" placeholderTextColor={colors.placeholder} accessibilityLabel="Amount paid in TT dollars" selectTextOnFocus />
        </View>
        {appt && Number(appt.balance) > 0 && value > 0 && value < Number(appt.balance) && (
          <Small>This is a part payment. {TTD(Number(appt.balance) - value)} will still be owed.</Small>
        )}
      </Card>

      <Card>
        <Heading>How did they pay?</Heading>
        <View style={s.methods}>
          {METHODS.map((m) => {
            const on = method === m.value;
            return (
              <Pressable key={m.value} onPress={() => { haptic.tap(); setMethod(m.value); }}
                style={[s.method, on && s.methodOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                <Ionicons name={m.icon} size={26} color={on ? colors.textOnPrimary : colors.primary} />
                <Text style={[s.methodText, on && { color: colors.textOnPrimary }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {online ? (
          <Field label="Payment link" placeholder="Paste the link here" autoCapitalize="none" value={link} onChangeText={setLink}
            hint="The payment stays as 'waiting' until you mark it paid." />
        ) : (
          <Field label="Receipt or bank reference (optional)" placeholder="e.g. Ref 48213" value={reference} onChangeText={setReference} />
        )}
        <Field label="Note (optional)" placeholder="e.g. Includes TT$50 tip" value={note} onChangeText={setNote} />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  who: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.primaryDeep },
  amountBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: colors.background,
    borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, paddingVertical: space.md, paddingHorizontal: space.lg },
  currency: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.textMuted },
  amount: { flex: 1, fontFamily: fonts.title, fontSize: 38, color: colors.text, textAlign: 'center', minWidth: 120 },
  methods: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  method: { flexGrow: 1, flexBasis: '45%', alignItems: 'center', gap: 6, paddingVertical: space.md, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  methodOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  methodText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
});

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import Screen from '../../components/Screen';
import { TTD } from '../../lib/money';
import { supabase } from '../../lib/supabase';
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

  useEffect(() => {
    if (!appointmentId) return;
    supabase.from('appointment_balances').select('*').eq('id', appointmentId).single().then(({ data }) => {
      const a = data as AppointmentBalance; setAppt(a);
      setAmount(String(Math.max(0, Number(a.balance))));
    });
  }, [appointmentId]);

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
    router.back();
  }

  return (
    <Screen>
      {appt && <Text style={s.sub}>{appt.client_name} · {appt.service_name} · balance {TTD(Number(appt.balance))}</Text>}
      <TextInput style={s.big} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0.00" />
      <View style={s.row}>
        {METHODS.map((m) => (
          <Pressable key={m} style={[s.chip, method === m && s.on]} onPress={() => setMethod(m)}>
            <Text style={method === m ? { color: 'white' } : undefined}>{m}</Text>
          </Pressable>
        ))}
      </View>
      {method === 'online' ? (
        <TextInput style={s.in} placeholder="Paste payment link" autoCapitalize="none" value={link} onChangeText={setLink} />
      ) : (
        <TextInput style={s.in} placeholder="Reference (receipt or bank ref, optional)" value={reference} onChangeText={setReference} />
      )}
      <TextInput style={s.in} placeholder="Note (e.g. tip, product sale)" value={note} onChangeText={setNote} />
      <Pressable style={s.btn} onPress={save}>
        <Text style={s.btnText}>{method === 'online' ? 'Save and share link' : 'Record payment'}</Text>
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  sub: { color: '#777' },
  big: { fontSize: 36, fontWeight: '700', textAlign: 'center', backgroundColor: 'white', borderRadius: 12, padding: 16 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#C2185B', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'white' },
  on: { backgroundColor: '#C2185B' },
  in: { backgroundColor: 'white', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#eee' },
  btn: { backgroundColor: '#C2185B', borderRadius: 10, padding: 16, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '600' },
});
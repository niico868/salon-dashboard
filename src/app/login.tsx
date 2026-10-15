import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) Alert.alert('Login failed', error.message);
  }

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Salon Dashboard</Text>
      <TextInput style={s.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address"
        value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Pressable style={[s.btn, busy && { opacity: 0.5 }]} disabled={busy} onPress={signIn}>
        <Text style={s.btnText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#FFF7FA' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 24, color: '#C2185B' },
  input: { backgroundColor: 'white', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#eee' },
  btn: { backgroundColor: '#C2185B', borderRadius: 10, padding: 16, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '600', fontSize: 16 },
});

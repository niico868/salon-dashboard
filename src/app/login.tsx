import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { supabase } from '../lib/supabase';
import { C, F } from '../lib/theme';

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
    <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.inner}>
        <Image source={require('../../assets/images/melt-aways-logo.png')} style={s.logo} contentFit="contain"
          accessibilityLabel="Melt Aways" />
        <Text style={s.title}>Melt Aways Spa Dashboard</Text>
        <TextInput style={s.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address"
          autoComplete="email" value={email} onChangeText={setEmail} />
        <TextInput style={s.input} placeholder="Password" secureTextEntry autoComplete="password"
          value={password} onChangeText={setPassword} onSubmitEditing={signIn} />
        <Pressable style={({ pressed }) => [s.btn, (busy || pressed) && { opacity: busy ? 0.5 : 0.85 }]}
          disabled={busy} onPress={signIn}>
          <Text style={s.btnText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', backgroundColor: C.bg },
  inner: { padding: 24, gap: 12, width: '100%', maxWidth: 420, alignSelf: 'center' },
  logo: { width: 240, height: 142, alignSelf: 'center', marginBottom: 4 },
  title: { fontFamily: F.title, fontSize: 24, textAlign: 'center', marginBottom: 20, color: C.primary },
  input: { backgroundColor: 'white', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, fontSize: 16 },
  btn: { backgroundColor: C.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
});

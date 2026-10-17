import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { brand, colors, space } from '../lib/theme';
import Logo from '../components/Logo';
import Field from '../components/Field';
import Button from '../components/Button';
import FadeInView from '../components/FadeInView';
import { Small, Title } from '../components/Typography';

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
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FadeInView style={s.logo}>
        <Logo width={220} />
        <Title style={s.appName} accessibilityRole="header">{brand.appName}</Title>
      </FadeInView>
      <FadeInView index={1} style={s.card}>
        <Field label="Email" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address"
          autoComplete="email" value={email} onChangeText={setEmail} />
        <Field label="Password" placeholder="Your password" secureTextEntry autoComplete="password"
          value={password} onChangeText={setPassword} onSubmitEditing={signIn} />
        <Button title="Sign in" onPress={signIn} loading={busy} style={{ marginTop: space.sm }} />
      </FadeInView>
      <View style={{ alignItems: 'center' }}><Small style={{ fontStyle: 'italic' }}>{brand.tagline}</Small></View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.xl, backgroundColor: colors.background },
  logo: { alignItems: 'center', gap: space.md },
  appName: { fontSize: 24, textAlign: 'center', color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: space.xl, gap: space.lg,
    shadowColor: colors.primary, shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
});

import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, View } from 'react-native';
import { MIN_PASSWORD, newPasswordProblem } from '../lib/password';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius, space } from '../lib/theme';
import { Text } from './AppText';
import Button from './Button';
import Field from './Field';

type Props = { visible: boolean; onDone: () => void; onCancel: () => void };


// Change the account password (the one used to log in). The current password is checked first,
// so someone picking up an unlocked phone can't lock the owner out.
export default function ChangePassword({ visible, onDone, onCancel }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState<{ field: 'current' | 'next'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const close = (fn: () => void) => { setCurrent(''); setNext(''); setAgain(''); setError(null); fn(); };

  async function save() {
    const problem = newPasswordProblem(current, next, again);
    if (!current) return setError({ field: 'current', text: 'Type the password you log in with now.' });
    if (problem) return setError({ field: 'next', text: problem });
    setError(null);
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email) return Alert.alert('Please log in again', 'Your login has ended.');
      const check = await supabase.auth.signInWithPassword({ email, password: current });
      if (check.error) return setError({ field: 'current', text: "That isn't your current password." });
      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) return Alert.alert("Couldn't change your password", updateError.message);
      close(onDone);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => close(onCancel)}>
      <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.card}>
          <Text style={s.title}>Change password</Text>
          <Text style={s.hint}>This is the password you use to log in to the dashboard.</Text>
          <Field label="Current password" secureTextEntry autoComplete="current-password" value={current}
            onChangeText={setCurrent} error={error?.field === 'current' ? error.text : undefined} />
          <Field label="New password" secureTextEntry autoComplete="new-password" value={next} onChangeText={setNext}
            hint={`At least ${MIN_PASSWORD} characters.`} error={error?.field === 'next' ? error.text : undefined} />
          <Field label="New password again" secureTextEntry autoComplete="new-password" value={again}
            onChangeText={setAgain} onSubmitEditing={save} />
          <Button title="Save new password" size="lg" loading={busy} onPress={save} />
          <Button title="Cancel" variant="ghost" onPress={() => close(onCancel)} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: space.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.xl, gap: space.md,
    width: '100%', maxWidth: 420, alignSelf: 'center' },
  title: { fontSize: 22, fontFamily: fonts.heading, color: colors.text, textAlign: 'center' },
  hint: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
});

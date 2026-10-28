import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './AppText';
import { colors, fonts, radius, space } from '../lib/theme';
import Button from './Button';
import { checkPasscode, hasPasscode, resetWithPassword, setPasscode } from '../lib/passcode';

type Props = { visible: boolean; onSuccess: () => void; onCancel: () => void };

export default function PasscodePrompt({ visible, onSuccess, onCancel }: Props) {
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);
  const fails = useRef(0);
  const lockedUntil = useRef(0);

  useEffect(() => { if (visible) { setCode(''); hasPasscode().then((h) => setCreating(!h)); } }, [visible]);

  async function submit() {
    if (Date.now() < lockedUntil.current) return Alert.alert('Locked', 'Too many tries. Wait a minute.');
    if (creating) {
      try { await setPasscode(code); onSuccess(); } catch (e: any) { Alert.alert('Passcode', e.message); }
      return;
    }
    if (await checkPasscode(code)) { fails.current = 0; onSuccess(); return; }
    fails.current += 1; setCode('');
    if (fails.current >= 5) { lockedUntil.current = Date.now() + 60_000; fails.current = 0; }
    Alert.alert('Wrong passcode');
  }

  function forgot() {
    Alert.prompt?.('Reset passcode', 'Enter your account password', async (pw) => {
      try { await resetWithPassword(pw); setCreating(true); Alert.alert('Done', 'Now create a new passcode.'); }
      catch (e: any) { Alert.alert(e.message); }
    }, 'secure-text');
    // Alert.prompt is iPhone-only. On Android: log out and back in from the More tab.
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <Text style={s.title}>{creating ? 'Create a 4–6 digit passcode' : 'Enter passcode'}</Text>
          <TextInput style={s.input} value={code} onChangeText={setCode} keyboardType="number-pad"
            secureTextEntry maxLength={6} autoFocus onSubmitEditing={submit} />
          <Text style={s.hint}>{creating ? 'You will use this to edit prices and services.' : 'This keeps your prices safe from accidental changes.'}</Text>
          <Button title={creating ? 'Save passcode' : 'Unlock'} onPress={submit} size="lg" />
          <Button title="Cancel" variant="ghost" onPress={onCancel} />
          {!creating && <Pressable onPress={forgot}><Text style={s.link}>Forgot passcode?</Text></Pressable>}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: space.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.xl, gap: space.md,
    width: '100%', maxWidth: 420, alignSelf: 'center' },
  title: { fontSize: 22, fontFamily: fonts.heading, color: colors.text, textAlign: 'center' },
  hint: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 14, fontSize: 28,
    textAlign: 'center', letterSpacing: 10, backgroundColor: colors.background },
  link: { textAlign: 'center', color: colors.primary, padding: 6, fontFamily: fonts.bodyBold, fontSize: 15 },
});

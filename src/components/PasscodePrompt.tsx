import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, radius, shadow, space } from '../lib/theme';
import Button from './Button';
import { Heading } from './Typography';
import { checkPasscode, hasPasscode, resetWithPassword, setPasscode } from '../lib/passcode';

type Props = { visible: boolean; onSuccess: () => void; onCancel: () => void };

export default function PasscodePrompt({ visible, onSuccess, onCancel }: Props) {
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);
  const fails = useRef(0);
  const lockedUntil = useRef(0);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) { setWasVisible(visible); if (visible) setCode(''); }

  useEffect(() => { if (visible) hasPasscode().then((h) => setCreating(!h)); }, [visible]);

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
          <Heading style={{ textAlign: 'center' }}>{creating ? 'Create a 4–6 digit passcode' : 'Enter passcode'}</Heading>
          <TextInput style={s.input} value={code} onChangeText={setCode} keyboardType="number-pad"
            secureTextEntry maxLength={6} autoFocus onSubmitEditing={submit} accessibilityLabel="Passcode"
            placeholder="••••" placeholderTextColor={colors.placeholder} />
          <Button title="OK" onPress={submit} />
          <Button title="Cancel" variant="ghost" onPress={onCancel} />
          {!creating && <Button title="Forgot passcode?" variant="ghost" onPress={forgot} />}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.text + '66', justifyContent: 'center', padding: space.xxl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.xl, gap: space.sm, ...shadow.card },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, fontSize: 24, textAlign: 'center',
    letterSpacing: 8, fontFamily: fonts.bodyBold, color: colors.text, backgroundColor: colors.background, marginVertical: space.xs },
});

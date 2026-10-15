import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
          <Pressable style={s.btn} onPress={submit}><Text style={s.btnText}>OK</Text></Pressable>
          <Pressable onPress={onCancel}><Text style={s.link}>Cancel</Text></Pressable>
          {!creating && <Pressable onPress={forgot}><Text style={s.link}>Forgot passcode?</Text></Pressable>}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0006', justifyContent: 'center', padding: 32 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 24, textAlign: 'center', letterSpacing: 8 },
  btn: { backgroundColor: '#C2185B', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '600' },
  link: { textAlign: 'center', color: '#C2185B', padding: 4 },
});

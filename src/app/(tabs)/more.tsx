import { clearPasscode } from '@/lib/passcode';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { Text } from '../../components/AppText';
import PasscodePrompt from '../../components/PasscodePrompt';
import Screen from '../../components/Screen';
import { supabase } from '../../lib/supabase';

export default function More() {
  const [changing, setChanging] = useState(false);
  const Row = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={{ backgroundColor: 'white', padding: 16, borderRadius: 12 }}>
      <Text style={{ fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
  return (
    <Screen>
      {/* Part 5 changes this row to: router.push('/services') */}
      <Row label="Service menu" onPress={() => router.push('/services')} />
      <Row label="Change passcode" onPress={() => setChanging(true)} />
      <Row label="Log out" onPress={() => Alert.alert('Log out?', '', [
        { text: 'Cancel' },
        { text: 'Log out', style: 'destructive', onPress: async () => {
          await clearPasscode();
          await supabase.auth.signOut();
        } },
      ])} />
      <PasscodePrompt visible={changing} onCancel={() => setChanging(false)}
        onSuccess={async () => {
          setChanging(false);
          await clearPasscode();
          Alert.alert('Passcode cleared', 'You will create a new one next time it is needed.');
        }} />
    </Screen>
  );
}

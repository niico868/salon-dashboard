import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';

const KEY = 'menu_passcode_hash';
const SALT = 'salon-dashboard-v1';
const hash = (code: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, SALT + code);

export async function hasPasscode() {
  return (await SecureStore.getItemAsync(KEY)) !== null;
}
export async function setPasscode(code: string) {
  if (!/^\d{4,6}$/.test(code)) throw new Error('Use 4 to 6 digits');
  await SecureStore.setItemAsync(KEY, await hash(code));
}
export async function checkPasscode(code: string) {
  return (await SecureStore.getItemAsync(KEY)) === (await hash(code));
}
// Forgot it? Prove it's you with your account password, then set a new one.
export async function resetWithPassword(password: string) {
  const { data } = await supabase.auth.getUser();
  const { error } = await supabase.auth.signInWithPassword({ email: data.user!.email!, password });
  if (error) throw new Error('Wrong password');
  await SecureStore.deleteItemAsync(KEY);
}

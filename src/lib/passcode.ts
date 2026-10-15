import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const KEY = 'menu_passcode_hash';
const SALT = 'salon-dashboard-v1';
const web = Platform.OS === 'web';
const hash = (code: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, SALT + code);

const store = {
  get: async () => (web ? localStorage.getItem(KEY) : SecureStore.getItemAsync(KEY)),
  set: async (v: string) => (web ? localStorage.setItem(KEY, v) : SecureStore.setItemAsync(KEY, v)),
  clear: async () => (web ? localStorage.removeItem(KEY) : SecureStore.deleteItemAsync(KEY)),
};

export async function hasPasscode() {
  return (await store.get()) !== null;
}
export async function setPasscode(code: string) {
  if (!/^\d{4,6}$/.test(code)) throw new Error('Use 4 to 6 digits');
  await store.set(await hash(code));
}
export async function checkPasscode(code: string) {
  return (await store.get()) === (await hash(code));
}
export async function clearPasscode() {
  await store.clear();
}
// Forgot it? Prove it's you with your account password, then set a new one.
export async function resetWithPassword(password: string) {
  const { data } = await supabase.auth.getUser();
  const { error } = await supabase.auth.signInWithPassword({ email: data.user!.email!, password });
  if (error) throw new Error('Wrong password');
  await store.clear();
}
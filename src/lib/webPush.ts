// Phone alerts for the installed web app (web push).
// The phone registers here; the website booking function sends the alert when a booking or
// enquiry comes in. Native builds keep using the local reminders in notifications.ts.
import { Platform } from 'react-native';
import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export type PushState =
  | 'on' | 'off'
  | 'blocked'          // the person said "Block" to notifications; only browser settings can undo it
  | 'install-first'    // iPhone/iPad: alerts only work once the app is added to the Home Screen
  | 'unsupported'      // this browser can't do push, or this isn't the web app
  | 'not-configured';  // EXPO_PUBLIC_VAPID_PUBLIC_KEY missing from .env

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
const isIOS = () => isWeb && (/iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const isInstalled = () => isWeb && (window.matchMedia?.('(display-mode: standalone)').matches
  || (navigator as unknown as { standalone?: boolean }).standalone === true);

function deviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || isIOS()) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/CrOS/.test(ua)) return 'Chromebook';
  return 'Computer';
}

// base64url -> bytes, for the subscribe() call
function keyBytes(b64: string) {
  const s = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration('/');
  return existing ?? navigator.serviceWorker.register('/sw.js');
}

export async function getPushState(): Promise<PushState> {
  if (!isWeb || !('serviceWorker' in navigator)) return 'unsupported';
  if (isIOS() && !isInstalled()) return 'install-first';
  if (!('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (!VAPID_PUBLIC_KEY) return 'not-configured';
  if (Notification.permission === 'denied') return 'blocked';
  const sub = await (await registration()).pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

export async function enablePush(): Promise<PushState> {
  const state = await getPushState();
  if (state !== 'off' && state !== 'on') return state;
  // Must be called straight from a tap: iPhone ignores permission requests otherwise
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';

  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
  const json = sub.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, device: deviceName(),
  }, { onConflict: 'owner_id,endpoint' });
  if (error) throw error;
  return 'on';
}

// Turn alerts off on this device (also used on log out, so the next person doesn't get them)
export async function disablePush() {
  if (!isWeb || !('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

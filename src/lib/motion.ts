import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// True when the phone's "Reduce Motion" setting is on. Animations then jump straight to the end.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

// Small vibrations that confirm an action. They do nothing on the web.
export const haptic = {
  tap: () => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); },
  success: () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  warning: () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); },
};

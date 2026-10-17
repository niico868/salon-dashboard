import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow, space } from '../lib/theme';
import { haptic, useReducedMotion } from '../lib/motion';

// Small confirmation banners that fade away by themselves: "Payment saved", "Client added".
// Use toasts for things that WORKED. Keep Alert for questions ("Delete client?") and errors.
//
//   const toast = useToast();
//   toast.show('Payment saved');
//   toast.show('Follow-up cleared', { icon: 'checkmark-done' });

type Options = { icon?: keyof typeof Ionicons.glyphMap; duration?: number };
const ToastContext = createContext<{ show: (message: string, opts?: Options) => void }>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [anim] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{ message: string; icon: keyof typeof Ionicons.glyphMap } | null>(null);

  const show = useCallback((message: string, opts: Options = {}) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, icon: opts.icon ?? 'checkmark-circle' });
    haptic.success();
    anim.setValue(reduced ? 1 : 0);
    if (!reduced) Animated.spring(anim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 18, bounciness: 6 }).start();
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: reduced ? 0 : 200, useNativeDriver: Platform.OS !== 'web' })
        .start(() => setToast(null));
    }, opts.duration ?? 2200);
  }, [anim, reduced]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <View pointerEvents="none" style={[s.layer, { top: insets.top + space.sm }]}>
          <Animated.View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[s.toast, {
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
            }]}>
            <Ionicons name={toast.icon} size={22} color={colors.textOnPrimary} />
            <Text style={s.text} numberOfLines={2}>{toast.message}</Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

const s = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.lg, zIndex: 1000 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.primary,
    borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 20, maxWidth: 420, ...shadow.card },
  text: { fontFamily: fonts.script, fontSize: 24, color: colors.textOnPrimary, flexShrink: 1 },
});

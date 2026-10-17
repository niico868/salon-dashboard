import { useEffect, useState } from 'react';
import { Animated, Platform, StyleProp, ViewStyle } from 'react-native';
import { motion } from '../lib/theme';
import { useReducedMotion } from '../lib/motion';

// Fades and slides its contents up slightly when it appears.
// Give cards on a screen index 0, 1, 2… so they arrive one after another.
export default function FadeInView({ index = 0, style, children }: { index?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(reduced ? 1 : 0));
  useEffect(() => {
    if (reduced) { v.setValue(1); return; }
    Animated.timing(v, { toValue: 1, duration: motion.normal, delay: index * motion.stagger, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [v, index, reduced]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

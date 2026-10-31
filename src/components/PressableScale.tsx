import { useState } from 'react';
import { Animated, Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from '../lib/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// A Pressable that gently shrinks while pressed, so taps feel physical.
// The style goes on the pressable itself, so layout styles like flex: 1 work as expected.
export default function PressableScale({ style, children, disabled, ...rest }:
  Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> }) {
  const [scale] = useState(() => new Animated.Value(1));
  const reduced = useReducedMotion();
  const to = (v: number) => { if (!reduced && !disabled) Animated.spring(scale, { toValue: v, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 4 }).start(); };
  return (
    <AnimatedPressable onPressIn={() => to(0.97)} onPressOut={() => to(1)} disabled={disabled} {...rest}
      style={[style, { transform: [{ scale }] }]}>
      {children as React.ReactNode}
    </AnimatedPressable>
  );
}

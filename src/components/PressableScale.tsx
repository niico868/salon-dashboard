import { useState } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from '../lib/motion';

// A Pressable that gently shrinks while pressed, so taps feel physical.
export default function PressableScale({ style, children, ...rest }: PressableProps & { style?: StyleProp<ViewStyle> }) {
  const [scale] = useState(() => new Animated.Value(1));
  const reduced = useReducedMotion();
  const to = (v: number) => !reduced && Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  return (
    <Pressable onPressIn={() => to(0.97)} onPressOut={() => to(1)} {...rest}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children as React.ReactNode}</Animated.View>
    </Pressable>
  );
}

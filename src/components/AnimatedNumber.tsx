import { useEffect, useState } from 'react';
import { Animated, Text, TextStyle, StyleProp } from 'react-native';
import { motion, type } from '../lib/theme';
import { useReducedMotion } from '../lib/motion';

// Counts up to a number when it first shows or changes, e.g. revenue tiles.
// <AnimatedNumber value={1450} format={TTD} />
export default function AnimatedNumber({ value, format = (n) => String(Math.round(n)), style }:
  { value: number; format?: (n: number) => string; style?: StyleProp<TextStyle> }) {
  const reduced = useReducedMotion();
  const [anim] = useState(() => new Animated.Value(0));
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = anim.addListener(({ value: v }) => setShown(v));
    Animated.timing(anim, { toValue: value, duration: motion.countUp, useNativeDriver: false }).start(() => setShown(value));
    return () => anim.removeListener(id);
  }, [anim, value, reduced]);

  return <Text style={[type.number, style]} accessibilityLabel={format(value)}>{format(reduced ? value : shown)}</Text>;
}

import { useEffect, useState } from 'react';
import { Animated, DimensionValue, Platform, StyleProp, View, ViewStyle } from 'react-native';
import { colors, radius, space } from '../lib/theme';
import { useReducedMotion } from '../lib/motion';

// Soft pulsing placeholder shapes shown while data loads, instead of a blank screen or spinner.
export function Skeleton({ width = '100%', height = 16, style }: { width?: DimensionValue; height?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);
  return <Animated.View style={[{ width, height, borderRadius: radius.sm, backgroundColor: colors.blush, opacity: pulse }, style]} />;
}

// A card-shaped placeholder: use a few of these where a list will appear.
export function SkeletonCard() {
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm }}
      accessibilityLabel="Loading">
      <Skeleton width="55%" height={18} />
      <Skeleton width="85%" />
      <Skeleton width="35%" />
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return <View style={{ gap: space.md }}>{Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}</View>;
}

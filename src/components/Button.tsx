import { ActivityIndicator, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { colors, fonts, radius, touch } from '../lib/theme';
import { haptic } from '../lib/motion';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Big, clearly labelled button. Use one primary button per screen for the main job.
export default function Button({ title, onPress, variant = 'primary', size = 'md', icon, loading, disabled, style }: Props) {
  const v = variants[variant];
  return (
    <PressableScale
      disabled={disabled || loading}
      onPress={() => { haptic.tap(); onPress(); }}
      style={[s.base, size === 'lg' && s.lg, v.box, (disabled || loading) && { opacity: 0.5 }, style]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      accessibilityLabel={title}>
      {loading ? <ActivityIndicator color={v.text.color} /> : (
        <>
          {icon && <Ionicons name={icon} size={size === 'lg' ? 22 : 19} color={v.text.color} />}
          <Text style={[s.text, size === 'lg' && s.lgText, v.text]}>{title}</Text>
        </>
      )}
    </PressableScale>
  );
}

const s = StyleSheet.create({
  base: { minHeight: touch.min + 2, borderRadius: radius.md, paddingHorizontal: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8 },
  lg: { minHeight: 58, borderRadius: radius.lg },
  text: { fontFamily: fonts.bodyBold, fontSize: 16, textAlign: 'center', flexShrink: 1 },
  lgText: { fontSize: 18 },
});

const variants = {
  primary: { box: { backgroundColor: colors.primary }, text: { color: colors.textOnPrimary } },
  success: { box: { backgroundColor: colors.success }, text: { color: colors.textOnPrimary } },
  outline: { box: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary }, text: { color: colors.primary } },
  ghost:   { box: { backgroundColor: 'transparent' }, text: { color: colors.primary } },
  danger:  { box: { backgroundColor: colors.dangerBg }, text: { color: colors.danger } },
};

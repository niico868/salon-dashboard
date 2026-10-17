import { ActivityIndicator, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { colors, fonts, radius, touch } from '../lib/theme';
import { haptic } from '../lib/motion';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export default function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style }: Props) {
  const v = variants[variant];
  return (
    <PressableScale
      disabled={disabled || loading}
      onPress={() => { haptic.tap(); onPress(); }}
      style={[s.base, v.box, (disabled || loading) && { opacity: 0.5 }, style]}
      accessibilityRole="button"
      accessibilityLabel={title}>
      {loading ? <ActivityIndicator color={v.text.color} /> : (
        <>
          {icon && <Ionicons name={icon} size={18} color={v.text.color} />}
          <Text style={[s.text, v.text]}>{title}</Text>
        </>
      )}
    </PressableScale>
  );
}

const s = StyleSheet.create({
  base: { minHeight: touch.min + 4, borderRadius: radius.md, paddingHorizontal: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8 },
  text: { fontFamily: fonts.bodyBold, fontSize: 16 },
});

const variants = {
  primary: { box: { backgroundColor: colors.primary }, text: { color: colors.textOnPrimary } },
  outline: { box: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary }, text: { color: colors.primary } },
  ghost:   { box: { backgroundColor: 'transparent' }, text: { color: colors.primary } },
  danger:  { box: { backgroundColor: colors.dangerBg }, text: { color: colors.danger } },
};

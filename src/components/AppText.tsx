import { forwardRef } from 'react';
import {
  Text as RNText, TextInput as RNTextInput, StyleSheet,
  type TextInputProps, type TextProps, type TextStyle,
} from 'react-native';
import { C, F } from '../lib/theme';

// Custom fonts ignore fontWeight on Android, so pick the matching Lato file
// and drop the weight. Styles that already set a fontFamily are left alone.
function brand(style: TextProps['style']): TextStyle {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  if (flat.fontFamily) return flat;
  const { fontWeight, ...rest } = flat;
  const bold = fontWeight != null && Number(fontWeight === 'bold' ? 700 : fontWeight) >= 600;
  return { color: C.ink, ...rest, fontFamily: bold ? F.bodyBold : F.body };
}

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...p }, ref) {
  return <RNText ref={ref} {...p} style={brand(style)} />;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...p }, ref) {
  return <RNTextInput ref={ref} placeholderTextColor={C.muted} {...p} style={brand(style)} />;
});

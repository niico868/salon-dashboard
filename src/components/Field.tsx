import { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, fonts, radius, touch } from '../lib/theme';

// A labelled text box with a placeholder example, an optional hint, and an error message.
// <Field label="Phone" placeholder="e.g. 868 555 1234" hint="Used for WhatsApp" value={…} onChangeText={…} />
type Props = TextInputProps & { label: string; hint?: string; error?: string; required?: boolean };

export default function Field({ label, hint, error, required, multiline, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}{required ? <Text style={{ color: colors.primary }}> *</Text> : null}</Text>
      <TextInput
        placeholderTextColor={colors.placeholder}
        multiline={multiline}
        accessibilityLabel={label}
        {...rest}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={[s.input, multiline && s.multi, focused && s.focused, !!error && s.errorBox, style]}
      />
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  input: { minHeight: touch.min + 4, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 17, color: colors.text },
  multi: { minHeight: 96, textAlignVertical: 'top' },
  focused: { borderColor: colors.primary, borderWidth: 1.5 },
  errorBox: { borderColor: colors.danger },
  hint: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.danger },
});

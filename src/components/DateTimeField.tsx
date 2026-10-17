import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { createElement } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, Text } from 'react-native';
import { colors, fonts, radius, touch } from '../lib/theme';

type Props = { value: Date; onChange: (d: Date) => void };

export default function DateTimeField({ value, onChange }: Props) {
  if (Platform.OS === 'web') {
    return createElement('input', {
      type: 'datetime-local',
      value: format(value, "yyyy-MM-dd'T'HH:mm"),
      onChange: (e: any) => e.target.value && onChange(new Date(e.target.value)),
      style: { padding: 12, borderRadius: radius.md, border: `1px solid ${colors.border}`, fontSize: 16,
        fontFamily: fonts.body, color: colors.text, backgroundColor: colors.surface, minHeight: touch.min + 4, boxSizing: 'border-box' },
    });
  }
  if (Platform.OS === 'ios') {
    return <DateTimePicker value={value} mode="datetime" minuteInterval={15}
      accentColor={colors.primary} onChange={(_, d) => d && onChange(d)} />;
  }
  // Android: open the date dialog, then the time dialog
  const open = () => DateTimePickerAndroid.open({
    value, mode: 'date',
    onChange: (e, d) => {
      if (e.type !== 'set' || !d) return;
      DateTimePickerAndroid.open({
        value: d, mode: 'time', is24Hour: false,
        onChange: (e2, t) => { if (e2.type === 'set' && t) onChange(t); },
      });
    },
  });
  return (
    <Pressable onPress={open} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.surface, paddingHorizontal: 14, minHeight: touch.min + 4, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.border }}>
      <Ionicons name="calendar-outline" size={18} color={colors.primary} />
      <Text style={{ fontFamily: fonts.body, fontSize: 16, color: colors.text }}>{format(value, 'EEE d MMM yyyy, h:mm a')}</Text>
    </Pressable>
  );
}
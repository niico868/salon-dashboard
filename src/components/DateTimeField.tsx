import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { createElement } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { colors, fonts, radius, touch } from '../lib/theme';

type Props = { value: Date; onChange: (d: Date) => void };

// Pick a date and time. Shows the choice in plain words, e.g. "Tue 28 Oct 2026, 2:30 PM".
export default function DateTimeField({ value, onChange }: Props) {
  if (Platform.OS === 'web') {
    return (
      <View style={s.box}>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        {createElement('input', {
          type: 'datetime-local',
          step: 900,
          value: format(value, "yyyy-MM-dd'T'HH:mm"),
          'aria-label': 'Date and time',
          onChange: (e: any) => e.target.value && onChange(new Date(e.target.value)),
          style: { flex: 1, border: 'none', outline: 'none', fontSize: 17, fontFamily: fonts.body,
            color: colors.text, backgroundColor: 'transparent', minHeight: 40 },
        })}
      </View>
    );
  }
  if (Platform.OS === 'ios') {
    return (
      <View style={[s.box, { justifyContent: 'flex-start' }]}>
        <DateTimePicker value={value} mode="datetime" minuteInterval={15} accentColor={colors.primary}
          onChange={(_, d) => d && onChange(d)} />
      </View>
    );
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
    <Pressable onPress={open} style={s.box} accessibilityRole="button" accessibilityLabel="Change date and time">
      <Ionicons name="calendar-outline" size={20} color={colors.primary} />
      <Text style={s.text}>{format(value, 'EEE d MMM yyyy, h:mm a')}</Text>
      <Text style={s.change}>Change</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, minHeight: touch.min + 6 },
  text: { flex: 1, fontSize: 17 },
  change: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 15 },
});

import { Platform, Pressable, Text } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

type Props = { value: Date; onChange: (d: Date) => void };

export default function DateTimeField({ value, onChange }: Props) {
  if (Platform.OS === 'ios') {
    return <DateTimePicker value={value} mode="datetime" minuteInterval={15}
      onChange={(_, d) => d && onChange(d)} />;
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
    <Pressable onPress={open} style={{ backgroundColor: 'white', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#eee' }}>
      <Text>{format(value, 'EEE d MMM yyyy, h:mm a')}</Text>
    </Pressable>
  );
}

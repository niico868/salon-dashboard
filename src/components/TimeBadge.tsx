import { format } from 'date-fns';
import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '../lib/theme';
import { Text } from './AppText';

// Start time shown large on the left of a booking, e.g. "10:30" over "AM", or the day for later bookings.
export default function TimeBadge({ date, showDay }: { date: Date; showDay?: boolean }) {
  return (
    <View style={s.box}>
      {showDay ? <Text style={s.day}>{format(date, 'EEE')}</Text> : null}
      <Text style={s.time}>{format(date, 'h:mm')}</Text>
      <Text style={s.ampm}>{format(date, 'a')}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { width: 62, alignItems: 'center', paddingVertical: 4, borderRadius: 12, backgroundColor: colors.blush },
  day: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary, textTransform: 'uppercase' },
  time: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text },
  ampm: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
});

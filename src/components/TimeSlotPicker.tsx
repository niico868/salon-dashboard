import { format, isSameDay } from 'date-fns';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import DateTimeField from './DateTimeField';
import { Small } from './Typography';
import { type Busy, openDaysFrom, slotIsTaken, slotsForDay } from '../lib/hours';
import { haptic } from '../lib/motion';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius, space, touch } from '../lib/theme';

type Props = { value: Date; onChange: (d: Date) => void; durationMin: number; excludeId?: string };

// Pick a time by tapping: the next open days, then the free times that day.
// "Another date or time" opens the full picker for anything else.
export default function TimeSlotPicker({ value, onChange, durationMin, excludeId }: Props) {
  const [custom, setCustom] = useState(false);
  const [busy, setBusy] = useState<Busy[]>([]);
  const dayKey = format(value, 'yyyy-MM-dd');

  useEffect(() => {
    const dayStart = new Date(`${dayKey}T00:00`);
    const dayEnd = new Date(`${dayKey}T23:59:59`);
    let current = true;
    let query = supabase.from('appointments').select('starts_at, ends_at').eq('status', 'booked')
      .lt('starts_at', dayEnd.toISOString()).gt('ends_at', dayStart.toISOString());
    if (excludeId) query = query.neq('id', excludeId);
    // If this can't load, every time shows as free and the check on saving still warns about overlaps
    query.then(({ data }) => {
      if (current) setBusy((data ?? []).map((b) => ({ start: new Date(b.starts_at), end: new Date(b.ends_at) })));
    });
    return () => { current = false; };
  }, [dayKey, excludeId]);

  const openDays = openDaysFrom(new Date(), 7);
  const days = openDays.some((d) => isSameDay(d, value)) ? openDays : [value, ...openDays];
  const slots = slotsForDay(value, durationMin);

  function pickDay(day: Date) {
    haptic.tap();
    const sameTime = new Date(day.getFullYear(), day.getMonth(), day.getDate(), value.getHours(), value.getMinutes());
    const fits = slotsForDay(day, durationMin).some((s) => s.getTime() === sameTime.getTime());
    onChange(fits ? sameTime : slotsForDay(day, durationMin)[0] ?? sameTime);
  }

  return (
    <View style={{ gap: space.md }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.days}>
        {days.map((d) => {
          const on = isSameDay(d, value);
          return (
            <Pressable key={d.toISOString()} style={[s.day, on && s.on]} onPress={() => pickDay(d)}
              accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={format(d, 'EEEE d MMMM')}>
              <Text style={[s.dayName, on && s.onText]}>{format(d, 'EEE')}</Text>
              <Text style={[s.dayNum, on && s.onText]}>{format(d, 'd MMM')}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {slots.length === 0 && <Small>This treatment doesn&apos;t fit inside opening hours on its own. Use another date or time below.</Small>}
      <View style={s.slots}>
        {slots.map((t) => {
          const on = t.getTime() === value.getTime();
          const taken = slotIsTaken(t, durationMin, busy);
          return (
            <Pressable key={t.toISOString()} disabled={taken} style={[s.slot, on && s.on, taken && s.taken]}
              onPress={() => { haptic.tap(); onChange(t); }}
              accessibilityRole="radio" accessibilityState={{ checked: on, disabled: taken }}
              accessibilityLabel={`${format(t, 'h:mm a')}${taken ? ', already booked' : ''}`}>
              <Text style={[s.slotText, on && s.onText, taken && s.takenText]}>{format(t, 'h:mm a')}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={() => setCustom(!custom)} style={s.other} accessibilityRole="button" accessibilityState={{ expanded: custom }}>
        <Text style={s.otherText}>{custom ? 'Hide other dates and times' : 'Another date or time'}</Text>
      </Pressable>
      {custom && <DateTimeField value={value} onChange={onChange} />}
    </View>
  );
}

const s = StyleSheet.create({
  days: { gap: space.sm, paddingVertical: 2 },
  day: { alignItems: 'center', minWidth: 72, paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  dayName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  dayNum: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  slot: { flexGrow: 1, flexBasis: '30%', minHeight: touch.min, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  slotText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  onText: { color: colors.textOnPrimary },
  taken: { backgroundColor: colors.neutralBg, borderColor: colors.neutralBg },
  takenText: { color: colors.neutral, textDecorationLine: 'line-through' },
  other: { minHeight: 44, justifyContent: 'center' },
  otherText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
});

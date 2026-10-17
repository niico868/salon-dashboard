import { Ionicons } from '@expo/vector-icons';
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import DayView from '../../components/DayView';
import EmptyState from '../../components/EmptyState';
import LoadError from '../../components/LoadError';
import PressableScale from '../../components/PressableScale';
import Screen from '../../components/Screen';
import { SkeletonList } from '../../components/Skeleton';
import StatusChip from '../../components/StatusChip';
import { BodyStrong, Heading, Label } from '../../components/Typography';
import { TTD } from '../../lib/money';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, shadow, space, touch } from '../../lib/theme';
import type { AppointmentBalance } from '../../lib/types';

const COLOR = { booked: colors.primary, completed: colors.success, cancelled: colors.neutral, no_show: colors.neutral } as const;
const dayKey = (iso: string) => format(new Date(iso), 'yyyy-MM-dd');

export default function CalendarTab() {
  const [mode, setMode] = useState<'month' | 'day'>('month');
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [appts, setAppts] = useState<AppointmentBalance[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('appointment_balances').select('*')
      .gte('starts_at', startOfMonth(month).toISOString())
      .lte('starts_at', endOfMonth(month).toISOString())
      .order('starts_at');
    setLoaded(true);
    if (error) return setLoadError(true);
    setLoadError(false);
    setAppts((data as AppointmentBalance[]) ?? []);
  }, [month]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const marked = useMemo(() => {
    const m: Record<string, any> = {};
    for (const a of appts) {
      const k = dayKey(a.starts_at);
      m[k] ??= { dots: [] };
      if (m[k].dots.length < 3) m[k].dots.push({ key: a.id, color: COLOR[a.status] });
    }
    m[selected] = { ...(m[selected] ?? { dots: [] }), selected: true, selectedColor: colors.primary };
    return m;
  }, [appts, selected]);

  const today = appts.filter((a) => dayKey(a.starts_at) === selected);
  const selectedDate = new Date(selected + 'T12:00');

  // Day view arrows: moving into another month loads that month's bookings
  function goToDay(d: Date) {
    setSelected(format(d, 'yyyy-MM-dd'));
    if (format(d, 'yyyy-MM') !== format(month, 'yyyy-MM')) setMonth(startOfMonth(d));
  }

  const newBooking = () => router.push(`/appointment/new?date=${selected}`);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={s.seg}>
        {(['month', 'day'] as const).map((m) => (
          <Pressable key={m} style={[s.segBtn, mode === m && s.segOn]} onPress={() => setMode(m)}
            accessibilityRole="tab" accessibilityState={{ selected: mode === m }}>
            <Text style={[s.segText, mode === m && s.segTextOn]}>{m === 'month' ? 'Month' : 'Day'}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'day' ? (
        <View style={{ flex: 1 }}>
          <View style={s.nav}>
            <Pressable style={s.arrow} onPress={() => goToDay(addDays(selectedDate, -1))} accessibilityLabel="Previous day">
              <Ionicons name="chevron-back" size={26} color={colors.primary} />
            </Pressable>
            <Pressable onPress={() => goToDay(new Date())} accessibilityLabel="Go to today">
              <Heading>{format(selectedDate, 'EEEE d MMMM')}</Heading>
            </Pressable>
            <Pressable style={s.arrow} onPress={() => goToDay(addDays(selectedDate, 1))} accessibilityLabel="Next day">
              <Ionicons name="chevron-forward" size={26} color={colors.primary} />
            </Pressable>
          </View>
          {loadError && <View style={{ paddingHorizontal: space.lg }}><LoadError onRetry={load} /></View>}
          <DayView date={selectedDate} appts={today}
            onPressAppt={(id) => router.push(`/appointment/${id}`)}
            onPressSlot={(d) => router.push(`/appointment/new?date=${selected}&time=${format(d, 'HH:mm')}`)} />
        </View>
      ) : (
        <Screen style={{ paddingTop: space.sm, paddingBottom: 96 }} refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}>
          <View style={s.calCard}>
            <Calendar current={format(month, 'yyyy-MM-dd')} markingType="multi-dot" markedDates={marked}
              onDayPress={(d) => setSelected(d.dateString)}
              onMonthChange={(d) => setMonth(new Date(d.year, d.month - 1, 1))}
              theme={{
                calendarBackground: colors.surface,
                todayTextColor: colors.primary,
                arrowColor: colors.primary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: colors.textOnPrimary,
                selectedDotColor: colors.textOnPrimary,
                dayTextColor: colors.text,
                textDisabledColor: colors.placeholder,
                monthTextColor: colors.text,
                textSectionTitleColor: colors.textMuted,
                textDayFontFamily: fonts.body,
                textMonthFontFamily: fonts.heading,
                textDayHeaderFontFamily: fonts.bodyMedium,
              }} />
          </View>
          {loadError && <LoadError onRetry={load} />}
          <Heading>{format(new Date(selected + 'T12:00'), 'EEEE d MMMM')}</Heading>
          {!loaded && !loadError && <SkeletonList count={2} />}
          {loaded && !loadError && today.length === 0 && (
            <EmptyState icon="calendar-outline" title="No bookings" message="Nothing booked on this day yet."
              actionLabel="Book appointment" onAction={newBooking} />
          )}
          {today.map((a) => (
            <PressableScale key={a.id} style={[s.row, { borderLeftColor: COLOR[a.status] }]} onPress={() => router.push(`/appointment/${a.id}`)}>
              <BodyStrong style={s.time}>{format(new Date(a.starts_at), 'h:mm a')}</BodyStrong>
              <View style={{ flex: 1, gap: 2 }}>
                <BodyStrong>{a.client_name}</BodyStrong>
                <Label>{a.service_name} · {TTD(Number(a.price))}</Label>
              </View>
              <StatusChip status={a.status} />
            </PressableScale>
          ))}
        </Screen>
      )}
      <PressableScale style={s.fab} onPress={newBooking} accessibilityRole="button" accessibilityLabel="Book appointment">
        <Ionicons name="add" size={30} color={colors.textOnPrimary} />
      </PressableScale>
    </View>
  );
}

const s = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: space.xs,
    margin: space.md, marginBottom: space.xs, borderWidth: 1, borderColor: colors.border },
  segBtn: { flex: 1, minHeight: touch.min - 8, justifyContent: 'center', alignItems: 'center', borderRadius: radius.sm },
  segOn: { backgroundColor: colors.primary },
  segText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  segTextOn: { fontFamily: fonts.bodyBold, color: colors.textOnPrimary },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xs },
  arrow: { minWidth: touch.min, minHeight: touch.min, alignItems: 'center', justifyContent: 'center' },
  calCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.sm, overflow: 'hidden', ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, padding: space.md,
    borderRadius: radius.lg, borderLeftWidth: 4, ...shadow.card },
  time: { width: 72 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.card, elevation: 4 },
});

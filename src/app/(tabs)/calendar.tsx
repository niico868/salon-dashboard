import { Ionicons } from '@expo/vector-icons';
import { addDays, endOfMonth, format, isToday, startOfMonth } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Text } from '../../components/AppText';
import BookingChip from '../../components/BookingChip';
import DayView from '../../components/DayView';
import EmptyState from '../../components/EmptyState';
import ListRow from '../../components/ListRow';
import LoadError from '../../components/LoadError';
import PressableScale from '../../components/PressableScale';
import Segmented from '../../components/Segmented';
import TimeBadge from '../../components/TimeBadge';
import { Heading } from '../../components/Typography';
import { haptic } from '../../lib/motion';
import { TTD } from '../../lib/money';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, shadow, space } from '../../lib/theme';
import type { AppointmentBalance } from '../../lib/types';

const COLOR = { booked: colors.primary, completed: colors.success, cancelled: colors.neutral, no_show: colors.neutral } as const;
const dayKey = (iso: string) => format(new Date(iso), 'yyyy-MM-dd');

export default function CalendarTab() {
  const [mode, setMode] = useState<'month' | 'day'>('month');
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [appts, setAppts] = useState<AppointmentBalance[]>([]);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('appointment_balances').select('*')
      .gte('starts_at', startOfMonth(month).toISOString())
      .lte('starts_at', endOfMonth(month).toISOString())
      .order('starts_at');
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
      if (m[k].dots.length < 3) m[k].dots.push({ key: a.id, color: COLOR[a.status], selectedDotColor: colors.textOnPrimary });
    }
    m[selected] = { ...(m[selected] ?? { dots: [] }), selected: true, selectedColor: colors.primary };
    return m;
  }, [appts, selected]);

  const dayList = appts.filter((a) => dayKey(a.starts_at) === selected);
  const selectedDate = new Date(selected + 'T12:00');

  // Moving into another month loads that month's bookings
  function goToDay(d: Date) {
    haptic.tap();
    setSelected(format(d, 'yyyy-MM-dd'));
    if (format(d, 'yyyy-MM') !== format(month, 'yyyy-MM')) setMonth(startOfMonth(d));
  }

  const todayLink = !isToday(selectedDate) && (
    <Pressable onPress={() => goToDay(new Date())} hitSlop={10} style={s.todayBtn} accessibilityRole="button">
      <Text style={s.todayText}>Today</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={s.top}>
        <Segmented value={mode} onChange={setMode}
          options={[{ value: 'month', label: 'Month' }, { value: 'day', label: 'Day by hour' }]} />
      </View>

      {mode === 'day' ? (
        <View style={{ flex: 1 }}>
          <View style={s.nav}>
            <Pressable onPress={() => goToDay(addDays(selectedDate, -1))} style={s.arrow}
              accessibilityRole="button" accessibilityLabel="Previous day">
              <Ionicons name="chevron-back" size={26} color={colors.primary} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Heading>{format(selectedDate, 'EEEE d MMMM')}</Heading>
              {todayLink}
            </View>
            <Pressable onPress={() => goToDay(addDays(selectedDate, 1))} style={s.arrow}
              accessibilityRole="button" accessibilityLabel="Next day">
              <Ionicons name="chevron-forward" size={26} color={colors.primary} />
            </Pressable>
          </View>
          {loadError && <View style={{ paddingHorizontal: space.lg }}><LoadError onRetry={load} /></View>}
          <DayView date={selectedDate} appts={dayList}
            onPressAppt={(id) => router.push(`/appointment/${id}`)}
            onPressSlot={(d) => router.push(`/appointment/new?date=${selected}&time=${format(d, 'HH:mm')}`)} />
        </View>
      ) : (
        <FlatList data={dayList} keyExtractor={(a) => a.id}
          contentContainerStyle={s.list}
          ListHeaderComponent={
            <View style={{ gap: space.md }}>
              <View style={s.calCard}>
                <Calendar key={format(month, 'yyyy-MM')} current={format(month, 'yyyy-MM-dd')} markingType="multi-dot" markedDates={marked}
                  onDayPress={(d) => { haptic.tap(); setSelected(d.dateString); }}
                  onMonthChange={(d) => setMonth(new Date(d.year, d.month - 1, 1))}
                  enableSwipeMonths={false}
                  theme={{
                    calendarBackground: colors.surface,
                    todayTextColor: colors.primary, arrowColor: colors.primary,
                    selectedDayBackgroundColor: colors.primary, selectedDayTextColor: colors.textOnPrimary,
                    dayTextColor: colors.text, textDisabledColor: '#C9BDBB', monthTextColor: colors.text,
                    textSectionTitleColor: colors.textMuted,
                    textDayFontFamily: fonts.body, textMonthFontFamily: fonts.heading, textDayHeaderFontFamily: fonts.bodyBold,
                    textDayFontSize: 17, textMonthFontSize: 20, textDayHeaderFontSize: 13,
                  }} />
              </View>
              <View style={s.legend}>
                <Legend color={colors.primary} label="Booked" />
                <Legend color={colors.success} label="Done" />
                <Legend color={colors.neutral} label="Cancelled / no-show" />
              </View>
              {loadError && <LoadError onRetry={load} />}
              <View style={s.dayHead}>
                <Heading style={{ flex: 1 }}>{isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE d MMMM')}</Heading>
                {todayLink}
              </View>
            </View>
          }
          ListEmptyComponent={loadError ? null : (
            <EmptyState icon="calendar-clear-outline" title="Nothing booked" message="This day is free."
              actionLabel="Book this day" onAction={() => router.push(`/appointment/new?date=${selected}`)} />
          )}
          renderItem={({ item: a }) => (
            <ListRow title={a.client_name} subtitle={`${a.service_name} · ${TTD(Number(a.price))}`}
              left={<TimeBadge date={new Date(a.starts_at)} />}
              right={<BookingChip a={a} />}
              accent={COLOR[a.status]}
              onPress={() => router.push(`/appointment/${a.id}`)} />
          )} />
      )}

      <PressableScale style={s.fab} onPress={() => { haptic.tap(); router.push(`/appointment/new?date=${selected}`); }}
        accessibilityRole="button" accessibilityLabel="New booking">
        <Ionicons name="add" size={26} color={colors.textOnPrimary} />
        <Text style={s.fabText}>Book</Text>
      </PressableScale>
    </View>
  );
}

const Legend = ({ color, label }: { color: string; label: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
    <Text style={{ fontSize: 14, color: colors.textMuted }}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  top: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.sm, width: '100%', maxWidth: 640, alignSelf: 'center' },
  list: { padding: space.lg, paddingBottom: 110, gap: space.md, width: '100%', maxWidth: 640, alignSelf: 'center' },
  calCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.sm, overflow: 'hidden', ...shadow.card },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, justifyContent: 'center' },
  dayHead: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, paddingVertical: space.xs },
  arrow: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blush },
  todayBtn: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary, marginTop: 4 },
  todayText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 14 },
  fab: { position: 'absolute', right: space.xl, bottom: space.xl, height: 58, borderRadius: 29, paddingHorizontal: 22,
    backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6, ...shadow.raised },
  fabText: { color: colors.textOnPrimary, fontFamily: fonts.bodyBold, fontSize: 18 },
});

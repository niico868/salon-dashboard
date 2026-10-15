import { endOfMonth, format, startOfMonth } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import LoadError from '../../components/LoadError';
import { TTD } from '../../lib/money';
import { supabase } from '../../lib/supabase';
import type { AppointmentBalance } from '../../lib/types';

const COLOR = { booked: '#C2185B', completed: '#2E7D32', cancelled: '#9E9E9E', no_show: '#9E9E9E' } as const;
const dayKey = (iso: string) => format(new Date(iso), 'yyyy-MM-dd');

export default function CalendarTab() {
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
      if (m[k].dots.length < 3) m[k].dots.push({ key: a.id, color: COLOR[a.status] });
    }
    m[selected] = { ...(m[selected] ?? { dots: [] }), selected: true, selectedColor: '#F8BBD0' };
    return m;
  }, [appts, selected]);

  const today = appts.filter((a) => dayKey(a.starts_at) === selected);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF7FA' }}>
      <Calendar markingType="multi-dot" markedDates={marked}
        onDayPress={(d) => setSelected(d.dateString)}
        onMonthChange={(d) => setMonth(new Date(d.year, d.month - 1, 1))}
        theme={{ todayTextColor: '#C2185B', arrowColor: '#C2185B' }} />
      <FlatList data={today} keyExtractor={(a) => a.id} contentContainerStyle={{ padding: 16, gap: 8 }}
        ListHeaderComponent={
          <View style={{ gap: 8 }}>
            {loadError && <LoadError onRetry={load} />}
            <Text style={s.h}>{format(new Date(selected + 'T12:00'), 'EEEE d MMMM')}</Text>
          </View>
        }
        ListEmptyComponent={loadError ? null : <Text style={{ color: '#777' }}>No bookings.</Text>}
        renderItem={({ item: a }) => (
          <Pressable style={[s.row, { borderLeftColor: COLOR[a.status] }]} onPress={() => router.push(`/appointment/${a.id}`)}>
            <Text style={s.time}>{format(new Date(a.starts_at), 'h:mm a')}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600' }}>{a.client_name}</Text>
              <Text style={{ color: '#777' }}>{a.service_name} · {TTD(Number(a.price))}</Text>
            </View>
          </Pressable>
        )} />
      <Pressable style={s.fab} onPress={() => router.push(`/appointment/new?date=${selected}`)}>
        <Text style={{ color: 'white', fontSize: 28 }}>+</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  h: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12, backgroundColor: 'white', padding: 12, borderRadius: 12, borderLeftWidth: 4 },
  time: { width: 70, fontWeight: '600' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#C2185B', alignItems: 'center', justifyContent: 'center', elevation: 4 },
});

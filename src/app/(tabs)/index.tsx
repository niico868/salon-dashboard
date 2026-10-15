import { addDays, addMonths, format, isPast, isToday, startOfMonth, subMonths } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import LoadError from '../../components/LoadError';
import StatCard from '../../components/StatCard';
import { TTD } from '../../lib/money';
import { rangeFor, Sales, salesBetween } from '../../lib/sales';
import { supabase } from '../../lib/supabase';
import type { AppointmentBalance, Client } from '../../lib/types';

const GREEN = '#2E7D32', PINK = '#F48FB1';

export default function Dashboard() {
  const [today, setToday] = useState<Sales | null>(null);
  const [week, setWeek] = useState<Sales | null>(null);
  const [todayList, setTodayList] = useState<AppointmentBalance[]>([]);
  const [upcoming, setUpcoming] = useState<AppointmentBalance[]>([]);
  const [followUps, setFollowUps] = useState<Client[]>([]);
  const [months, setMonths] = useState<{ label: string; value: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      const now = new Date();
      const d = rangeFor('day', now), w = rangeFor('week', now);

      const [t, wk, list, next, fu] = await Promise.all([
        salesBetween(d.from, d.to),
        salesBetween(w.from, w.to),
        supabase.from('appointment_balances').select('*').neq('status', 'cancelled')
          .gte('starts_at', d.from.toISOString()).lt('starts_at', d.to.toISOString()).order('starts_at'),
        supabase.from('appointment_balances').select('*').eq('status', 'booked')
          .gte('starts_at', d.to.toISOString()).lt('starts_at', w.to.toISOString()).order('starts_at').limit(5),
        supabase.from('clients').select('*').not('follow_up_date', 'is', null)
          .lte('follow_up_date', format(addDays(now, 7), 'yyyy-MM-dd')).order('follow_up_date'),
      ]);
      const queryError = list.error ?? next.error ?? fu.error;
      if (queryError) throw queryError;
      setToday(t); setWeek(wk);
      setTodayList((list.data as AppointmentBalance[]) ?? []);
      setUpcoming((next.data as AppointmentBalance[]) ?? []);
      setFollowUps((fu.data as Client[]) ?? []);

      // Six months of received revenue, oldest first
      const starts = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(now, 5 - i)));
      const totals = await Promise.all(starts.map((m) => salesBetween(m, addMonths(m, 1))));
      setMonths(starts.map((m, i) => ({ label: format(m, 'MMM'), value: totals[i].actual })));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function clearFollowUp(id: string) {
    const { error } = await supabase.from('clients').update({ follow_up_date: null, follow_up_note: null }).eq('id', id);
    if (error) return Alert.alert('Update failed', error.message);
    load();
  }

  const weekBars = (week?.days ?? []).map((d) => ({
    label: format(d.date, 'EEEEE'),
    stacks: [{ value: d.actual, color: GREEN }, { value: d.potential, color: PINK }],
  }));

  const refresh = <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />;

  // Show the retry card instead of TT$0.00 tiles that look like real figures
  if (loadError) return (
    <ScrollView contentContainerStyle={s.page} refreshControl={refresh}>
      <Text style={s.date}>{format(new Date(), 'EEEE d MMMM')}</Text>
      <LoadError onRetry={load} />
    </ScrollView>
  );

  return (
    <ScrollView contentContainerStyle={s.page} refreshControl={refresh}>
      <Text style={s.date}>{format(new Date(), 'EEEE d MMMM')}</Text>

      <View style={s.grid}>
        <StatCard label="Today received" value={TTD(today?.actual ?? 0)} color={GREEN} />
        <StatCard label="Today still due" value={TTD(today?.potential ?? 0)} color="#C2185B" />
        <StatCard label="Week received" value={TTD(week?.actual ?? 0)} color={GREEN} />
        <StatCard label="Week expected" value={TTD(week?.expected ?? 0)} />
      </View>

      <Text style={s.h}>Today · {todayList.length} booking{todayList.length === 1 ? '' : 's'}</Text>
      {todayList.length === 0 && <Text style={s.muted}>Nothing booked today.</Text>}
      {todayList.map((a) => (
        <Pressable key={a.id} style={s.row} onPress={() => router.push(`/appointment/${a.id}`)}>
          <Text style={s.time}>{format(new Date(a.starts_at), 'h:mm a')}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600' }}>{a.client_name}</Text>
            <Text style={s.muted}>{a.service_name}</Text>
          </View>
          <Text style={{ color: Number(a.balance) > 0 ? '#C2185B' : GREEN, fontWeight: '600' }}>
            {Number(a.balance) > 0 ? `owes ${TTD(Number(a.balance))}` : 'paid'}
          </Text>
        </Pressable>
      ))}

      <Text style={s.h}>This week · {week?.bookings ?? 0} bookings</Text>
      <View style={s.card}>
        <BarChart stackData={weekBars} barWidth={22} spacing={18} height={150} noOfSections={3}
          yAxisThickness={0} xAxisThickness={0} yAxisTextStyle={{ color: '#999', fontSize: 10 }}
          xAxisLabelTextStyle={{ color: '#999', fontSize: 10 }} />
        <Text style={[s.muted, { textAlign: 'center' }]}><Text style={{ color: GREEN }}>■</Text> Received   <Text style={{ color: PINK }}>■</Text> Still due</Text>
      </View>
      {upcoming.map((a) => (
        <Pressable key={a.id} style={s.row} onPress={() => router.push(`/appointment/${a.id}`)}>
          <Text style={s.time}>{format(new Date(a.starts_at), 'EEE h:mm a')}</Text>
          <Text style={{ flex: 1 }}>{a.client_name} · {a.service_name}</Text>
        </Pressable>
      ))}

      <Text style={s.h}>Follow-ups</Text>
      {followUps.length === 0 && <Text style={s.muted}>No follow-ups due this week.</Text>}
      {followUps.map((c) => {
        const due = new Date(c.follow_up_date + 'T12:00');
        const overdue = isPast(due) && !isToday(due);
        return (
          <View key={c.id} style={s.row}>
            <Pressable style={{ flex: 1 }} onPress={() => router.push(`/client/${c.id}`)}>
              <Text style={{ fontWeight: '600' }}>{c.full_name}</Text>
              <Text style={{ color: overdue ? '#B00020' : '#777' }}>
                {overdue ? 'Overdue · ' : ''}{format(due, 'EEE d MMM')}{c.follow_up_note ? ` · ${c.follow_up_note}` : ''}
              </Text>
            </Pressable>
            <Pressable onPress={() => clearFollowUp(c.id)}><Text style={{ color: GREEN, fontWeight: '600' }}>Done</Text></Pressable>
          </View>
        );
      })}

      <Text style={s.h}>Received, last 6 months</Text>
      <View style={s.card}>
        <BarChart data={months.map((m) => ({ value: m.value, label: m.label, frontColor: GREEN }))}
          barWidth={26} spacing={16} height={150} noOfSections={3} yAxisThickness={0} xAxisThickness={0}
          yAxisTextStyle={{ color: '#999', fontSize: 10 }} xAxisLabelTextStyle={{ color: '#999', fontSize: 10 }} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 16, gap: 10, backgroundColor: '#FFF7FA' },
  date: { fontSize: 22, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  h: { fontWeight: '700', fontSize: 17, marginTop: 8 },
  muted: { color: '#777' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'white', padding: 12, borderRadius: 12 },
  time: { width: 80, fontWeight: '600' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 12, gap: 6 },
});
import { addDays, addMonths, format, isPast, isToday, startOfMonth, subMonths } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import FadeInView from '../../components/FadeInView';
import GreetingHeader from '../../components/GreetingHeader';
import LoadError from '../../components/LoadError';
import PressableScale from '../../components/PressableScale';
import Screen from '../../components/Screen';
import { SkeletonList } from '../../components/Skeleton';
import StatCard from '../../components/StatCard';
import StatusChip from '../../components/StatusChip';
import { useToast } from '../../components/Toast';
import { Body, BodyStrong, Heading, Label, Small } from '../../components/Typography';
import { Birthday, birthdayMessage, birthdaysWithin } from '../../lib/birthdays';
import { TTD } from '../../lib/money';
import { waLink } from '../../lib/phone';
import { rangeFor, Sales, salesBetween } from '../../lib/sales';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, shadow, space } from '../../lib/theme';
import type { AppointmentBalance, Client } from '../../lib/types';

export default function Dashboard() {
  const [today, setToday] = useState<Sales | null>(null);
  const [week, setWeek] = useState<Sales | null>(null);
  const [todayList, setTodayList] = useState<AppointmentBalance[]>([]);
  const [upcoming, setUpcoming] = useState<AppointmentBalance[]>([]);
  const [followUps, setFollowUps] = useState<Client[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday<Client>[]>([]);
  const [months, setMonths] = useState<{ label: string; value: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const now = new Date();
      const d = rangeFor('day', now), w = rangeFor('week', now);

      const [t, wk, list, next, fu, bd] = await Promise.all([
        salesBetween(d.from, d.to),
        salesBetween(w.from, w.to),
        supabase.from('appointment_balances').select('*').neq('status', 'cancelled')
          .gte('starts_at', d.from.toISOString()).lt('starts_at', d.to.toISOString()).order('starts_at'),
        supabase.from('appointment_balances').select('*').eq('status', 'booked')
          .gte('starts_at', d.to.toISOString()).lt('starts_at', w.to.toISOString()).order('starts_at').limit(5),
        supabase.from('clients').select('*').not('follow_up_date', 'is', null)
          .lte('follow_up_date', format(addDays(now, 7), 'yyyy-MM-dd')).order('follow_up_date'),
        supabase.from('clients').select('*').not('birthday', 'is', null),
      ]);
      const queryError = list.error ?? next.error ?? fu.error ?? bd.error;
      if (queryError) throw queryError;
      setToday(t); setWeek(wk);
      setTodayList((list.data as AppointmentBalance[]) ?? []);
      setUpcoming((next.data as AppointmentBalance[]) ?? []);
      setFollowUps((fu.data as Client[]) ?? []);
      setBirthdays(birthdaysWithin((bd.data as Client[]) ?? [], now));

      // Six months of received revenue, oldest first
      const starts = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(now, 5 - i)));
      const totals = await Promise.all(starts.map((m) => salesBetween(m, addMonths(m, 1))));
      setMonths(starts.map((m, i) => ({ label: format(m, 'MMM'), value: totals[i].actual })));
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function clearFollowUp(id: string) {
    const { error } = await supabase.from('clients').update({ follow_up_date: null, follow_up_note: null }).eq('id', id);
    if (error) return Alert.alert('Update failed', error.message);
    toast.show('Follow-up done');
    load();
  }

  const weekBars = (week?.days ?? []).map((d) => ({
    label: format(d.date, 'EEEEE'),
    stacks: [{ value: d.actual, color: colors.chartReceived }, { value: d.potential, color: colors.chartDue }],
  }));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const summary = loaded && !loadError
    ? `${todayList.length} booking${todayList.length === 1 ? '' : 's'} today · ${TTD(today?.expected ?? 0)} expected`
    : undefined;

  // Show the retry card instead of TT$0.00 tiles that look like real figures
  if (loadError) return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <GreetingHeader />
      <LoadError onRetry={load} />
    </Screen>
  );

  if (!loaded) return (
    <Screen>
      <GreetingHeader />
      <SkeletonList count={4} />
    </Screen>
  );

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <GreetingHeader summary={summary} />

      <View style={s.grid}>
        <StatCard label="Today received" amount={today?.actual ?? 0} format={TTD} color={colors.success} index={0} />
        <StatCard label="Today still due" amount={today?.potential ?? 0} format={TTD} color={colors.primary} index={1} />
        <StatCard label="Week received" amount={week?.actual ?? 0} format={TTD} color={colors.success} index={2} />
        <StatCard label="Week expected" amount={week?.expected ?? 0} format={TTD} index={3} />
      </View>

      <FadeInView index={4} style={s.section}>
        <Heading>Today · {todayList.length} booking{todayList.length === 1 ? '' : 's'}</Heading>
        {todayList.length === 0 && (
          <View style={s.card}>
            <EmptyState icon="calendar-outline" title="No bookings today" actionLabel="Book appointment"
              onAction={() => router.push('/appointment/new')} />
          </View>
        )}
        {todayList.map((a) => (
          <PressableScale key={a.id} style={s.row} onPress={() => router.push(`/appointment/${a.id}`)}>
            <BodyStrong style={s.time}>{format(new Date(a.starts_at), 'h:mm a')}</BodyStrong>
            <View style={{ flex: 1, gap: 2 }}>
              <BodyStrong>{a.client_name}</BodyStrong>
              <Label>{a.service_name}</Label>
            </View>
            <View style={s.chips}>
              {a.notes?.startsWith('[Website]') && <StatusChip status="website" />}
              {Number(a.balance) > 0
                ? <StatusChip status="owes" label={`Owes ${TTD(Number(a.balance))}`} />
                : <StatusChip status="paid" />}
            </View>
          </PressableScale>
        ))}
      </FadeInView>

      <FadeInView index={5} style={s.section}>
        <Heading>This week · {week?.bookings ?? 0} bookings</Heading>
        <View style={s.card}>
          <BarChart stackData={weekBars} barWidth={22} spacing={18} height={150} noOfSections={3}
            yAxisThickness={0} xAxisThickness={0} rulesColor={colors.chartGrid}
            yAxisTextStyle={s.axis} xAxisLabelTextStyle={s.axis} />
          <View style={s.legend}>
            <View style={[s.swatch, { backgroundColor: colors.chartReceived }]} /><Small>Received</Small>
            <View style={[s.swatch, { backgroundColor: colors.chartDue, marginLeft: space.md }]} /><Small>Still due</Small>
          </View>
        </View>
        {upcoming.map((a) => (
          <PressableScale key={a.id} style={s.row} onPress={() => router.push(`/appointment/${a.id}`)}>
            <BodyStrong style={s.time}>{format(new Date(a.starts_at), 'EEE h:mm a')}</BodyStrong>
            <Body style={{ flex: 1 }}>{a.client_name} · {a.service_name}</Body>
          </PressableScale>
        ))}
      </FadeInView>

      <FadeInView index={6} style={s.section}>
        <Heading>Birthdays this week</Heading>
        {birthdays.length === 0 && <Label>No birthdays in the next 7 days.</Label>}
        {birthdays.map(({ client: c, date, turning }) => (
          <View key={c.id} style={s.row}>
            <View style={{ flex: 1 }}>
              <PressableScale style={{ gap: 2 }} onPress={() => router.push(`/client/${c.id}`)}>
                <BodyStrong>🎂 {c.full_name}</BodyStrong>
                <Label style={isToday(date) ? { color: colors.primary } : undefined}>
                  {isToday(date) ? 'Today' : format(date, 'EEE d MMM')}{turning ? ` · turning ${turning}` : ''}
                </Label>
              </PressableScale>
            </View>
            {c.phone && (
              <Button title="Message" variant="ghost" icon="logo-whatsapp"
                onPress={() => Linking.openURL(waLink(c.phone!, birthdayMessage(c.full_name)))} />
            )}
          </View>
        ))}
      </FadeInView>

      <FadeInView index={7} style={s.section}>
        <Heading>Follow-ups</Heading>
        {followUps.length === 0 && <Label>No follow-ups due this week.</Label>}
        {followUps.map((c) => {
          const due = new Date(c.follow_up_date + 'T12:00');
          const overdue = isPast(due) && !isToday(due);
          return (
            <View key={c.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <PressableScale style={{ gap: 4 }} onPress={() => router.push(`/client/${c.id}`)}>
                  <BodyStrong>{c.full_name}</BodyStrong>
                  {overdue && <StatusChip status="overdue" />}
                  <Label>{format(due, 'EEE d MMM')}{c.follow_up_note ? ` · ${c.follow_up_note}` : ''}</Label>
                </PressableScale>
              </View>
              <Button title="Done" variant="ghost" onPress={() => clearFollowUp(c.id)} />
            </View>
          );
        })}
      </FadeInView>

      <FadeInView index={8} style={s.section}>
        <Heading>Received, last 6 months</Heading>
        <View style={s.card}>
          <BarChart data={months.map((m) => ({ value: m.value, label: m.label, frontColor: colors.chartReceived }))}
            barWidth={26} spacing={16} height={150} noOfSections={3} yAxisThickness={0} xAxisThickness={0}
            rulesColor={colors.chartGrid} yAxisTextStyle={s.axis} xAxisLabelTextStyle={s.axis} />
        </View>
      </FadeInView>
    </Screen>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  section: { gap: space.sm, marginTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface,
    padding: space.md, borderRadius: radius.lg, ...shadow.card },
  time: { width: 84 },
  chips: { alignItems: 'flex-end', gap: space.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.sm, ...shadow.card },
  axis: { color: colors.textMuted, fontSize: 10, fontFamily: fonts.body },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs },
  swatch: { width: 10, height: 10, borderRadius: 2 },
});

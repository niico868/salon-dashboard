import { addDays, format, formatDistanceToNowStrict, isPast, isToday } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-gifted-charts';
import ActionPill from '../../components/ActionPill';
import { Text } from '../../components/AppText';
import Avatar from '../../components/Avatar';
import BookingChip from '../../components/BookingChip';
import Button from '../../components/Button';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import FadeInView from '../../components/FadeInView';
import GreetingHeader from '../../components/GreetingHeader';
import ListRow from '../../components/ListRow';
import LoadError from '../../components/LoadError';
import Screen from '../../components/Screen';
import SectionHeader from '../../components/SectionHeader';
import { SkeletonList } from '../../components/Skeleton';
import StatCard from '../../components/StatCard';
import StatusChip from '../../components/StatusChip';
import TimeBadge from '../../components/TimeBadge';
import { useToast } from '../../components/Toast';
import { Body, Small } from '../../components/Typography';
import { Birthday, birthdayMessage, birthdaysWithin } from '../../lib/birthdays';
import { TTD } from '../../lib/money';
import { waLink } from '../../lib/phone';
import { rangeFor, Sales, salesBetween } from '../../lib/sales';
import { supabase } from '../../lib/supabase';
import { colors, fonts, space } from '../../lib/theme';
import type { AppointmentBalance, Client, Enquiry } from '../../lib/types';

const SOURCE: Record<Enquiry['source'], string> = {
  contact: 'Contact form', consultation: 'Consultation request', 'treatment-finder': 'Treatment finder', visit: 'Visit request', other: 'Website',
};

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState<Sales | null>(null);
  const [week, setWeek] = useState<Sales | null>(null);
  const [todayList, setTodayList] = useState<AppointmentBalance[]>([]);
  const [upcoming, setUpcoming] = useState<AppointmentBalance[]>([]);
  const [followUps, setFollowUps] = useState<Client[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday<Client>[]>([]);
  const [loadError, setLoadError] = useState(false);
  // null = couldn't load (e.g. the enquiries table isn't set up yet); the rest of Home still shows
  const [enquiries, setEnquiries] = useState<Enquiry[] | null>(null);

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
          .gte('starts_at', d.to.toISOString()).lt('starts_at', addDays(d.to, 7).toISOString()).order('starts_at').limit(5),
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
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  const loadEnquiries = useCallback(async () => {
    const { data, error } = await supabase.from('enquiries').select('*').eq('status', 'new')
      .order('created_at', { ascending: false }).limit(20);
    setEnquiries(error ? null : (data as Enquiry[]));
  }, []);

  useFocusEffect(useCallback(() => { load(); loadEnquiries(); }, [load, loadEnquiries]));
  const refresh = () => Promise.all([load(), loadEnquiries()]);

  async function enquiryDone(id: string) {
    const { error } = await supabase.from('enquiries').update({ status: 'done', handled_at: new Date().toISOString() }).eq('id', id);
    if (error) return Alert.alert('Update failed', error.message);
    toast.show('Message marked as handled');
    loadEnquiries();
  }

  function addAsClient(e: Enquiry) {
    router.push({ pathname: '/client/new', params: {
      name: e.name, phone: e.phone ?? '', email: e.email ?? '', enquiry: e.id,
      notes: `Website enquiry (${SOURCE[e.source]}): ${e.message}`.slice(0, 500),
    } });
  }

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

  const stillToCollect = today?.potential ?? 0;
  const activeToday = todayList.filter((a) => a.status !== 'no_show');
  const summary = !loaded ? undefined
    : activeToday.length === 0 ? 'No bookings today.'
    : `${activeToday.length} booking${activeToday.length === 1 ? '' : 's'} today` +
      (stillToCollect > 0 ? ` · ${TTD(stillToCollect)} still to collect` : ' · all paid');
  const attention = (enquiries?.length ?? 0) + followUps.length + birthdays.length;

  return (
    <Screen onRefresh={refresh} style={{ paddingTop: insets.top + space.md }}>
      <GreetingHeader summary={summary} />

      <View style={s.quick}>
        <Button title="New booking" icon="add-circle" size="lg" style={{ flex: 1, paddingHorizontal: 10 }}
          onPress={() => router.push('/appointment/new')} />
        <Button title="Add client" icon="person-add" size="lg" variant="outline" style={{ flex: 1, paddingHorizontal: 10 }}
          onPress={() => router.push('/client/new')} />
      </View>

      {loadError && <LoadError onRetry={load} />}
      {!loaded && <SkeletonList count={3} />}

      {loaded && !loadError && (
        <>
          <SectionHeader title="Today" count={activeToday.length}
            actionLabel="Open calendar" onAction={() => router.push('/calendar')} />
          {todayList.length === 0 ? (
            <Card style={{ padding: 0 }}>
              <EmptyState icon="sunny-outline" title="No bookings today" message="Enjoy the quiet, or add a booking."
                actionLabel="Book an appointment" onAction={() => router.push('/appointment/new')} />
            </Card>
          ) : todayList.map((a, i) => (
            <FadeInView key={a.id} index={i}>
              <ListRow title={a.client_name} subtitle={a.service_name}
                left={<TimeBadge date={new Date(a.starts_at)} />}
                right={<BookingChip a={a} />}
                accent={a.status === 'completed' ? colors.success : undefined}
                onPress={() => router.push(`/appointment/${a.id}`)} />
            </FadeInView>
          ))}

          <SectionHeader title="Money" />
          <View style={s.grid}>
            <StatCard label="Taken today" icon="checkmark-circle" amount={today?.actual ?? 0} format={TTD}
              color={colors.success} index={0} />
            <StatCard label="Still to collect today" icon="time" amount={stillToCollect} format={TTD}
              color={stillToCollect > 0 ? colors.primary : colors.text} index={1} />
            <StatCard label="Taken this week" amount={week?.actual ?? 0} format={TTD} color={colors.success} index={2} />
            <StatCard label="Expected this week" amount={week?.expected ?? 0} format={TTD} index={3} />
          </View>

          {attention > 0 && <SectionHeader title="Needs your attention" count={attention} />}

          {(enquiries ?? []).map((e) => (
            <Card key={e.id} style={s.enquiry}>
              <View style={s.line}>
                <Avatar name={e.name} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{e.name}</Text>
                  <Small>{SOURCE[e.source]} · {formatDistanceToNowStrict(new Date(e.created_at), { addSuffix: true })}</Small>
                </View>
                <StatusChip status="website" label={e.client_id ? 'Client' : 'New'} />
              </View>
              {!!e.message && <Body numberOfLines={5}>{e.message}</Body>}
              <View style={s.actions}>
                {e.phone ? (
                  <ActionPill label="WhatsApp" icon="logo-whatsapp" tone="whatsapp"
                    onPress={() => Linking.openURL(waLink(e.phone!, `Hi ${e.name.split(' ')[0]}, thank you for reaching out to Melt Aways! `))} />
                ) : e.email ? (
                  <ActionPill label="Email" icon="mail" tone="plain"
                    onPress={() => Linking.openURL(`mailto:${e.email}?subject=${encodeURIComponent('Your Melt Aways enquiry')}`)} />
                ) : null}
                {e.client_id
                  ? <ActionPill label="View client" icon="person" onPress={() => router.push(`/client/${e.client_id}`)} />
                  : <ActionPill label="Save as client" icon="person-add" onPress={() => addAsClient(e)} />}
                <ActionPill label="Handled" icon="checkmark" tone="success" onPress={() => enquiryDone(e.id)} />
              </View>
            </Card>
          ))}

          {followUps.map((c) => {
            const due = new Date(c.follow_up_date + 'T12:00');
            const overdue = isPast(due) && !isToday(due);
            return (
              <Card key={c.id}>
                <View style={s.line}>
                  <Avatar name={c.full_name} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>Follow up with {c.full_name}</Text>
                    <Small>{isToday(due) ? 'Due today' : `Due ${format(due, 'EEE d MMM')}`}</Small>
                  </View>
                  {overdue && <StatusChip status="overdue" />}
                </View>
                {!!c.follow_up_note && <Body>{c.follow_up_note}</Body>}
                <View style={s.actions}>
                  {c.phone && <ActionPill label="WhatsApp" icon="logo-whatsapp" tone="whatsapp"
                    onPress={() => Linking.openURL(waLink(c.phone!))} />}
                  <ActionPill label="View client" icon="person" onPress={() => router.push(`/client/${c.id}`)} />
                  <ActionPill label="Done" icon="checkmark" tone="success" onPress={() => clearFollowUp(c.id)} />
                </View>
              </Card>
            );
          })}

          {birthdays.map(({ client: c, date, turning }) => (
            <Card key={c.id}>
              <View style={s.line}>
                <View style={s.cake}><Text style={{ fontSize: 22 }}>🎂</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{c.full_name}'s birthday</Text>
                  <Small style={isToday(date) ? { color: colors.primary, fontFamily: fonts.bodyBold } : undefined}>
                    {isToday(date) ? 'Today!' : format(date, 'EEEE d MMMM')}{turning ? ` · turning ${turning}` : ''}
                  </Small>
                </View>
              </View>
              <View style={s.actions}>
                {c.phone && <ActionPill label="Send wishes" icon="logo-whatsapp" tone="whatsapp"
                  onPress={() => Linking.openURL(waLink(c.phone!, birthdayMessage(c.full_name)))} />}
                <ActionPill label="View client" icon="person" onPress={() => router.push(`/client/${c.id}`)} />
              </View>
            </Card>
          ))}

          <SectionHeader title="Coming up" actionLabel="See all" onAction={() => router.push('/calendar')} />
          {upcoming.length === 0
            ? <Body style={{ color: colors.textMuted }}>Nothing booked for the next 7 days.</Body>
            : upcoming.map((a) => (
              <ListRow key={a.id} title={a.client_name} subtitle={`${format(new Date(a.starts_at), 'EEEE d MMM')} · ${a.service_name}`}
                left={<TimeBadge date={new Date(a.starts_at)} showDay />}
                onPress={() => router.push(`/appointment/${a.id}`)} />
            ))}

          <SectionHeader title="This week" actionLabel="Sales details" onAction={() => router.push('/sales')} />
          <Card>
            <Small>{week?.bookings ?? 0} bookings this week</Small>
            <BarChart stackData={weekBars} barWidth={24} spacing={16} height={150} noOfSections={3}
              yAxisThickness={0} xAxisThickness={0} rulesColor={colors.border}
              yAxisTextStyle={{ color: colors.textMuted, fontSize: 12, fontFamily: fonts.body }}
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 13, fontFamily: fonts.bodyBold }} />
            <View style={s.legend}>
              <View style={s.legendItem}><View style={[s.dot, { backgroundColor: colors.chartReceived }]} /><Small>Taken</Small></View>
              <View style={s.legendItem}><View style={[s.dot, { backgroundColor: colors.chartDue }]} /><Small>Still to collect</Small></View>
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  quick: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { fontFamily: fonts.bodyBold, fontSize: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  enquiry: { borderLeftWidth: 5, borderLeftColor: colors.rose },
  cake: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: space.xl },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 3 },
});

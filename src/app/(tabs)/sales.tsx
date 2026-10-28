import { Ionicons } from '@expo/vector-icons';
import { addMonths, format, isSameDay, isSameMonth, isSameWeek, startOfMonth, subMonths } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Text } from '../../components/AppText';
import BookingChip from '../../components/BookingChip';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import LoadError from '../../components/LoadError';
import Screen from '../../components/Screen';
import Segmented from '../../components/Segmented';
import StatCard from '../../components/StatCard';
import { Body, Heading, Small } from '../../components/Typography';
import { shareAppointmentInvoice } from '../../lib/invoice';
import { TTD } from '../../lib/money';
import { Period, rangeFor, Sales, salesBetween, shift } from '../../lib/sales';
import { colors, fonts, radius, space } from '../../lib/theme';

const METHOD: Record<string, string> = { cash: 'Cash', card: 'Card', transfer: 'Bank transfer', online: 'Online' };

export default function SalesTab() {
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState(new Date());
  const [data, setData] = useState<Sales | null>(null);
  const [months, setMonths] = useState<{ label: string; value: number }[]>([]);
  const [loadError, setLoadError] = useState(false);
  const { from, to } = rangeFor(period, anchor);

  const load = useCallback(() => {
    const now = new Date();
    const starts = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(now, 5 - i)));
    return Promise.all([salesBetween(from, to), Promise.all(starts.map((m) => salesBetween(m, addMonths(m, 1))))])
      .then(([d, totals]) => {
        setData(d); setLoadError(false);
        setMonths(starts.map((m, i) => ({ label: format(m, 'MMM'), value: totals[i].actual })));
      })
      .catch(() => { setData(null); setLoadError(true); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, anchor]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const now = new Date();
  const isCurrent = period === 'day' ? isSameDay(from, now)
    : period === 'week' ? isSameWeek(from, now, { weekStartsOn: 1 }) : isSameMonth(from, now);
  const label = period === 'day' ? (isCurrent ? 'Today' : format(from, 'EEEE d MMM yyyy'))
    : period === 'week' ? (isCurrent ? 'This week' : `Week of ${format(from, 'd MMM')}`)
    : (isCurrent ? 'This month' : format(from, 'MMMM yyyy'));

  const bars = (data?.days ?? []).map((d, i, all) => ({
    stacks: [{ value: d.actual, color: colors.chartReceived }, { value: d.potential, color: colors.chartDue }],
    // Label every day for a week, every 5th day for a month
    label: all.length <= 7 ? format(d.date, 'EEEEE') : i % 5 === 0 ? format(d.date, 'd') : '',
  }));

  const top = Object.entries(data?.byService ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const methods = Object.entries(data?.byMethod ?? {});

  return (
    <Screen onRefresh={load}>
      <Segmented value={period} onChange={(p) => { setPeriod(p); setAnchor(new Date()); }}
        options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
      <View style={s.nav}>
        <Pressable onPress={() => setAnchor(shift(period, anchor, -1))} style={s.arrow}
          accessibilityRole="button" accessibilityLabel={`Previous ${period}`}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Heading>{label}</Heading>
          {!isCurrent && (
            <Pressable onPress={() => setAnchor(new Date())} hitSlop={10}>
              <Text style={s.back}>Back to {period === 'day' ? 'today' : `this ${period}`}</Text>
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => setAnchor(shift(period, anchor, 1))} style={s.arrow}
          accessibilityRole="button" accessibilityLabel={`Next ${period}`}>
          <Ionicons name="chevron-forward" size={26} color={colors.primary} />
        </Pressable>
      </View>

      {loadError ? <LoadError onRetry={load} /> : (
        <>
          <View style={s.grid}>
            <StatCard label="Money taken" icon="checkmark-circle" amount={data?.actual ?? 0} format={TTD} color={colors.success} index={0} />
            <StatCard label="Still to collect" icon="time" amount={data?.potential ?? 0} format={TTD} color={colors.primary} index={1} />
            <StatCard label="Total expected" amount={data?.expected ?? 0} format={TTD} index={2} hint="Taken + still to collect" />
            <StatCard label="Bookings" value={String(data?.bookings ?? 0)} index={3} />
          </View>

          {period !== 'day' && (
            <Card>
              <Heading>Day by day</Heading>
              <BarChart stackData={bars} barWidth={period === 'week' ? 24 : 6} spacing={period === 'week' ? 16 : 4}
                noOfSections={4} yAxisThickness={0} xAxisThickness={0} height={180} rulesColor={colors.border}
                yAxisTextStyle={{ color: colors.textMuted, fontSize: 12, fontFamily: fonts.body }}
                xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 13, fontFamily: fonts.bodyBold }} />
              <View style={s.legend}>
                <View style={s.legendItem}><View style={[s.dot, { backgroundColor: colors.chartReceived }]} /><Small>Taken</Small></View>
                <View style={s.legendItem}><View style={[s.dot, { backgroundColor: colors.chartDue }]} /><Small>Still to collect</Small></View>
              </View>
            </Card>
          )}

          <Card>
            <Heading>How clients paid</Heading>
            {methods.length === 0 && <Small>No payments taken yet.</Small>}
            {methods.map(([m, v]) => (
              <View key={m} style={s.line}><Body>{METHOD[m] ?? m}</Body><Body style={s.amount}>{TTD(v)}</Body></View>
            ))}
          </Card>

          <Card>
            <Heading>Most popular services</Heading>
            {top.length === 0 && <Small>No bookings yet.</Small>}
            {top.map(([name, v], i) => (
              <View key={name} style={s.line}>
                <Body style={{ flex: 1 }} numberOfLines={1}>{i + 1}. {name}</Body><Body style={s.amount}>{TTD(v)}</Body>
              </View>
            ))}
          </Card>

          <Card>
            <Heading>Bookings and invoices</Heading>
            {(data?.list ?? []).length === 0 && (
              <EmptyState icon="receipt-outline" title="No sales in this period" />
            )}
            {(data?.list ?? []).map((a) => (
              <View key={a.id} style={s.inv}>
                <Pressable style={{ flex: 1, gap: 4 }} onPress={() => router.push(`/appointment/${a.id}`)} accessibilityRole="button">
                  <Text style={s.invName}>{a.client_name}</Text>
                  <Small>{format(new Date(a.starts_at), 'EEE d MMM')} · {a.service_name} · {TTD(Number(a.price))}</Small>
                  <BookingChip a={a} />
                </Pressable>
                <Pressable onPress={() => shareAppointmentInvoice(a.id)} hitSlop={8} style={s.pdf}
                  accessibilityRole="button" accessibilityLabel={`Invoice for ${a.client_name}`}>
                  <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                  <Text style={s.pdfText}>Invoice</Text>
                </Pressable>
              </View>
            ))}
          </Card>

          <Card>
            <Heading>Last 6 months</Heading>
            <Small>Money taken each month</Small>
            <BarChart data={months.map((m) => ({ value: m.value, label: m.label, frontColor: colors.chartReceived }))}
              barWidth={26} spacing={16} height={150} noOfSections={3} yAxisThickness={0} xAxisThickness={0}
              rulesColor={colors.border} barBorderTopLeftRadius={6} barBorderTopRightRadius={6}
              yAxisTextStyle={{ color: colors.textMuted, fontSize: 12, fontFamily: fonts.body }}
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 13, fontFamily: fonts.bodyBold }} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center' },
  arrow: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blush },
  back: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 14, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md, paddingVertical: 4 },
  amount: { fontFamily: fonts.bodyBold },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: space.xl },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 3 },
  inv: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderTopWidth: 1, borderTopColor: colors.border },
  invName: { fontFamily: fonts.bodyBold, fontSize: 17 },
  pdf: { alignItems: 'center', gap: 2, padding: 8, borderRadius: radius.md, backgroundColor: colors.blush, minWidth: 64 },
  pdfText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 13 },
});

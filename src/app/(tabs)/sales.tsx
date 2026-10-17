import { format } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import EmptyState from '../../components/EmptyState';
import LoadError from '../../components/LoadError';
import PressableScale from '../../components/PressableScale';
import Screen from '../../components/Screen';
import { SkeletonList } from '../../components/Skeleton';
import StatCard from '../../components/StatCard';
import StatusChip from '../../components/StatusChip';
import { Body, BodyStrong, Heading, Label, Small } from '../../components/Typography';
import { shareAppointmentInvoice } from '../../lib/invoice';
import { TTD } from '../../lib/money';
import { Period, rangeFor, Sales, salesBetween, shift } from '../../lib/sales';
import { colors, fonts, radius, shadow, space, touch } from '../../lib/theme';

export default function SalesTab() {
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState(new Date());
  const [data, setData] = useState<Sales | null>(null);
  const [loadError, setLoadError] = useState(false);
  const { from } = rangeFor(period, anchor);

  const load = useCallback(() => {
    const { from, to } = rangeFor(period, anchor);
    salesBetween(from, to)
      .then((d) => { setData(d); setLoadError(false); })
      .catch(() => { setData(null); setLoadError(true); });
  }, [period, anchor]);
  useFocusEffect(load);

  const label = period === 'day' ? format(from, 'EEE d MMM yyyy')
    : period === 'week' ? `Week of ${format(from, 'd MMM')}` : format(from, 'MMMM yyyy');

  const bars = (data?.days ?? []).map((d, i, all) => ({
    stacks: [{ value: d.actual, color: colors.chartReceived }, { value: d.potential, color: colors.chartDue }],
    // Label every day for a week, every 5th day for a month
    label: all.length <= 7 ? format(d.date, 'EEEEE') : i % 5 === 0 ? format(d.date, 'd') : '',
  }));

  const top = Object.entries(data?.byService ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const empty = !!data && data.bookings === 0 && data.actual === 0;

  return (
    <Screen onRefresh={load}>
      <View style={s.seg}>
        {(['day', 'week', 'month'] as Period[]).map((p) => (
          <Pressable key={p} style={[s.segBtn, period === p && s.segOn]} onPress={() => { setPeriod(p); setAnchor(new Date()); }}
            accessibilityRole="tab" accessibilityState={{ selected: period === p }}>
            <Text style={[s.segText, period === p && s.segTextOn]}>{p[0].toUpperCase() + p.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.nav}>
        <Pressable style={s.arrow} onPress={() => setAnchor(shift(period, anchor, -1))} accessibilityLabel="Previous period">
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Heading>{label}</Heading>
        <Pressable style={s.arrow} onPress={() => setAnchor(shift(period, anchor, 1))} accessibilityLabel="Next period">
          <Ionicons name="chevron-forward" size={26} color={colors.primary} />
        </Pressable>
      </View>

      {loadError ? <LoadError onRetry={load} /> : !data ? <SkeletonList count={3} /> : (
        <>
          <View style={s.grid}>
            <StatCard label="Actual (received)" amount={data.actual} format={TTD} color={colors.success} index={0} />
            <StatCard label="Potential (still due)" amount={data.potential} format={TTD} color={colors.primary} index={1} />
            <StatCard label="Expected total" amount={data.expected} format={TTD} index={2} />
            <StatCard label="Bookings" amount={data.bookings} index={3} />
          </View>

          {empty ? (
            <View style={s.card}>
              <EmptyState icon="cash-outline" title="No sales in this period"
                message="Nothing was booked or paid. Try another day, week or month." />
            </View>
          ) : (
            <>
              {period !== 'day' && (
                <View style={s.card}>
                  <BarChart stackData={bars} barWidth={period === 'week' ? 22 : 6} spacing={period === 'week' ? 18 : 4}
                    noOfSections={4} yAxisThickness={0} xAxisThickness={0} hideRules={false} height={180}
                    rulesColor={colors.chartGrid} yAxisTextStyle={s.axis} xAxisLabelTextStyle={s.axis} />
                  <View style={s.legend}>
                    <View style={[s.swatch, { backgroundColor: colors.chartReceived }]} /><Small>Received</Small>
                    <View style={[s.swatch, { backgroundColor: colors.chartDue, marginLeft: space.md }]} /><Small>Still due</Small>
                  </View>
                </View>
              )}

              <View style={s.card}>
                <Heading>Received by method</Heading>
                {Object.keys(data.byMethod).length === 0 && <Label>No payments received yet.</Label>}
                {Object.entries(data.byMethod).map(([m, v]) => (
                  <View key={m} style={s.line}><Body style={{ textTransform: 'capitalize' }}>{m}</Body><BodyStrong>{TTD(v)}</BodyStrong></View>
                ))}
              </View>
              <View style={s.card}>
                <Heading>Top services (booked value)</Heading>
                {top.map(([name, v]) => (
                  <View key={name} style={s.line}><Body style={{ flex: 1 }}>{name}</Body><BodyStrong>{TTD(v)}</BodyStrong></View>
                ))}
              </View>
              <View style={s.card}>
                <Heading>Invoices</Heading>
                {data.list.length === 0 && <Label>No bookings in this period.</Label>}
                {data.list.map((a) => (
                  <View key={a.id} style={s.inv}>
                    <View style={{ flex: 1 }}>
                      <PressableScale style={{ gap: space.xs }} onPress={() => router.push(`/appointment/${a.id}`)}>
                        <BodyStrong>{a.client_name}</BodyStrong>
                        <Label>{format(new Date(a.starts_at), 'EEE d MMM')} · {a.service_name} · {TTD(Number(a.price))}</Label>
                        {Number(a.balance) > 0
                          ? <StatusChip status="owes" label={`Owes ${TTD(Number(a.balance))}`} />
                          : <StatusChip status="paid" />}
                      </PressableScale>
                    </View>
                    <Pressable onPress={() => shareAppointmentInvoice(a.id)} hitSlop={8} style={s.pdf}
                      accessibilityRole="button" accessibilityLabel={`Invoice PDF for ${a.client_name}`}>
                      <Text style={s.pdfText}>PDF</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: space.xs,
    borderWidth: 1, borderColor: colors.border },
  segBtn: { flex: 1, minHeight: touch.min - 8, justifyContent: 'center', alignItems: 'center', borderRadius: radius.sm },
  segOn: { backgroundColor: colors.primary },
  segText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  segTextOn: { fontFamily: fonts.bodyBold, color: colors.textOnPrimary },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { minWidth: touch.min, minHeight: touch.min, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm, ...shadow.card },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  axis: { color: colors.textMuted, fontSize: 10, fontFamily: fonts.body },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, marginTop: space.xs },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  inv: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  pdf: { paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: colors.blush },
  pdfText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
});

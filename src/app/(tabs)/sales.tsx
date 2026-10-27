import { format } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { BarChart } from 'react-native-gifted-charts';
import LoadError from '../../components/LoadError';
import Screen from '../../components/Screen';
import StatCard from '../../components/StatCard';
import { shareAppointmentInvoice } from '../../lib/invoice';
import { TTD } from '../../lib/money';
import { Period, rangeFor, Sales, salesBetween, shift } from '../../lib/sales';

const GREEN = '#2E7D32', PINK = '#E3B8B7';

export default function SalesTab() {
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState(new Date());
  const [data, setData] = useState<Sales | null>(null);
  const [loadError, setLoadError] = useState(false);
  const { from, to } = rangeFor(period, anchor);

  const load = useCallback(() => {
    salesBetween(from, to)
      .then((d) => { setData(d); setLoadError(false); })
      .catch(() => { setData(null); setLoadError(true); });
  }, [period, anchor]);
  useFocusEffect(load);

  const label = period === 'day' ? format(from, 'EEE d MMM yyyy')
    : period === 'week' ? `Week of ${format(from, 'd MMM')}` : format(from, 'MMMM yyyy');

  const bars = (data?.days ?? []).map((d, i, all) => ({
    stacks: [{ value: d.actual, color: GREEN }, { value: d.potential, color: PINK }],
    // Label every day for a week, every 5th day for a month
    label: all.length <= 7 ? format(d.date, 'EEEEE') : i % 5 === 0 ? format(d.date, 'd') : '',
  }));

  const top = Object.entries(data?.byService ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <Screen>
      <View style={s.seg}>
        {(['day', 'week', 'month'] as Period[]).map((p) => (
          <Pressable key={p} style={[s.segBtn, period === p && s.segOn]} onPress={() => { setPeriod(p); setAnchor(new Date()); }}>
            <Text style={period === p ? { color: 'white', fontWeight: '600' } : undefined}>{p[0].toUpperCase() + p.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.nav}>
        <Pressable onPress={() => setAnchor(shift(period, anchor, -1))}><Text style={s.arrow}>‹</Text></Pressable>
        <Text style={s.label}>{label}</Text>
        <Pressable onPress={() => setAnchor(shift(period, anchor, 1))}><Text style={s.arrow}>›</Text></Pressable>
      </View>

      {loadError ? <LoadError onRetry={load} /> : (
        <>
          <View style={s.grid}>
            <StatCard label="Actual (received)" value={TTD(data?.actual ?? 0)} color={GREEN} />
            <StatCard label="Potential (still due)" value={TTD(data?.potential ?? 0)} color="#9D3438" />
            <StatCard label="Expected total" value={TTD(data?.expected ?? 0)} />
            <StatCard label="Bookings" value={String(data?.bookings ?? 0)} />
          </View>

          {period !== 'day' && (
            <View style={s.card}>
              <BarChart stackData={bars} barWidth={period === 'week' ? 22 : 6} spacing={period === 'week' ? 18 : 4}
                noOfSections={4} yAxisThickness={0} xAxisThickness={0} hideRules={false} height={180}
                yAxisTextStyle={{ color: '#999', fontSize: 10 }} xAxisLabelTextStyle={{ color: '#999', fontSize: 10 }} />
              <View style={s.legend}>
                <Text><Text style={{ color: GREEN }}>■</Text> Received   <Text style={{ color: PINK }}>■</Text> Still due</Text>
              </View>
            </View>
          )}

          <View style={s.card}>
            <Text style={s.h}>Received by method</Text>
            {Object.entries(data?.byMethod ?? {}).map(([m, v]) => (
              <View key={m} style={s.line}><Text>{m}</Text><Text>{TTD(v)}</Text></View>
            ))}
          </View>
          <View style={s.card}>
            <Text style={s.h}>Top services (booked value)</Text>
            {top.map(([name, v]) => (
              <View key={name} style={s.line}><Text>{name}</Text><Text>{TTD(v)}</Text></View>
            ))}
          </View>
          <View style={s.card}>
            <Text style={s.h}>Invoices</Text>
            {(data?.list ?? []).length === 0 && <Text style={{ color: '#777' }}>No bookings in this period.</Text>}
            {(data?.list ?? []).map((a) => (
              <View key={a.id} style={s.inv}>
                <Pressable style={{ flex: 1 }} onPress={() => router.push(`/appointment/${a.id}`)}>
                  <Text style={{ fontWeight: '600' }}>{a.client_name}</Text>
                  <Text style={{ color: '#777' }}>{format(new Date(a.starts_at), 'EEE d MMM')} · {a.service_name} · {TTD(Number(a.price))}
                    {Number(a.balance) > 0 ? ` · owes ${TTD(Number(a.balance))}` : ' · paid'}</Text>
                </Pressable>
                <Pressable onPress={() => shareAppointmentInvoice(a.id)} hitSlop={8}><Text style={s.pdf}>PDF</Text></Pressable>
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 10, padding: 4 },
  segBtn: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  segOn: { backgroundColor: '#9D3438' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { fontSize: 32, color: '#9D3438', paddingHorizontal: 12 },
  label: { fontSize: 16, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 6 },
  h: { fontWeight: '700', fontSize: 16 },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  legend: { alignItems: 'center', marginTop: 4 },
  inv: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f3f3f3' },
  pdf: { color: '#9D3438', fontWeight: '600' },
});
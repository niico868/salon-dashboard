import { format } from 'date-fns';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import BookingChip from '../components/BookingChip';
import EmptyState from '../components/EmptyState';
import ListRow from '../components/ListRow';
import LoadError from '../components/LoadError';
import Screen from '../components/Screen';
import { SkeletonList } from '../components/Skeleton';
import { Label } from '../components/Typography';
import { TTD } from '../lib/money';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';
import type { AppointmentBalance } from '../lib/types';

// Two lists opened from Home: past visits nobody closed out, and past visits with money still owed.
export default function Visits() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  const owed = view === 'owed';
  const [list, setList] = useState<AppointmentBalance[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    const now = new Date().toISOString();
    const base = supabase.from('appointment_balances').select('*');
    const { data, error } = owed
      ? await base.in('status', ['booked', 'completed']).gt('balance', 0).lt('starts_at', now).order('starts_at')
      : await base.eq('status', 'booked').lt('ends_at', now).order('starts_at');
    if (error) return setLoadError(true);
    setLoadError(false);
    setList((data as AppointmentBalance[]) ?? []);
  }, [owed]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = (list ?? []).reduce((t, a) => t + Math.max(0, Number(a.balance)), 0);

  return (
    <Screen onRefresh={load}>
      <Stack.Screen options={{ title: owed ? 'Money owed' : 'Visits to close out' }} />
      {loadError && <LoadError onRetry={load} />}
      {list === null && !loadError && <SkeletonList count={3} />}
      {list !== null && list.length === 0 && (
        <EmptyState icon="checkmark-done-outline" title="All caught up"
          message={owed ? 'No client owes anything for a past visit.' : 'Every past visit has been closed out.'} />
      )}
      {list !== null && list.length > 0 && (owed ? (
        <View>
          <Label>Total owed</Label>
          <Text style={s.total}>{TTD(total)}</Text>
        </View>
      ) : (
        <Label>Open each visit, then mark it done or not shown up.</Label>
      ))}
      {(list ?? []).map((a) => (
        <ListRow key={a.id} title={a.client_name} subtitle={`${format(new Date(a.starts_at), 'EEE d MMM, h:mm a')} · ${a.service_name}`}
          right={<BookingChip a={a} />} onPress={() => router.push(`/appointment/${a.id}`)} />
      ))}
    </Screen>
  );
}

const s = StyleSheet.create({
  total: { fontFamily: fonts.bodyBold, fontSize: 34, lineHeight: 42, color: colors.text },
});

import { differenceInMinutes, format, isToday, setHours, setMinutes, startOfDay } from 'date-fns';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { colors, fonts, hours as salonHours, radius } from '../lib/theme';
import type { AppointmentBalance } from '../lib/types';

const OPEN_HOUR = salonHours.open, CLOSE_HOUR = salonHours.close;  // free time is only counted inside these
const VIEW_FROM = 8, VIEW_TO = 19;      // the grid always shows at least these hours
const OPEN_DAYS = [2, 3, 4, 5, 6];      // Tuesday to Saturday (0 = Sunday)
const HOUR_H = 72;                      // height of one hour in the grid
const MIN_GAP = 30;                     // shorter free gaps are left unlabeled
const COLOR = { booked: colors.primary, completed: colors.success } as const;

type Props = {
  date: Date;
  appts: AppointmentBalance[];
  onPressAppt: (id: string) => void;
  onPressSlot: (start: Date) => void;
};

const mins = (d: Date, day: Date) => differenceInMinutes(d, day);
const length = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);

// Side-by-side columns for bookings that overlap each other
function layout(items: { start: number; end: number; a: AppointmentBalance }[]) {
  const out: { start: number; end: number; a: AppointmentBalance; col: number; cols: number }[] = [];
  let cluster: typeof out = [], colEnds: number[] = [], clusterEnd = -1;
  const close = () => { for (const x of cluster) x.cols = colEnds.length; cluster = []; colEnds = []; };
  for (const it of items) {
    if (it.start >= clusterEnd) close();
    let col = colEnds.findIndex((e) => e <= it.start);
    if (col === -1) { col = colEnds.length; colEnds.push(it.end); } else colEnds[col] = it.end;
    const placed = { ...it, col, cols: 1 };
    cluster.push(placed); out.push(placed);
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  close();
  return out;
}

export default function DayView({ date, appts, onPressAppt, onPressSlot }: Props) {
  const day = startOfDay(date);
  const active = appts.filter((a) => a.status === 'booked' || a.status === 'completed');
  const items = active
    .map((a) => ({ start: mins(new Date(a.starts_at), day), end: mins(new Date(a.ends_at), day), a }))
    .sort((x, y) => x.start - y.start);

  // Stretch the grid if a booking falls outside normal hours
  const first = Math.min(VIEW_FROM, ...items.map((i) => Math.floor(i.start / 60)));
  const last = Math.max(VIEW_TO, ...items.map((i) => Math.ceil(i.end / 60)));
  const top = (m: number) => ((m - first * 60) / 60) * HOUR_H;
  const hours = Array.from({ length: last - first }, (_, i) => first + i);

  // Free time between bookings, within opening hours
  const open = OPEN_DAYS.includes(date.getDay());
  const gaps: { start: number; end: number }[] = [];
  let cursor = OPEN_HOUR * 60;
  if (open) {
    for (const it of items) {
      const end = Math.min(it.start, CLOSE_HOUR * 60);
      if (end - cursor >= MIN_GAP) gaps.push({ start: cursor, end });
      cursor = Math.max(cursor, it.end);
    }
    if (CLOSE_HOUR * 60 - cursor >= MIN_GAP) gaps.push({ start: cursor, end: CLOSE_HOUR * 60 });
  }
  const freeMin = gaps.filter((g) => g.end - g.start >= MIN_GAP).reduce((t, g) => t + g.end - g.start, 0);

  const now = mins(new Date(), day);
  const hidden = appts.length - active.length;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 96 }}>
      <Text style={s.summary}>
        {active.length} booking{active.length === 1 ? '' : 's'}
        {open ? ` · ${length(freeMin)} free` : ' · Salon closed'}
        {hidden ? ` · ${hidden} cancelled or no-show` : ''}
      </Text>
      <Text style={s.tip}>Tap an empty time to book it.</Text>
      <View style={{ height: hours.length * HOUR_H }}>
        {hours.map((h) => (
          <View key={h} style={[s.hour, { top: top(h * 60) }]}>
            <Text style={s.hourLabel}>{format(setHours(day, h), 'h a')}</Text>
            <View style={s.slots}>
              {[0, 30].map((m) => (
                <Pressable key={m} style={[s.slot, m === 30 && s.half]}
                  onPress={() => onPressSlot(setMinutes(setHours(day, h), m))} />
              ))}
            </View>
          </View>
        ))}

        <View style={s.lane}>
          {gaps.filter((g) => g.end - g.start >= MIN_GAP).map((g) => (
            <View key={g.start} style={[s.gap, { top: top(g.start) + 2, height: top(g.end) - top(g.start) - 4 }]}>
              <Text style={s.gapText}>Free {length(g.end - g.start)}</Text>
            </View>
          ))}
          {layout(items).map(({ start, end, a, col, cols }) => (
            <Pressable key={a.id} onPress={() => onPressAppt(a.id)}
              style={[s.appt, {
                top: top(start) + 1, height: Math.max(top(end) - top(start) - 2, 24),
                left: `${(col / cols) * 100}%`, width: `${100 / cols}%`, borderLeftColor: COLOR[a.status as keyof typeof COLOR],
              }]}>
              <Text style={s.apptName} numberOfLines={1}>{a.client_name}</Text>
              {end - start >= 45 && (
                <Text style={s.apptSub} numberOfLines={1}>
                  {format(new Date(a.starts_at), 'h:mm a')} – {format(new Date(a.ends_at), 'h:mm a')} · {a.service_name}
                </Text>
              )}
            </Pressable>
          ))}
          {isToday(date) && now >= first * 60 && now <= last * 60 && (
            <View style={[s.now, { top: top(now) }]} />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const LABEL_W = 56;
const s = StyleSheet.create({
  summary: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16, paddingHorizontal: 16, paddingTop: 8 },
  tip: { color: colors.textMuted, fontSize: 14, paddingHorizontal: 16, paddingBottom: 12 },
  hour: { position: 'absolute', left: 0, right: 0, height: HOUR_H, flexDirection: 'row' },
  hourLabel: { width: LABEL_W, textAlign: 'right', paddingRight: 8, fontSize: 13, color: colors.textMuted, marginTop: -8 },
  slots: { flex: 1, borderTopWidth: 1, borderTopColor: colors.border, marginRight: 8 },
  slot: { flex: 1 },
  half: { borderTopWidth: 1, borderTopColor: '#F6EEEC' },
  lane: { position: 'absolute', top: 0, bottom: 0, left: LABEL_W, right: 8, pointerEvents: 'box-none' },
  gap: { position: 'absolute', left: 0, right: 0, pointerEvents: 'none', borderRadius: radius.sm, borderWidth: 1, borderStyle: 'dashed',
    borderColor: '#A5D6A7', backgroundColor: '#F3F9EE', justifyContent: 'center', alignItems: 'center' },
  gapText: { color: '#3E7B27', fontSize: 14, fontWeight: '600' },
  appt: { position: 'absolute', backgroundColor: colors.surface, borderRadius: radius.sm, borderLeftWidth: 5, paddingHorizontal: 10,
    paddingVertical: 6, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  apptName: { fontWeight: '700', fontSize: 15 },
  apptSub: { color: colors.textMuted, fontSize: 14 },
  now: { position: 'absolute', pointerEvents: 'none', left: -4, right: 0, height: 2, backgroundColor: colors.primaryBright },
});

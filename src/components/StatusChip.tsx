import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../lib/theme';

// Small coloured pills with fixed meanings, used on lists, the calendar and appointment screens.
// <StatusChip status="booked" />   <StatusChip status="owes" label="Owes TT$200.00" />
export type ChipStatus = 'booked' | 'completed' | 'cancelled' | 'no_show' | 'paid' | 'owes' | 'pending' | 'overdue' | 'due' | 'website';

const LOOK: Record<ChipStatus, { label: string; fg: string; bg: string }> = {
  booked:    { label: 'Booked',    fg: colors.primary, bg: colors.blush },
  completed: { label: 'Done',      fg: colors.success, bg: colors.successBg },
  paid:      { label: 'Paid',      fg: colors.success, bg: colors.successBg },
  owes:      { label: 'Owes',      fg: colors.warning, bg: colors.warningBg },
  pending:   { label: 'Pending',   fg: colors.warning, bg: colors.warningBg },
  due:       { label: 'Due',       fg: colors.warning, bg: colors.warningBg },
  overdue:   { label: 'Overdue',   fg: colors.danger,  bg: colors.dangerBg },
  no_show:   { label: 'No-show',   fg: colors.danger,  bg: colors.dangerBg },
  cancelled: { label: 'Cancelled', fg: colors.neutral, bg: colors.neutralBg },
  website:   { label: 'Website',   fg: colors.primaryBright, bg: colors.blush },
};

export default function StatusChip({ status, label }: { status: ChipStatus; label?: string }) {
  const look = LOOK[status] ?? LOOK.booked;
  return (
    <View style={[s.chip, { backgroundColor: look.bg }]}>
      <Text style={[s.text, { color: look.fg }]}>{label ?? look.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  chip: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  text: { fontFamily: fonts.bodyBold, fontSize: 12 },
});

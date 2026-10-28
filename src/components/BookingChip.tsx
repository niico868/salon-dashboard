import { TTD } from '../lib/money';
import type { AppointmentBalance } from '../lib/types';
import StatusChip from './StatusChip';

// The one status that matters most for a booking: cancelled, no-show, still owes money, or paid.
export default function BookingChip({ a }: { a: AppointmentBalance }) {
  if (a.status === 'cancelled') return <StatusChip status="cancelled" />;
  if (a.status === 'no_show') return <StatusChip status="no_show" />;
  const owes = Number(a.balance);
  if (owes > 0) return <StatusChip status="owes" label={`Owes ${TTD(owes)}`} />;
  return <StatusChip status="paid" />;
}

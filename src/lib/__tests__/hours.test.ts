import { isOutsideHours, nextOpenSlot, openDaysFrom, outsideHoursMessage, slotIsTaken, slotsForDay } from '../hours';

// 3 Nov 2026 is a Tuesday
const on = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m);

describe('nextOpenSlot', () => {
  it('rounds up to the next quarter hour while open', () => expect(nextOpenSlot(on(3, 11, 7))).toEqual(on(3, 11, 15)));
  it('uses opening time before the spa opens', () => expect(nextOpenSlot(on(3, 8, 20))).toEqual(on(3, 10)));
  it('moves to the next open day after closing', () => expect(nextOpenSlot(on(3, 16, 30))).toEqual(on(4, 10)));
  it('moves to the next day when rounding reaches closing', () => expect(nextOpenSlot(on(3, 15, 50))).toEqual(on(4, 10)));
  it('skips Sunday and Monday', () => expect(nextOpenSlot(on(7, 17))).toEqual(on(10, 10)));
});

describe('isOutsideHours', () => {
  it('allows a booking that ends exactly at closing', () => expect(isOutsideHours(on(3, 15), on(3, 16))).toBe(false));
  it('flags a booking that runs past closing', () => expect(isOutsideHours(on(3, 15, 30), on(3, 16, 30))).toBe(true));
  it('flags a booking before opening', () => expect(isOutsideHours(on(3, 9), on(3, 10))).toBe(true));
  it('flags a closed day and names it', () => {
    expect(isOutsideHours(on(2, 11), on(2, 12))).toBe(true);
    expect(outsideHoursMessage(on(2, 11), on(2, 12))).toContain('Mondays');
  });
});

describe('openDaysFrom', () => {
  it('skips closed days', () => {
    expect(openDaysFrom(on(7, 12), 2)).toEqual([on(7, 0), on(10, 0)]);
  });
});

describe('slotsForDay', () => {
  it('lists half-hour starts that finish by closing', () => {
    const slots = slotsForDay(on(3, 0), 60);
    expect(slots[0]).toEqual(on(3, 10));
    expect(slots[slots.length - 1]).toEqual(on(3, 15));
    expect(slots.length).toBe(11);
  });
  it('has no slots for a treatment longer than the day', () => expect(slotsForDay(on(3, 0), 400).length).toBe(0));
});

describe('slotIsTaken', () => {
  const busy = [{ start: on(3, 11), end: on(3, 12) }];
  it('flags an overlap', () => expect(slotIsTaken(on(3, 10, 30), 60, busy)).toBe(true));
  it('allows finishing as another starts', () => expect(slotIsTaken(on(3, 10), 60, busy)).toBe(false));
  it('allows starting as another ends', () => expect(slotIsTaken(on(3, 12), 60, busy)).toBe(false));
});

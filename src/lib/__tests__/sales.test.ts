import { TTD } from '../money';
import { rangeFor, shift } from '../sales';

// lib/sales imports supabase; replace it with a dummy for these tests
jest.mock('../supabase', () => ({ supabase: {} }));

test('week starts on Monday', () => {
  const { from, to } = rangeFor('week', new Date(2026, 9, 15)); // Thu 15 Oct 2026
  expect(from.getDay()).toBe(1);           // Monday
  expect(from.getDate()).toBe(12);
  expect(to.getDate()).toBe(19);           // the following Monday
});

test('month range covers the whole month', () => {
  const { from, to } = rangeFor('month', new Date(2026, 1, 10)); // Feb 2026
  expect(from.getDate()).toBe(1);
  expect(to.getMonth()).toBe(2);           // 1 March
});

test('shift moves by one period', () => {
  expect(shift('month', new Date(2026, 0, 31), 1).getMonth()).toBe(1); // Jan 31 -> Feb
});

test('formats TT dollars', () => {
  expect(TTD(1234.5)).toBe('TT$1,234.50');
});
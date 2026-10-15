/// <reference types="jest" />
import { birthdaysWithin, nextBirthday } from '../birthdays';

const ymd = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];

test('birthday later this year', () => {
  expect(ymd(nextBirthday('1990-10-20', new Date(2026, 9, 15)))).toEqual([2026, 10, 20]);
});

test('birthday today counts as today', () => {
  expect(ymd(nextBirthday('1990-10-15', new Date(2026, 9, 15, 17, 30)))).toEqual([2026, 10, 15]);
});

test('birthday already passed rolls to next year', () => {
  expect(ymd(nextBirthday('1990-01-03', new Date(2026, 9, 15)))).toEqual([2027, 1, 3]);
});

test('29 Feb falls on 28 Feb in a non-leap year', () => {
  expect(ymd(nextBirthday('2000-02-29', new Date(2027, 0, 1)))).toEqual([2027, 2, 28]);
  expect(ymd(nextBirthday('2000-02-29', new Date(2028, 0, 1)))).toEqual([2028, 2, 29]);
});

test('week window wraps over new year and sorts soonest first', () => {
  const clients = [
    { name: 'A', birthday: '1985-01-02' },
    { name: 'B', birthday: '1992-12-30' },
    { name: 'C', birthday: '1992-01-10' },   // outside the 7 days
    { name: 'D', birthday: null },
    { name: 'E', birthday: 'not a date' },
  ];
  const got = birthdaysWithin(clients, new Date(2026, 11, 28));
  expect(got.map((b) => b.client.name)).toEqual(['B', 'A']);
  expect(got.map((b) => b.turning)).toEqual([34, 42]);
});

test('unknown birth year gives no age', () => {
  const [b] = birthdaysWithin([{ birthday: '1900-10-16' }], new Date(2026, 9, 15));
  expect(b.turning).toBeNull();
});

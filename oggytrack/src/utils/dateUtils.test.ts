import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDateISO,
  addDaysISO,
  getDayOfWeekFromISO,
  getMonthCalendarGrid,
  getDaysDifference,
  formatMonthYear,
} from './dateUtils';

test('formatDateISO formats local date components accurately', () => {
  const dt = new Date(2026, 9, 23, 14, 30, 0); // Oct 23, 2026
  assert.equal(formatDateISO(dt), '2026-10-23');
});

test('getDayOfWeekFromISO maps calendar dates to exact weekday names', () => {
  assert.equal(getDayOfWeekFromISO('2026-10-23'), 'Friday');
  assert.equal(getDayOfWeekFromISO('2026-10-21'), 'Wednesday');
  assert.equal(getDayOfWeekFromISO('2026-10-25'), 'Sunday');
});

test('addDaysISO handles month rollovers cleanly', () => {
  assert.equal(addDaysISO('2026-10-30', 3), '2026-11-02');
  assert.equal(addDaysISO('2026-12-31', 1), '2027-01-01');
});

test('getMonthCalendarGrid builds accurate month cells for any month and year', () => {
  // October 2026 starts on Thursday (index 4) and has 31 days -> 35 slots total
  const oct2026 = getMonthCalendarGrid(2026, 9);
  assert.equal(oct2026.length, 35);
  assert.equal(oct2026[0], null);
  assert.equal(oct2026[3], null);
  assert.equal(oct2026[4], '2026-10-01');
  assert.equal(oct2026[34], '2026-10-31');

  // February 2028 (leap year) has 29 days, Feb 1 2028 is Tuesday (index 2)
  const feb2028 = getMonthCalendarGrid(2028, 1);
  assert.equal(feb2028[0], null);
  assert.equal(feb2028[1], null);
  assert.equal(feb2028[2], '2028-02-01');
  assert.equal(feb2028[feb2028.length - 1], '2028-02-29');
  assert.equal(formatMonthYear(2028, 1), 'February 2028');
});

test('getDaysDifference computes exact day offsets', () => {
  assert.equal(getDaysDifference('2026-10-23', '2026-10-23'), 0);
  assert.equal(getDaysDifference('2026-10-23', '2026-10-24'), 1);
  assert.equal(getDaysDifference('2026-10-23', '2026-11-02'), 10);
  assert.equal(getDaysDifference('2026-10-23', '2026-10-20'), -3);
});

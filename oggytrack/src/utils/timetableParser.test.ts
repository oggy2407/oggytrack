import test from 'node:test';
import assert from 'node:assert/strict';
import { isTimeOverlap } from './timetableParser.ts';

test('isTimeOverlap detects overlapping periods', () => {
  // 09:30-10:45 overlaps with 10:00-11:15
  assert.equal(isTimeOverlap('09:30', '10:45', '10:00', '11:15'), true);
  // 09:00-10:00 does not overlap with 10:00-11:00 (back-to-back classes)
  assert.equal(isTimeOverlap('09:00', '10:00', '10:00', '11:00'), false);
  // 14:00-16:00 completely engulfs 14:30-15:30
  assert.equal(isTimeOverlap('14:00', '16:00', '14:30', '15:30'), true);
  // Separate morning and afternoon
  assert.equal(isTimeOverlap('09:00', '10:00', '14:00', '15:00'), false);
});

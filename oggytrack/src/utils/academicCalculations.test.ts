import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAttendance, predictAttendance, projectAttendance } from './academicCalculations';

test('calculateAttendance returns 0% (never 100%) when no classes have been conducted yet', () => {
  const stats = calculateAttendance(0, 0, 75);
  assert.equal(stats.conducted, 0);
  assert.equal(stats.percentage, 0);
  assert.equal(stats.isBelowTarget, false);
  assert.equal(stats.statusLabel, 'No Classes Yet');

  const pred = predictAttendance(0, 0, 75);
  assert.equal(pred.canSafeMiss, 0);
  assert.equal(pred.mustAttendConsecutive, 0);
  assert.match(pred.explanation, /No classes recorded yet/);

  assert.equal(projectAttendance(0, 0, 0, 0), 0);
});

test('calculateAttendance computes correct percentage and excludes cancelled classes', () => {
  // 16 attended out of 20 conducted = 80.0%
  const stats = calculateAttendance(16, 4, 75);
  assert.equal(stats.conducted, 20);
  assert.equal(stats.attended, 16);
  assert.equal(stats.missed, 4);
  assert.equal(stats.percentage, 80.0);
  assert.equal(stats.isBelowTarget, false);
});

test('calculateAttendance flags attendance below target', () => {
  // 14 attended out of 20 conducted = 70.0% with target 75%
  const stats = calculateAttendance(14, 6, 75);
  assert.equal(stats.percentage, 70.0);
  assert.equal(stats.isBelowTarget, true);
  assert.equal(stats.statusLabel, 'Warning');
});

test('predictAttendance computes safe misses for above-target student', () => {
  // 18 attended out of 20 = 90%. Target is 75%.
  // If misses x classes: 18 / (20 + x) >= 0.75 => 18 >= 15 + 0.75x => 3 >= 0.75x => x <= 4
  const pred = predictAttendance(18, 2, 75);
  assert.equal(pred.canSafeMiss, 4);
  assert.equal(pred.mustAttendConsecutive, 0);
  assert.equal(pred.isTargetReachable, true);
  assert.match(pred.explanation, /safely miss 4 classes/);
});

test('predictAttendance computes consecutive required classes for below-target student', () => {
  // 12 attended out of 20 = 60%. Target is 75%.
  // To reach 75%: (12 + y) / (20 + y) >= 0.75 => 12 + y >= 15 + 0.75y => 0.25y >= 3 => y >= 12
  const pred = predictAttendance(12, 8, 75);
  assert.equal(pred.canSafeMiss, 0);
  assert.equal(pred.mustAttendConsecutive, 12);
  assert.equal(pred.isTargetReachable, true);
  assert.match(pred.explanation, /Attend next 12 consecutive classes/);
});

test('projectAttendance correctly forecasts future combinations', () => {
  // Currently 10 attended, 2 missed. Future: attend 5, miss 1.
  // Total attended: 15. Total conducted: 18. 15 / 18 * 100 = 83.3%
  const projected = projectAttendance(10, 2, 5, 1);
  assert.equal(projected, 83.3);
});

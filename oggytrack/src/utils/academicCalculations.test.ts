import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBackfillAttendanceRecords,
  calculateAttendance,
  calculateExamPercentage,
  predictAttendance,
  projectAttendance,
  summarizeDateAttendance,
  summarizeSubjectExams,
  validateExamInput,
} from './academicCalculations';
import { AttendanceRecord, Holiday, SubjectExam, TimetableEntry } from '../types/oggytrack';

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

test('buildBackfillAttendanceRecords generates exact historical counts on scheduled past weekdays', () => {
  const records = buildBackfillAttendanceRecords({
    userId: 'usr_oggy',
    subjectId: 'sub_cs101',
    attended: 8,
    missed: 2,
    cancelled: 1,
    endDateISO: '2026-10-22',
    scheduledDays: ['Monday', 'Wednesday'],
  });

  assert.equal(records.length, 11);
  assert.equal(records.filter((r) => r.status === 'present').length, 8);
  assert.equal(records.filter((r) => r.status === 'absent').length, 2);
  assert.equal(records.filter((r) => r.status === 'cancelled').length, 1);
  assert.ok(records.every((r) => r.date <= '2026-10-22'));
});

test('summarizeDateAttendance matches scheduled timetable slots, extra logs, and holidays on a calendar date', () => {
  // 2026-10-26 is a Monday
  const timetable: TimetableEntry[] = [
    {
      id: 'tt_1',
      userId: 'usr_1',
      subjectId: 'sub_algo',
      subjectName: 'Algorithms',
      code: 'CS301',
      day: 'Monday',
      startTime: '09:30',
      endTime: '10:30',
      room: 'Hall B',
      faculty: 'Dr. Vance',
      type: 'Lecture',
      color: '#10b981',
      recurrence: 'weekly',
    },
    {
      id: 'tt_2',
      userId: 'usr_1',
      subjectId: 'sub_math',
      subjectName: 'Linear Algebra',
      code: 'MATH240',
      day: 'Monday',
      startTime: '11:00',
      endTime: '12:00',
      room: 'Room 102',
      faculty: 'Prof. Chen',
      type: 'Tutorial',
      color: '#3b82f6',
      recurrence: 'weekly',
    },
  ];

  const attendance: AttendanceRecord[] = [
    {
      id: 'att_slot_1',
      userId: 'usr_1',
      subjectId: 'sub_algo',
      timetableEntryId: 'tt_1',
      date: '2026-10-26',
      status: 'present',
      timestamp: '2026-10-26T09:35:00.000Z',
    },
    {
      id: 'att_extra_1',
      userId: 'usr_1',
      subjectId: 'sub_db',
      date: '2026-10-26',
      status: 'absent',
      note: 'Extra lab',
      timestamp: '2026-10-26T15:00:00.000Z',
    },
  ];

  const holidays: Holiday[] = [
    {
      id: 'hol_1',
      userId: 'usr_1',
      title: 'Autumn Break',
      startDate: '2026-10-28',
      endDate: '2026-10-30',
      type: 'Semester Break',
      cancelsClasses: true,
    },
  ];

  const mondaySummary = summarizeDateAttendance('2026-10-26', timetable, attendance, holidays);
  assert.equal(mondaySummary.dayOfWeek, 'Monday');
  assert.equal(mondaySummary.scheduledClasses.length, 2);
  assert.equal(mondaySummary.scheduledClasses[0].status, 'present');
  assert.equal(mondaySummary.scheduledClasses[1].status, undefined);
  assert.equal(mondaySummary.extraRecords.length, 1);
  assert.equal(mondaySummary.presentCount, 1);
  assert.equal(mondaySummary.absentCount, 1);
  assert.equal(mondaySummary.scheduledMarkedCount, 1);
  assert.equal(mondaySummary.allScheduledMarkedPresent, false);
  assert.equal(mondaySummary.suspendingHoliday, null);

  // Mark second scheduled slot present and verify allScheduledMarkedPresent becomes true
  const fullAttendance: AttendanceRecord[] = [
    ...attendance,
    {
      id: 'att_slot_2',
      userId: 'usr_1',
      subjectId: 'sub_math',
      timetableEntryId: 'tt_2',
      date: '2026-10-26',
      status: 'present',
      timestamp: '2026-10-26T11:05:00.000Z',
    },
  ];
  const mondayFull = summarizeDateAttendance('2026-10-26', timetable, fullAttendance, holidays);
  assert.equal(mondayFull.allScheduledMarkedPresent, true);
  assert.equal(mondayFull.presentCount, 2);

  // Holiday date check
  const holidaySummary = summarizeDateAttendance('2026-10-29', timetable, attendance, holidays);
  assert.equal(holidaySummary.suspendingHoliday?.title, 'Autumn Break');
});

test('summarizeSubjectExams computes marks totals, unweighted & weighted percentages, and next upcoming exam', () => {
  const emptySummary = summarizeSubjectExams([], '2026-10-30');
  assert.equal(emptySummary.totalExams, 0);
  assert.equal(emptySummary.gradedCount, 0);
  assert.equal(emptySummary.averagePercentage, null);
  assert.equal(emptySummary.standingLabel, 'No Marks Yet');

  const exams: SubjectExam[] = [
    {
      id: 'ex_1',
      userId: 'usr_1',
      subjectId: 'sub_algo',
      subjectCode: 'CS301',
      subjectName: 'Algorithms',
      title: 'Quiz 1',
      category: 'Quiz',
      examDate: '2026-10-15',
      marksObtained: 18,
      maxMarks: 20,
      weightage: 20,
      createdAt: '2026-10-15T10:00:00.000Z',
    },
    {
      id: 'ex_2',
      userId: 'usr_1',
      subjectId: 'sub_algo',
      subjectCode: 'CS301',
      subjectName: 'Algorithms',
      title: 'Midterm Exam',
      category: 'Midterm',
      examDate: '2026-10-25',
      marksObtained: 40,
      maxMarks: 50,
      weightage: 30,
      createdAt: '2026-10-25T10:00:00.000Z',
    },
    {
      id: 'ex_3',
      userId: 'usr_1',
      subjectId: 'sub_algo',
      subjectCode: 'CS301',
      subjectName: 'Algorithms',
      title: 'End-Term Final',
      category: 'End-Term',
      examDate: '2026-11-18',
      startTime: '09:30',
      marksObtained: null,
      maxMarks: 100,
      weightage: 50,
      createdAt: '2026-10-28T10:00:00.000Z',
    },
  ];

  assert.equal(calculateExamPercentage(18, 20), 90.0);
  const summary = summarizeSubjectExams(exams, '2026-10-30');
  assert.equal(summary.totalExams, 3);
  assert.equal(summary.gradedCount, 2);
  assert.equal(summary.pendingMarksCount, 1);
  assert.equal(summary.upcomingCount, 1);
  assert.equal(summary.nextExam?.id, 'ex_3');
  assert.equal(summary.totalObtained, 58);
  assert.equal(summary.totalMax, 70);
  // Raw: 58 / 70 = 82.9%
  assert.equal(summary.averagePercentage, 82.9);
  // Weighted across graded: (90 * 20 + 80 * 30) / 50 = (1800 + 2400) / 50 = 84.0%
  assert.equal(summary.weightedPercentage, 84.0);
  assert.equal(summary.standingLabel, 'Merit');
});

test('validateExamInput rejects out-of-range marks and accepts valid graded or scheduled exams', () => {
  assert.match(
    validateExamInput({ title: '', examDate: '2026-11-05', maxMarks: 50 }) || '',
    /exam title/i
  );
  assert.match(
    validateExamInput({ title: 'Midterm', examDate: '2026-11-05', maxMarks: 0 }) || '',
    /greater than 0/i
  );
  assert.match(
    validateExamInput({
      title: 'Midterm',
      examDate: '2026-11-05',
      maxMarks: 50,
      marksObtained: 55,
    }) || '',
    /cannot exceed maximum marks/i
  );
  assert.match(
    validateExamInput({
      title: 'Midterm',
      examDate: '2026-11-05',
      maxMarks: 50,
      marksObtained: -2,
    }) || '',
    /cannot be negative/i
  );
  assert.equal(
    validateExamInput({
      title: 'End-Term Exam',
      examDate: '2026-12-10',
      maxMarks: 100,
      marksObtained: null,
      weightage: 50,
    }),
    null
  );
  assert.equal(
    validateExamInput({
      title: 'Quiz 1',
      examDate: '2026-10-12',
      maxMarks: 25,
      marksObtained: 22.5,
      weightage: 15,
    }),
    null
  );
});




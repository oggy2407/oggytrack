/**
 * Academic calculation utilities for oggytrack.
 * Pure mathematical functions for attendance calculations, threshold warnings,
 * safe skips ("bunk budget"), and attendance recovery requirements.
 */

import {
  AttendanceRecord,
  AttendanceStatus,
  DayOfWeek,
  Holiday,
  SubjectExam,
  TimetableEntry,
} from '../types/oggytrack';
import { addDaysISO, formatDateISO, getDayOfWeekFromISO } from './dateUtils';

export interface AttendanceStats {
  conducted: number;
  attended: number;
  missed: number;
  percentage: number;
  isBelowTarget: boolean;
  statusLabel: string;
}

/**
 * Calculates current attendance percentage.
 * Cancelled classes are strictly excluded from the denominator.
 */
export function calculateAttendance(
  attended: number,
  missed: number,
  targetPercentage: number = 75
): AttendanceStats {
  const conducted = attended + missed;

  if (conducted === 0) {
    return {
      conducted: 0,
      attended: 0,
      missed: 0,
      percentage: 0,
      isBelowTarget: false,
      statusLabel: 'No Classes Yet',
    };
  }

  const percentage = Number(((attended / conducted) * 100).toFixed(1));
  const isBelowTarget = percentage < targetPercentage;

  let statusLabel = 'On Track';
  if (percentage >= 90) statusLabel = 'Excellent';
  else if (percentage >= targetPercentage) statusLabel = 'Satisfactory';
  else if (percentage >= targetPercentage - 10) statusLabel = 'Warning';
  else statusLabel = 'Critical';

  return {
    conducted,
    attended,
    missed,
    percentage,
    isBelowTarget,
    statusLabel
  };
}

/**
 * Calculates how many consecutive classes must be attended to reach the target attendance,
 * OR how many classes can be safely missed without dropping below the target.
 */
export interface AttendancePrediction {
  canSafeMiss: number;
  mustAttendConsecutive: number;
  isTargetReachable: boolean;
  explanation: string;
}

export function predictAttendance(
  attended: number,
  missed: number,
  targetPercentage: number = 75
): AttendancePrediction {
  const conducted = attended + missed;

  if (conducted === 0) {
    return {
      canSafeMiss: 0,
      mustAttendConsecutive: 0,
      isTargetReachable: true,
      explanation: 'No classes recorded yet. Mark attendance to see predictions.',
    };
  }

  if (targetPercentage >= 100) {
    if (missed > 0) {
      return {
        canSafeMiss: 0,
        mustAttendConsecutive: 0,
        isTargetReachable: false,
        explanation: '100% target is mathematically impossible with prior absences.'
      };
    }
    return {
      canSafeMiss: 0,
      mustAttendConsecutive: 0,
      isTargetReachable: true,
      explanation: 'Currently at 100%. Must attend all future classes.'
    };
  }

  const targetRatio = targetPercentage / 100;
  const currentRatio = attended / conducted;

  if (currentRatio >= targetRatio) {
    const maxMissable = Math.floor((attended - targetRatio * conducted) / targetRatio);
    const safeMiss = Math.max(0, maxMissable);

    return {
      canSafeMiss: safeMiss,
      mustAttendConsecutive: 0,
      isTargetReachable: true,
      explanation: safeMiss > 0 
        ? `You can safely miss ${safeMiss} ${safeMiss === 1 ? 'class' : 'classes'} and stay at or above ${targetPercentage}%.`
        : `You are right on the edge of ${targetPercentage}%. Do not miss any upcoming classes.`
    };
  } else {
    const needed = Math.ceil((targetRatio * conducted - attended) / (1 - targetRatio));
    const consecutive = Math.max(1, needed);

    return {
      canSafeMiss: 0,
      mustAttendConsecutive: consecutive,
      isTargetReachable: true,
      explanation: `Attend next ${consecutive} consecutive ${consecutive === 1 ? 'class' : 'classes'} to reach ${targetPercentage}%.`
    };
  }
}

/**
 * Projects future attendance if user attends A classes and misses M classes.
 */
export function projectAttendance(
  currentAttended: number,
  currentMissed: number,
  futureAttended: number,
  futureMissed: number
): number {
  const totalAttended = currentAttended + futureAttended;
  const totalConducted = (currentAttended + currentMissed) + (futureAttended + futureMissed);
  if (totalConducted === 0) return 0;
  return Number(((totalAttended / totalConducted) * 100).toFixed(1));
}

export interface BackfillAttendanceOptions {
  userId: string;
  subjectId: string;
  attended: number;
  missed: number;
  cancelled?: number;
  endDateISO?: string;
  scheduledDays?: DayOfWeek[];
  note?: string;
}

/**
 * Generates dated historical AttendanceRecord entries walking backward across scheduled
 * (or Monday-Friday working) days so students can backfill past attendance totals accurately.
 */
export function buildBackfillAttendanceRecords({
  userId,
  subjectId,
  attended,
  missed,
  cancelled = 0,
  endDateISO,
  scheduledDays = [],
  note = 'Past attendance record',
}: BackfillAttendanceOptions): AttendanceRecord[] {
  const safeAttended = Math.max(0, Math.floor(attended));
  const safeMissed = Math.max(0, Math.floor(missed));
  const safeCancelled = Math.max(0, Math.floor(cancelled));
  const totalCount = safeAttended + safeMissed + safeCancelled;

  if (totalCount === 0) return [];

  const statuses: Array<'present' | 'absent' | 'cancelled'> = [];
  for (let i = 0; i < safeAttended; i++) statuses.push('present');
  for (let i = 0; i < safeMissed; i++) statuses.push('absent');
  for (let i = 0; i < safeCancelled; i++) statuses.push('cancelled');

  const defaultDays: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const activeDays = scheduledDays.length > 0 ? scheduledDays : defaultDays;
  const daySlotFrequency = new Map<DayOfWeek, number>();
  for (const d of activeDays) {
    daySlotFrequency.set(d, (daySlotFrequency.get(d) || 0) + 1);
  }

  let cursorISO = endDateISO || addDaysISO(formatDateISO(new Date()), -1);
  const dates: string[] = [];
  let safetyCounter = 0;

  while (dates.length < totalCount && safetyCounter < totalCount * 14 + 30) {
    const dow = getDayOfWeekFromISO(cursorISO);
    const slotsOnDay = daySlotFrequency.get(dow) || 0;
    for (let s = 0; s < slotsOnDay && dates.length < totalCount; s++) {
      dates.push(cursorISO);
    }
    cursorISO = addDaysISO(cursorISO, -1);
    safetyCounter++;
  }

  while (dates.length < totalCount) {
    dates.push(cursorISO);
    cursorISO = addDaysISO(cursorISO, -1);
  }

  const nowTs = new Date().toISOString();
  return statuses.map((status, idx) => ({
    id: `att_past_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    subjectId,
    date: dates[idx],
    status,
    note,
    timestamp: nowTs,
  }));
}

export interface DateAttendanceSummary {
  dateISO: string;
  dayOfWeek: DayOfWeek;
  scheduledClasses: Array<{
    entry: TimetableEntry;
    record?: AttendanceRecord;
    status?: AttendanceStatus;
  }>;
  extraRecords: AttendanceRecord[];
  presentCount: number;
  absentCount: number;
  cancelledCount: number;
  totalLoggedCount: number;
  scheduledMarkedCount: number;
  allScheduledMarkedPresent: boolean;
  suspendingHoliday: Holiday | null;
}

/**
 * Computes scheduled class slots, extra logged sessions, status counts, and holiday suspension
 * for any YYYY-MM-DD calendar date.
 */
export function summarizeDateAttendance(
  dateISO: string,
  timetable: TimetableEntry[],
  attendance: AttendanceRecord[],
  holidays: Holiday[] = []
): DateAttendanceSummary {
  const dayOfWeek = getDayOfWeekFromISO(dateISO);
  const dayTimetable = timetable
    .filter((t) => t.day === dayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const dateRecords = attendance.filter((r) => r.date === dateISO);
  const matchedRecordIds = new Set<string>();

  const scheduledClasses = dayTimetable.map((entry) => {
    const record = dateRecords.find(
      (r) =>
        !matchedRecordIds.has(r.id) &&
        r.subjectId === entry.subjectId &&
        r.timetableEntryId === entry.id
    );
    if (record) {
      matchedRecordIds.add(record.id);
    }
    return {
      entry,
      record,
      status: record?.status,
    };
  });

  const extraRecords = dateRecords
    .filter((r) => !matchedRecordIds.has(r.id))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const presentCount = dateRecords.filter((r) => r.status === 'present').length;
  const absentCount = dateRecords.filter((r) => r.status === 'absent').length;
  const cancelledCount = dateRecords.filter((r) => r.status === 'cancelled').length;
  const scheduledMarkedCount = scheduledClasses.filter((s) => Boolean(s.status)).length;
  const allScheduledMarkedPresent =
    scheduledClasses.length > 0 && scheduledClasses.every((s) => s.status === 'present');

  const suspendingHoliday =
    holidays.find(
      (h) => h.cancelsClasses && dateISO >= h.startDate && dateISO <= h.endDate
    ) || null;

  return {
    dateISO,
    dayOfWeek,
    scheduledClasses,
    extraRecords,
    presentCount,
    absentCount,
    cancelledCount,
    totalLoggedCount: dateRecords.length,
    scheduledMarkedCount,
    allScheduledMarkedPresent,
    suspendingHoliday,
  };
}



export interface SubjectExamSummary {
  totalExams: number;
  gradedCount: number;
  pendingMarksCount: number;
  upcomingCount: number;
  nextExam: SubjectExam | null;
  totalObtained: number;
  totalMax: number;
  averagePercentage: number | null;
  weightedPercentage: number | null;
  standingLabel: string;
}

export function calculateExamPercentage(marksObtained: number, maxMarks: number): number {
  if (!Number.isFinite(marksObtained) || !Number.isFinite(maxMarks) || maxMarks <= 0) {
    return 0;
  }
  return Number(((marksObtained / maxMarks) * 100).toFixed(1));
}

export function getExamPerformanceStanding(percentage: number | null): string {
  if (percentage === null || !Number.isFinite(percentage)) return 'No Marks Yet';
  if (percentage >= 85) return 'Distinction';
  if (percentage >= 70) return 'Merit';
  if (percentage >= 50) return 'Pass';
  return 'Needs Review';
}

export function summarizeSubjectExams(
  exams: SubjectExam[],
  todayISO: string = formatDateISO(new Date())
): SubjectExamSummary {
  const gradedExams = exams.filter(
    (e) =>
      e.marksObtained !== null &&
      e.marksObtained !== undefined &&
      Number.isFinite(e.marksObtained) &&
      e.maxMarks > 0
  );

  const upcomingSorted = exams
    .filter((e) => e.examDate >= todayISO)
    .sort(
      (a, b) =>
        a.examDate.localeCompare(b.examDate) ||
        (a.startTime || '99:99').localeCompare(b.startTime || '99:99')
    );

  const totalObtained = Number(
    gradedExams.reduce((sum, e) => sum + (e.marksObtained ?? 0), 0).toFixed(2)
  );
  const totalMax = Number(gradedExams.reduce((sum, e) => sum + e.maxMarks, 0).toFixed(2));

  const averagePercentage =
    gradedExams.length > 0 && totalMax > 0
      ? Number(((totalObtained / totalMax) * 100).toFixed(1))
      : null;

  const weightedGraded = gradedExams.filter(
    (e) => e.weightage !== null && e.weightage !== undefined && e.weightage > 0
  );
  const totalWeight = weightedGraded.reduce((sum, e) => sum + (e.weightage ?? 0), 0);
  const weightedPercentage =
    weightedGraded.length > 0 && totalWeight > 0
      ? Number(
          (
            weightedGraded.reduce(
              (sum, e) =>
                sum + calculateExamPercentage(e.marksObtained ?? 0, e.maxMarks) * (e.weightage ?? 0),
              0
            ) / totalWeight
          ).toFixed(1)
        )
      : null;

  const effectivePct = weightedPercentage ?? averagePercentage;

  return {
    totalExams: exams.length,
    gradedCount: gradedExams.length,
    pendingMarksCount: exams.length - gradedExams.length,
    upcomingCount: upcomingSorted.length,
    nextExam: upcomingSorted[0] || null,
    totalObtained,
    totalMax,
    averagePercentage,
    weightedPercentage,
    standingLabel: getExamPerformanceStanding(effectivePct),
  };
}

export function validateExamInput(input: {
  title: string;
  examDate: string;
  maxMarks: number;
  marksObtained?: number | null;
  weightage?: number | null;
}): string | null {
  if (!input.title || !input.title.trim()) {
    return 'Please enter an exam title (for example, Midterm or Quiz 1).';
  }
  if (!input.examDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.examDate)) {
    return 'Please choose a valid exam date.';
  }
  if (!Number.isFinite(input.maxMarks) || input.maxMarks <= 0) {
    return 'Maximum marks must be greater than 0.';
  }
  if (input.marksObtained !== null && input.marksObtained !== undefined) {
    if (!Number.isFinite(input.marksObtained) || input.marksObtained < 0) {
      return 'Marks obtained cannot be negative.';
    }
    if (input.marksObtained > input.maxMarks) {
      return `Marks obtained (${input.marksObtained}) cannot exceed maximum marks (${input.maxMarks}).`;
    }
  }
  if (input.weightage !== null && input.weightage !== undefined) {
    if (!Number.isFinite(input.weightage) || input.weightage < 0 || input.weightage > 100) {
      return 'Weightage must be between 0% and 100%.';
    }
  }
  return null;
}

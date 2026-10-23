/**
 * Academic calculation utilities for oggytrack.
 * Pure mathematical functions for attendance calculations, threshold warnings,
 * safe skips ("bunk budget"), and attendance recovery requirements.
 */

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

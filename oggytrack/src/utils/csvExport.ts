import { Subject, AttendanceRecord, Assignment, SubjectExam } from '../types/oggytrack';
import { calculateAttendance, calculateExamPercentage } from './academicCalculations';

export function exportAttendanceCSV(subjects: Subject[], records: AttendanceRecord[]): void {
  const headers = ['Subject Code', 'Subject Name', 'Faculty', 'Target %', 'Conducted', 'Attended', 'Missed', 'Current %', 'Status'];
  const rows = subjects.map((sub) => {
    const subRecords = records.filter((r) => r.subjectId === sub.id);
    const attended = subRecords.filter((r) => r.status === 'present').length;
    const missed = subRecords.filter((r) => r.status === 'absent').length;
    const stats = calculateAttendance(attended, missed, sub.targetAttendance);

    return [
      `"${sub.code}"`,
      `"${sub.name}"`,
      `"${sub.faculty}"`,
      `${sub.targetAttendance}%`,
      stats.conducted,
      stats.attended,
      stats.missed,
      `${stats.percentage}%`,
      `"${stats.statusLabel}"`,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `oggytrack-attendance-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAssignmentsCSV(assignments: Assignment[]): void {
  const headers = ['Subject', 'Title', 'Type', 'Priority', 'Status', 'Due Date', 'Due Time', 'Progress %'];
  const rows = assignments.map((a) => [
    `"${a.subjectCode}"`,
    `"${a.title.replace(/"/g, '""')}"`,
    `"${a.type}"`,
    `"${a.priority}"`,
    `"${a.status}"`,
    `"${a.dueDate}"`,
    `"${a.dueTime}"`,
    `${a.completionPercent}%`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `oggytrack-assignments-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportExamsCSV(exams: SubjectExam[]): void {
  const headers = [
    'Subject Code',
    'Subject Name',
    'Exam Category',
    'Exam Title',
    'Exam Date',
    'Time',
    'Room',
    'Marks Obtained',
    'Max Marks',
    'Percentage',
    'Weightage %',
  ];
  const rows = exams.map((ex) => {
    const isGraded = ex.marksObtained !== null && ex.marksObtained !== undefined;
    const pct = isGraded ? `${calculateExamPercentage(ex.marksObtained!, ex.maxMarks)}%` : 'Pending';
    return [
      `"${ex.subjectCode}"`,
      `"${ex.subjectName.replace(/"/g, '""')}"`,
      `"${ex.category}"`,
      `"${ex.title.replace(/"/g, '""')}"`,
      `"${ex.examDate}"`,
      `"${ex.startTime || ''}"`,
      `"${(ex.room || '').replace(/"/g, '""')}"`,
      isGraded ? ex.marksObtained : 'Pending',
      ex.maxMarks,
      `"${pct}"`,
      ex.weightage !== null && ex.weightage !== undefined ? `${ex.weightage}%` : '',
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `oggytrack-exams-marks-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


import { TimetableEntry, Assignment, Holiday } from '../types/oggytrack';
import { formatDateISO, formatTimeHHMM } from './dateUtils';

function formatICSDate(dateStr: string, timeStr: string = '09:00'): string {
  // dateStr: YYYY-MM-DD, timeStr: HH:MM
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = timeStr.replace(/:/g, '') + '00';
  return `${cleanDate}T${cleanTime}Z`;
}

export function generateICSFile(
  timetable: TimetableEntry[],
  assignments: Assignment[],
  holidays: Holiday[]
): void {
  const now = new Date();
  const todayISO = formatDateISO(now);
  const cleanToday = todayISO.replace(/-/g, '');
  const dtStamp = formatICSDate(todayISO, formatTimeHHMM(now));

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//oggytrack//Academic Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:oggytrack Academic Schedule',
    'X-WR-TIMEZONE:UTC',
  ];

  // Export Timetable sessions (recurring weekly)
  const dayMap: Record<string, string> = {
    Monday: 'MO',
    Tuesday: 'TU',
    Wednesday: 'WE',
    Thursday: 'TH',
    Friday: 'FR',
    Saturday: 'SA',
    Sunday: 'SU',
  };

  timetable.forEach((entry) => {
    const byDay = dayMap[entry.day] || 'MO';
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:oggy-tt-${entry.id}@oggytrack.app`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${cleanToday}T${entry.startTime.replace(':', '')}00Z`);
    lines.push(`DTEND:${cleanToday}T${entry.endTime.replace(':', '')}00Z`);
    lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${byDay}`);
    lines.push(`SUMMARY:${entry.code} ${entry.subjectName} (${entry.type})`);
    lines.push(`LOCATION:${entry.room}`);
    lines.push(`DESCRIPTION:Instructor: ${entry.faculty}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  // Export Assignment Deadlines
  assignments.forEach((asg) => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:oggy-asg-${asg.id}@oggytrack.app`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${formatICSDate(asg.dueDate, asg.dueTime)}`);
    lines.push(`DTEND:${formatICSDate(asg.dueDate, asg.dueTime)}`);
    lines.push(`SUMMARY:DEADLINE: ${asg.subjectCode} - ${asg.title}`);
    lines.push(`DESCRIPTION:Priority: ${asg.priority}. Type: ${asg.type}. Status: ${asg.status}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  // Export Holidays
  holidays.forEach((hol) => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:oggy-hol-${hol.id}@oggytrack.app`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${hol.startDate.replace(/-/g, '')}`);
    lines.push(`DTEND:${hol.endDate.replace(/-/g, '')}`);
    lines.push(`SUMMARY:HOLIDAY: ${hol.title} (${hol.type})`);
    lines.push(`DESCRIPTION:${hol.description || 'Academic break'}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  const icsBlob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(icsBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'oggytrack-academic-calendar.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

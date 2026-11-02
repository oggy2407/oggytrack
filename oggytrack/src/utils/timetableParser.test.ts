import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeTabularMatrix,
  isTimeOverlap,
  normalizeHolidayType,
  parseDateOrRange,
  parseDelimitedOrFreeText,
  parseHTMLContent,
  parseICSContent,
  parseJSONContent,
} from './timetableParser';

test('isTimeOverlap detects overlapping periods', () => {
  assert.equal(isTimeOverlap('09:30', '10:45', '10:00', '11:15'), true);
  assert.equal(isTimeOverlap('09:00', '10:00', '10:00', '11:00'), false);
  assert.equal(isTimeOverlap('14:00', '16:00', '14:30', '15:30'), true);
  assert.equal(isTimeOverlap('09:00', '10:00', '14:00', '15:00'), false);
});

test('analyzeTabularMatrix parses 2D college timetable grids (Days as rows, Time slots as columns)', () => {
  const grid = [
    ['Day', '09:00 - 10:00', '10:00 - 11:00', '12:00 - 01:00', '02:00 - 04:00'],
    ['Monday', 'CS201 Data Structures (Hall A)', 'MA102 Calculus', 'LUNCH', 'CS201L DSA Lab (Lab 3)'],
    ['Wednesday', 'PH101 Physics', 'FREE', 'LUNCH', 'EC105 Digital Logic'],
  ];

  const res = analyzeTabularMatrix(grid);
  assert.equal(res.candidates.length, 5);
  assert.equal(res.candidates[0].code, 'CS201');
  assert.equal(res.candidates[0].day, 'Monday');
  assert.equal(res.candidates[0].startTime, '09:00');
  assert.equal(res.candidates[0].room, 'Hall A');
  // Afternoon "02:00 - 04:00" normalized to 14:00 - 16:00
  const lab = res.candidates.find((c) => c.code === 'CS201L');
  assert.ok(lab);
  assert.equal(lab.startTime, '14:00');
  assert.equal(lab.endTime, '16:00');
  assert.equal(lab.type, 'Lab');
});

test('analyzeTabularMatrix parses past attendance summary spreadsheets accurately', () => {
  const sheet = [
    ['Course Code', 'Subject Name', 'Classes Attended', 'Total Conducted'],
    ['CS301', 'Operating Systems', '18', '22'],
    ['MA204', 'Probability & Stats', '12', '20'],
  ];

  const res = analyzeTabularMatrix(sheet);
  assert.equal(res.attendanceSummaries.length, 2);
  assert.equal(res.attendanceSummaries[0].code, 'CS301');
  assert.equal(res.attendanceSummaries[0].attended, 18);
  assert.equal(res.attendanceSummaries[0].missed, 4);
  assert.equal(res.attendanceSummaries[1].code, 'MA204');
  assert.equal(res.attendanceSummaries[1].attended, 12);
  assert.equal(res.attendanceSummaries[1].missed, 8);
});

test('parseDelimitedOrFreeText parses dated past attendance CSV logs and Markdown tables', () => {
  const csv = `Date,Code,Subject,Status
2026-10-01,CS101,Intro to Programming,Present
2026-10-03,CS101,Intro to Programming,Absent
2026-10-05,CS101,Intro to Programming,Cancelled`;

  const res = parseDelimitedOrFreeText(csv);
  assert.equal(res.attendanceRecords.length, 3);
  assert.equal(res.attendanceRecords[0].status, 'present');
  assert.equal(res.attendanceRecords[1].status, 'absent');
  assert.equal(res.attendanceRecords[2].status, 'cancelled');

  const md = `
| Day | Time | Code | Subject | Room |
| --- | --- | --- | --- | --- |
| Tuesday | 11:00 - 12:30 | EE210 | Signals & Systems | Room 305 |
`;
  const mdRes = parseDelimitedOrFreeText(md);
  assert.equal(mdRes.candidates.length, 1);
  assert.equal(mdRes.candidates[0].code, 'EE210');
  assert.equal(mdRes.candidates[0].day, 'Tuesday');
});

test('parseICSContent extracts recurring classes, assignments, and holidays from .ics files', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'SUMMARY:CS401 Machine Learning',
    'DTSTART:20261005T100000',
    'DTEND:20261005T113000',
    'RRULE:FREQ=WEEKLY;BYDAY=MO,WE',
    'LOCATION:AI Lab 1',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:Deadline: CS401 Neural Nets Project',
    'DTSTART:20261110T235900',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:Holiday: Diwali Break',
    'DTSTART;VALUE=DATE:20261108',
    'DTEND;VALUE=DATE:20261112',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const res = parseICSContent(ics);
  assert.equal(res.candidates.length, 2); // Monday & Wednesday
  assert.equal(res.assignments.length, 1);
  assert.equal(res.holidays.length, 1);
});

test('parseJSONContent and parseHTMLContent extract portal tables and backups', () => {
  const html = `
    <html><body>
      <table>
        <tr><th>Subject Code</th><th>Course</th><th>Present</th><th>Absent</th></tr>
        <tr><td>BIO101</td><td>Cell Biology</td><td>15</td><td>3</td></tr>
      </table>
    </body></html>
  `;
  const htmlRes = parseHTMLContent(html);
  assert.equal(htmlRes.bundle.attendanceSummaries.length, 1);
  assert.equal(htmlRes.bundle.attendanceSummaries[0].code, 'BIO101');
  assert.equal(htmlRes.bundle.attendanceSummaries[0].attended, 15);
  assert.equal(htmlRes.bundle.attendanceSummaries[0].missed, 3);

  const jsonBackup = JSON.stringify({
    subjects: [{ id: 's1', code: 'PHY201', name: 'Quantum Mechanics', credits: 4 }],
    attendance: [{ subjectId: 's1', date: '2026-10-10', status: 'present' }],
  });
  const jsonRes = parseJSONContent(jsonBackup);
  assert.equal(jsonRes.subjects.length, 1);
  assert.equal(jsonRes.attendanceRecords.length, 1);
  assert.equal(jsonRes.attendanceRecords[0].code, 'PHY201');
});

test('parseDateOrRange and normalizeHolidayType parse single dates, cross-year ranges, and holiday categories', () => {
  assert.deepEqual(parseDateOrRange('Nov 25 - 29, 2026'), {
    startDate: '2026-11-25',
    endDate: '2026-11-29',
  });
  assert.deepEqual(parseDateOrRange('Dec 21, 2026 to Jan 3, 2027'), {
    startDate: '2026-12-21',
    endDate: '2027-01-03',
  });
  assert.deepEqual(parseDateOrRange('15/08/2026'), {
    startDate: '2026-08-15',
    endDate: '2026-08-15',
  });
  assert.equal(normalizeHolidayType('Gazetted', 'Independence Day'), 'National');
  assert.equal(normalizeHolidayType('', 'Winter Semester Recess'), 'Semester Break');
  assert.equal(normalizeHolidayType('', 'Final Exam Study Leave'), 'Exam Preparation');
});

test('analyzeTabularMatrix and parseDelimitedOrFreeText extract holiday circulars with Day columns and free-text lists', () => {
  // Official university holiday table WITH a Day column and From/To dates
  const holidaySheet = [
    ['S.No', 'Occasion / Festival', 'Day', 'From', 'To', 'Category', 'Remarks'],
    ['1', 'Gandhi Jayanti', 'Friday', '2026-10-02', '2026-10-02', 'Gazetted', 'Closed'],
    ['2', 'Diwali Festival Break', 'Sunday', '2026-11-08', '2026-11-12', 'National', 'Classes suspended'],
    ['3', 'FounderObservance', 'Saturday', '2026-10-31', '2026-10-31', 'Optional', 'Optional - Classes held'],
  ];

  const sheetRes = analyzeTabularMatrix(holidaySheet);
  assert.equal(sheetRes.candidates.length, 0);
  assert.equal(sheetRes.holidays.length, 3);
  assert.equal(sheetRes.holidays[0].title, 'Gandhi Jayanti');
  assert.equal(sheetRes.holidays[0].type, 'National');
  assert.equal(sheetRes.holidays[1].startDate, '2026-11-08');
  assert.equal(sheetRes.holidays[1].endDate, '2026-11-12');
  assert.equal(sheetRes.holidays[2].cancelsClasses, false);

  // Free-text pasted holiday circular
  const freeText = `
Academic Holiday Calendar 2026-27:
1. Oct 2, 2026 - Gandhi Jayanti (National Holiday)
2. Nov 8 - Nov 12, 2026: Diwali Break
3. Dec 21, 2026 to Jan 3, 2027 - Winter Semester Recess
4. Restricted Holiday: Oct 31, 2026 - Founder's Day (Optional - Classes Active)
`;
  const txtRes = parseDelimitedOrFreeText(freeText);
  assert.equal(txtRes.holidays.length, 4);
  assert.equal(txtRes.holidays[0].title, 'Gandhi Jayanti');
  assert.equal(txtRes.holidays[0].startDate, '2026-10-02');
  assert.equal(txtRes.holidays[1].title, 'Diwali Break');
  assert.equal(txtRes.holidays[1].startDate, '2026-11-08');
  assert.equal(txtRes.holidays[1].endDate, '2026-11-12');
  assert.equal(txtRes.holidays[2].type, 'Semester Break');
  assert.equal(txtRes.holidays[2].endDate, '2027-01-03');
  assert.equal(txtRes.holidays[3].cancelsClasses, false);

  // JSON top-level holiday array
  const jsonArrRes = parseJSONContent(
    JSON.stringify([{ holiday: 'Republic Day', date: '2026-01-26', category: 'Public' }])
  );
  assert.equal(jsonArrRes.holidays.length, 1);
  assert.equal(jsonArrRes.holidays[0].title, 'Republic Day');
  assert.equal(jsonArrRes.holidays[0].type, 'National');
});

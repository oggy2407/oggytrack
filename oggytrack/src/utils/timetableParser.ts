import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import {
  AssignmentPriority,
  AssignmentType,
  ClassType,
  DayOfWeek,
  HolidayType,
  ImportedAssignmentCandidate,
  ImportedAttendanceCandidate,
  ImportedAttendanceSummaryCandidate,
  ImportedClassCandidate,
  ImportedHolidayCandidate,
  ImportedSubjectCandidate,
  TimetableEntry,
  UserProfile,
  AppSettings,
} from '../types/oggytrack';
import { formatDateISO } from './dateUtils';

export interface ParseResult {
  success: boolean;
  documentSummary: string;
  candidates: ImportedClassCandidate[];
  subjects: ImportedSubjectCandidate[];
  attendanceRecords: ImportedAttendanceCandidate[];
  attendanceSummaries: ImportedAttendanceSummaryCandidate[];
  assignments: ImportedAssignmentCandidate[];
  holidays: ImportedHolidayCandidate[];
  restoredProfile?: Partial<UserProfile>;
  restoredSettings?: Partial<AppSettings>;
  restoredWallpaper?: string | null;
  fileName: string;
  fileType: string;
  fileSize: number;
  detectedCount: number;
  warnings: string[];
}

interface ExtractedBundle {
  documentSummary?: string;
  subjects: ImportedSubjectCandidate[];
  candidates: ImportedClassCandidate[];
  attendanceRecords: ImportedAttendanceCandidate[];
  attendanceSummaries: ImportedAttendanceSummaryCandidate[];
  assignments: ImportedAssignmentCandidate[];
  holidays: ImportedHolidayCandidate[];
  restoredProfile?: Partial<UserProfile>;
  restoredSettings?: Partial<AppSettings>;
  restoredWallpaper?: string | null;
}

const SUBJECT_PALETTE = [
  '#8b5cf6',
  '#06b6d4',
  '#f59e0b',
  '#ec4899',
  '#10b981',
  '#3b82f6',
  '#f43f5e',
  '#14b8a6',
];

function emptyBundle(): ExtractedBundle {
  return {
    subjects: [],
    candidates: [],
    attendanceRecords: [],
    attendanceSummaries: [],
    assignments: [],
    holidays: [],
  };
}

function uid(prefix: string, idx: number = 0): string {
  return `${prefix}_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
}

export function normalizeDay(str: string): DayOfWeek | null {
  const cleaned = str.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) return null;
  if (cleaned === 'm' || cleaned === 'mo' || cleaned.startsWith('mon')) return 'Monday';
  if (cleaned === 'tu' || cleaned === 'tue' || cleaned.startsWith('tues')) return 'Tuesday';
  if (cleaned === 'w' || cleaned === 'we' || cleaned.startsWith('wed')) return 'Wednesday';
  if (cleaned === 'th' || cleaned === 'thu' || cleaned.startsWith('thur')) return 'Thursday';
  if (cleaned === 'f' || cleaned === 'fr' || cleaned.startsWith('fri')) return 'Friday';
  if (cleaned === 'sa' || cleaned.startsWith('sat')) return 'Saturday';
  if (cleaned === 'su' || cleaned.startsWith('sun')) return 'Sunday';
  return null;
}

export function normalizeTime24(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/\./g, ':');
  const match = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const mins = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3]?.toLowerCase();

  if (Number.isNaN(hours) || Number.isNaN(mins) || mins < 0 || mins > 59) return null;

  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  // College timetables frequently write afternoon hours as 1:00 - 4:30 without PM
  if (!meridiem && hours >= 1 && hours <= 6) hours += 12;

  if (hours < 0 || hours > 23) return null;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function parseTimeRange(raw: string): { startTime: string; endTime: string } | null {
  const cleaned = raw.trim().replace(/[–—]/g, '-').replace(/\s+to\s+/gi, '-');
  const rangeMatch = cleaned.match(
    /(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)\s*-\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)/i
  );
  if (rangeMatch) {
    const start = normalizeTime24(rangeMatch[1]);
    const end = normalizeTime24(rangeMatch[2]);
    if (start && end) {
      return { startTime: start, endTime: end };
    }
  }

  const single = normalizeTime24(cleaned);
  if (single) {
    const [h, m] = single.split(':').map(Number);
    const total = h * 60 + m + 60;
    const endH = Math.min(23, Math.floor(total / 60));
    const endM = total % 60;
    return {
      startTime: single,
      endTime: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
    };
  }
  return null;
}

export function normalizeISODate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
    const d = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    let y = parseInt(dmyMatch[3], 10);
    if (y < 100) y += 2000;
    // If first part > 12, it is DD/MM/YYYY; otherwise default DD/MM/YYYY unless p2 > 12
    let day = p1;
    let month = p2;
    if (p2 > 12 && p1 <= 12) {
      month = p1;
      day = p2;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime()) && /\d{4}/.test(s)) {
    return formatDateISO(parsed);
  }
  return null;
}

const MONTH_NAME_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function buildSafeISODate(year: number, month: number, day: number): string | null {
  if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function normalizeHolidayType(raw?: string, title?: string): HolidayType {
  const trimmed = (raw || '').trim().toLowerCase();
  if (trimmed === 'national' || trimmed === 'national holiday') return 'National';
  if (trimmed === 'institutional' || trimmed === 'institutional break') return 'Institutional';
  if (trimmed === 'semester break') return 'Semester Break';
  if (trimmed === 'exam preparation' || trimmed === 'exam break') return 'Exam Preparation';
  if (trimmed === 'personal') return 'Personal';

  const combined = `${raw || ''} ${title || ''}`.toLowerCase();
  if (
    /semester\s*break|winter\s*break|summer\s*break|spring\s*break|fall\s*break|autumn\s*break|term\s*break|recess|vacation/.test(
      combined
    )
  ) {
    return 'Semester Break';
  }
  if (/exam|study\s*leave|reading\s*week|prep\s*leave/.test(combined)) {
    return 'Exam Preparation';
  }
  if (/personal|optional|restricted/.test(combined)) {
    return 'Personal';
  }
  if (
    /national|public|gazetted|federal|bank\s*holiday|republic\s*day|independence\s*day|gandhi|christmas|diwali|deepavali|eid|holi|dussehra|thanksgiving|new\s*year|good\s*friday|ambedkar|labor\s*day|memorial\s*day/.test(
      combined
    )
  ) {
    return 'National';
  }
  return 'Institutional';
}

export function inferHolidayCancelsClasses(rawText: string): boolean {
  if (
    /\b(optional|restricted\s*holiday|no\s*suspension)\b|classes?\s*(?:active|held|run|continue|not\s*suspended)/i.test(
      rawText
    )
  ) {
    return false;
  }
  return true;
}

export function extractDateRangeFromText(
  raw: string,
  fallbackYear?: number
): { startDate: string; endDate: string; matchedText: string } | null {
  const s = raw.trim();
  if (!s) return null;
  const defaultYear = fallbackYear || new Date().getFullYear();

  const finalizeRange = (startISO: string | null, endISO: string | null, matchedText: string) => {
    if (!startISO) return null;
    const validEnd = endISO && endISO >= startISO ? endISO : startISO;
    return { startDate: startISO, endDate: validEnd, matchedText };
  };

  // 1. Two ISO dates: 2026-11-08 to 2026-11-12
  const isoRange = s.match(
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s*(?:to|through|thru|–|—|-|~)\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i
  );
  if (isoRange) {
    return finalizeRange(normalizeISODate(isoRange[1]), normalizeISODate(isoRange[2]), isoRange[0]);
  }

  // 2. Two numeric DMY/MDY dates: 08/11/2026 - 12/11/2026
  const numRange = s.match(
    /(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\s*(?:to|through|thru|–|—|-|~)\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i
  );
  if (numRange) {
    return finalizeRange(normalizeISODate(numRange[1]), normalizeISODate(numRange[2]), numRange[0]);
  }

  // 3. Month D1[, Y1] - Month D2[, Y2]: "Dec 21, 2026 to Jan 3, 2027" or "Nov 8 - Nov 12, 2026"
  const mdyTwoMonth = s.match(
    /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\s*(?:to|through|thru|–|—|-|~)\s*([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i
  );
  if (mdyTwoMonth) {
    const m1 = MONTH_NAME_MAP[mdyTwoMonth[1].toLowerCase()];
    const m2 = MONTH_NAME_MAP[mdyTwoMonth[4].toLowerCase()];
    if (m1 && m2) {
      const d1 = parseInt(mdyTwoMonth[2], 10);
      const d2 = parseInt(mdyTwoMonth[5], 10);
      const y2 = mdyTwoMonth[6]
        ? parseInt(mdyTwoMonth[6], 10)
        : mdyTwoMonth[3]
        ? parseInt(mdyTwoMonth[3], 10)
        : defaultYear;
      const y1 = mdyTwoMonth[3]
        ? parseInt(mdyTwoMonth[3], 10)
        : m1 > m2 && mdyTwoMonth[6]
        ? y2 - 1
        : y2;
      return finalizeRange(buildSafeISODate(y1, m1, d1), buildSafeISODate(y2, m2, d2), mdyTwoMonth[0]);
    }
  }

  // 4. Month D1 - D2[, Y]: "Nov 25 - 29, 2026" or "Nov 8-12"
  const mdySameMonth = s.match(
    /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:to|through|thru|–|—|-|~)\s*(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i
  );
  if (mdySameMonth) {
    const m1 = MONTH_NAME_MAP[mdySameMonth[1].toLowerCase()];
    if (m1) {
      const d1 = parseInt(mdySameMonth[2], 10);
      const d2 = parseInt(mdySameMonth[3], 10);
      const y = mdySameMonth[4] ? parseInt(mdySameMonth[4], 10) : defaultYear;
      return finalizeRange(buildSafeISODate(y, m1, d1), buildSafeISODate(y, m1, d2), mdySameMonth[0]);
    }
  }

  // 5. Day-First Two Months: "21 Dec 2026 to 3 Jan 2027" or "25 Nov - 29 Nov 2026"
  const dmyTwoMonth = s.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:,?\s*(\d{4}))?\s*(?:to|through|thru|–|—|-|~)\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:,?\s*(\d{4}))?\b/i
  );
  if (dmyTwoMonth) {
    const m1 = MONTH_NAME_MAP[dmyTwoMonth[2].toLowerCase()];
    const m2 = MONTH_NAME_MAP[dmyTwoMonth[5].toLowerCase()];
    if (m1 && m2) {
      const d1 = parseInt(dmyTwoMonth[1], 10);
      const d2 = parseInt(dmyTwoMonth[4], 10);
      const y2 = dmyTwoMonth[6]
        ? parseInt(dmyTwoMonth[6], 10)
        : dmyTwoMonth[3]
        ? parseInt(dmyTwoMonth[3], 10)
        : defaultYear;
      const y1 = dmyTwoMonth[3]
        ? parseInt(dmyTwoMonth[3], 10)
        : m1 > m2 && dmyTwoMonth[6]
        ? y2 - 1
        : y2;
      return finalizeRange(buildSafeISODate(y1, m1, d1), buildSafeISODate(y2, m2, d2), dmyTwoMonth[0]);
    }
  }

  // 6. Day-First Same Month: "25 - 29 Nov 2026"
  const dmySameMonth = s.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:to|through|thru|–|—|-|~)\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:,?\s*(\d{4}))?\b/i
  );
  if (dmySameMonth) {
    const m1 = MONTH_NAME_MAP[dmySameMonth[3].toLowerCase()];
    if (m1) {
      const d1 = parseInt(dmySameMonth[1], 10);
      const d2 = parseInt(dmySameMonth[2], 10);
      const y = dmySameMonth[4] ? parseInt(dmySameMonth[4], 10) : defaultYear;
      return finalizeRange(buildSafeISODate(y, m1, d1), buildSafeISODate(y, m1, d2), dmySameMonth[0]);
    }
  }

  // 7. Single ISO date: 2026-10-02
  const singleIso = s.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (singleIso) {
    const iso = buildSafeISODate(
      parseInt(singleIso[1], 10),
      parseInt(singleIso[2], 10),
      parseInt(singleIso[3], 10)
    );
    if (iso) return { startDate: iso, endDate: iso, matchedText: singleIso[0] };
  }

  // 8. Single numeric DMY/MDY date: 15/08/2026 or 15.08.2026
  const singleNum = s.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (singleNum) {
    const iso = normalizeISODate(singleNum[0]);
    if (iso) return { startDate: iso, endDate: iso, matchedText: singleNum[0] };
  }

  // 9. Single Month D[, Y]: "Oct 2, 2026" or "Aug 15"
  const singleMdy = s.match(
    /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i
  );
  if (singleMdy) {
    const m1 = MONTH_NAME_MAP[singleMdy[1].toLowerCase()];
    if (m1) {
      const d1 = parseInt(singleMdy[2], 10);
      const y = singleMdy[3] ? parseInt(singleMdy[3], 10) : defaultYear;
      const iso = buildSafeISODate(y, m1, d1);
      if (iso) return { startDate: iso, endDate: iso, matchedText: singleMdy[0] };
    }
  }

  // 10. Single D Month[, Y]: "15 Aug 2026" or "26 Jan"
  const singleDmy = s.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:,?\s*(\d{4}))?\b/i
  );
  if (singleDmy) {
    const m1 = MONTH_NAME_MAP[singleDmy[2].toLowerCase()];
    if (m1) {
      const d1 = parseInt(singleDmy[1], 10);
      const y = singleDmy[3] ? parseInt(singleDmy[3], 10) : defaultYear;
      const iso = buildSafeISODate(y, m1, d1);
      if (iso) return { startDate: iso, endDate: iso, matchedText: singleDmy[0] };
    }
  }

  return null;
}

export function parseDateOrRange(
  raw: string,
  fallbackYear?: number
): { startDate: string; endDate: string } | null {
  const res = extractDateRangeFromText(raw, fallbackYear);
  return res ? { startDate: res.startDate, endDate: res.endDate } : null;
}

function normalizeClassType(raw?: string): ClassType {
  const s = (raw || '').toLowerCase();
  if (s.includes('lab') || s.includes('practical')) return 'Lab';
  if (s.includes('tut')) return 'Tutorial';
  if (s.includes('sem')) return 'Seminar';
  if (s.includes('work')) return 'Workshop';
  return 'Lecture';
}

function normalizeAttendanceStatus(raw: string): 'present' | 'absent' | 'cancelled' | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (['p', 'present', 'attended', 'yes', '1', 'true', 'late', 'excused'].includes(s)) {
    return 'present';
  }
  if (['a', 'absent', 'missed', 'no', '0', 'false', 'bunk', 'bunked'].includes(s)) {
    return 'absent';
  }
  if (['c', 'cancel', 'cancelled', 'canceled', 'holiday', 'suspended'].includes(s)) {
    return 'cancelled';
  }
  return null;
}

export function deriveCourseCodeAndName(rawCell: string): {
  code: string;
  name: string;
  room?: string;
  type?: ClassType;
} | null {
  const text = rawCell.replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const ignoreWords = /^(lunch|break|recess|free|off|leisure|library|na|n\/a|-|--|nil)$/i;
  if (ignoreWords.test(text)) return null;

  let room: string | undefined;
  const roomParen = text.match(/\(([^)]*(?:room|hall|lab|aud|wing|block|\d{2,4})[^)]*)\)/i);
  let cleaned = text;
  if (roomParen) {
    room = roomParen[1].trim();
    cleaned = cleaned.replace(roomParen[0], '').trim();
  }

  const codePrefix = cleaned.match(/^([A-Z]{2,6}\s*-?\s*\d{2,4}[A-Z]?)\b[\s:–-]*(.*)$/i);
  if (codePrefix) {
    const code = codePrefix[1].replace(/\s+/g, '').toUpperCase();
    const rest = codePrefix[2].trim();
    return {
      code,
      name: rest || code,
      room,
      type: normalizeClassType(text),
    };
  }

  // Generate clean uppercase acronym/code from subject name
  const words = cleaned.split(/[\s/&,-]+/).filter((w) => w.length > 0);
  let generatedCode = '';
  if (words.length === 1) {
    generatedCode = words[0].slice(0, 6).toUpperCase();
  } else {
    generatedCode = words
      .filter((w) => !['and', 'of', 'the', 'in', 'to', 'for'].includes(w.toLowerCase()))
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 6);
  }
  if (generatedCode.length < 2) {
    generatedCode = cleaned.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase() || 'SUBJ';
  }

  return {
    code: generatedCode,
    name: cleaned,
    room,
    type: normalizeClassType(text),
  };
}

/**
 * Parses a 2D array of string cells (from Excel sheets, CSV/TSV, HTML tables, DOCX tables, Markdown tables).
 */
export function analyzeTabularMatrix(rawRows: string[][]): ExtractedBundle {
  const bundle = emptyBundle();
  const rows = rawRows
    .map((r) => r.map((c) => String(c ?? '').trim()))
    .filter((r) => r.some((c) => c.length > 0));

  if (rows.length === 0) return bundle;

  // 1. Check 2D Timetable Matrix Orientation A: Header row has Time Ranges across columns, Day names in column 0
  for (let headerIdx = 0; headerIdx < Math.min(5, rows.length - 1); headerIdx++) {
    const headerRow = rows[headerIdx];
    const colTimes = new Map<number, { startTime: string; endTime: string }>();
    for (let c = 1; c < headerRow.length; c++) {
      const tr = parseTimeRange(headerRow[c]);
      if (tr) colTimes.set(c, tr);
    }

    if (colTimes.size >= 2) {
      let matchedDayRows = 0;
      for (let r = headerIdx + 1; r < rows.length; r++) {
        const day = normalizeDay(rows[r][0] || '');
        if (!day) continue;
        matchedDayRows++;
        colTimes.forEach((tr, colIdx) => {
          const cellVal = rows[r][colIdx] || '';
          const parsedCell = deriveCourseCodeAndName(cellVal);
          if (parsedCell) {
            bundle.candidates.push({
              id: uid('cand_gridA', bundle.candidates.length),
              code: parsedCell.code,
              subjectName: parsedCell.name,
              day,
              startTime: tr.startTime,
              endTime: tr.endTime,
              room: parsedCell.room || 'Room TBD',
              faculty: 'Instructor',
              type: parsedCell.type || 'Lecture',
              confidence: 0.96,
              selected: true,
            });
          }
        });
      }
      if (matchedDayRows > 0 && bundle.candidates.length > 0) {
        return finalizeBundleSubjects(bundle);
      }
    }
  }

  // 2. Check 2D Timetable Matrix Orientation B: Header row has Weekday names across columns, Time Ranges in column 0
  for (let headerIdx = 0; headerIdx < Math.min(5, rows.length - 1); headerIdx++) {
    const headerRow = rows[headerIdx];
    const colDays = new Map<number, DayOfWeek>();
    for (let c = 1; c < headerRow.length; c++) {
      const d = normalizeDay(headerRow[c]);
      if (d) colDays.set(c, d);
    }

    if (colDays.size >= 2) {
      let matchedTimeRows = 0;
      for (let r = headerIdx + 1; r < rows.length; r++) {
        const tr = parseTimeRange(rows[r][0] || '');
        if (!tr) continue;
        matchedTimeRows++;
        colDays.forEach((day, colIdx) => {
          const cellVal = rows[r][colIdx] || '';
          const parsedCell = deriveCourseCodeAndName(cellVal);
          if (parsedCell) {
            bundle.candidates.push({
              id: uid('cand_gridB', bundle.candidates.length),
              code: parsedCell.code,
              subjectName: parsedCell.name,
              day,
              startTime: tr.startTime,
              endTime: tr.endTime,
              room: parsedCell.room || 'Room TBD',
              faculty: 'Instructor',
              type: parsedCell.type || 'Lecture',
              confidence: 0.96,
              selected: true,
            });
          }
        });
      }
      if (matchedTimeRows > 0 && bundle.candidates.length > 0) {
        return finalizeBundleSubjects(bundle);
      }
    }
  }

  // 3. Detect Column-Headered Tables (Schedule list, Past Attendance Summary, Dated Attendance Log, Assignments, Holidays, Subjects)
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(6, rows.length); i++) {
    const joined = rows[i].join(' ').toLowerCase();
    if (
      /(subject|course|code|title|day|time|attended|present|conducted|absent|status|date|due|holiday|festival|occasion|event|break|recess|vacation|calendar)/.test(
        joined
      )
    ) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx >= 0 && headerRowIdx < rows.length - 1) {
    const headers = rows[headerRowIdx].map((h) => h.toLowerCase());
    const findCol = (patterns: RegExp[]) =>
      headers.findIndex((h) => patterns.some((p) => p.test(h)));

    const codeCol = findCol([/\bcode\b/, /course\s*id/, /sub.*code/]);
    const nameCol = findCol([/subject/, /course/, /paper/, /\bname\b/, /\btitle\b/]);
    const holidayTitleCol = findCol([
      /holiday/,
      /festival/,
      /occasion/,
      /\bevent\b/,
      /\bbreak\b/,
      /recess/,
      /vacation/,
      /particulars/,
      /\btitle\b/,
      /\bname\b/,
      /description/,
    ]);
    const dayCol = findCol([/\bday\b/, /weekday/]);
    const timeCol = findCol([/\btime\b/, /slot/, /period/, /schedule/]);
    const startCol = findCol([/start\s*time/, /^start$/, /^from$/]);
    const endCol = findCol([/end\s*time/, /^end$/, /^to$/]);
    const roomCol = findCol([/room/, /venue/, /hall/, /location/, /lab/]);
    const facultyCol = findCol([/faculty/, /instructor/, /prof/, /teacher/, /lecturer/]);
    const typeCol = findCol([/\btype\b/, /category/, /nature/, /mode/]);
    const remarksCol = findCol([/remark/, /note/, /detail/, /suspension/, /classes/]);

    const dateCol = findCol([/^date$/, /class\s*date/, /session\s*date/, /log\s*date/]);
    const statusCol = findCol([/status/, /mark/, /remark/, /attendance$/]);

    const attendedCol = findCol([/attended/, /\bpresent\b/, /classes\s*attended/]);
    const missedCol = findCol([/missed/, /\babsent\b/, /classes\s*missed/]);
    const totalCol = findCol([/conducted/, /\btotal\b/, /\bheld\b/, /delivered/]);
    const cancelledCol = findCol([/cancel/]);

    const dueCol = findCol([/due\s*date/, /deadline/, /submission/]);
    const holidayStartCol = findCol([
      /start\s*date/,
      /holiday\s*date/,
      /from\s*date/,
      /^from$/,
      /^date$/,
      /\bdates\b/,
    ]);
    const holidayEndCol = findCol([/end\s*date/, /to\s*date/, /^to$/, /^end$/, /until/, /till/]);
    const explicitHolidayHeader = headers.some((h) =>
      /holiday|festival|occasion|recess|vacation|\bbreak\b/.test(h)
    );

    const dataRows = rows.slice(headerRowIdx + 1);

    // 3A. Dated Past Attendance Log Table
    if (dateCol >= 0 && statusCol >= 0 && (codeCol >= 0 || nameCol >= 0) && !explicitHolidayHeader) {
      dataRows.forEach((r, idx) => {
        const dateISO = normalizeISODate(r[dateCol] || '');
        const status = normalizeAttendanceStatus(r[statusCol] || '');
        const rawSub = r[nameCol >= 0 ? nameCol : codeCol] || '';
        const rawCode = codeCol >= 0 ? r[codeCol] : '';
        if (!dateISO || !status || (!rawSub && !rawCode)) return;

        const parsedSub = deriveCourseCodeAndName(rawCode ? `${rawCode} ${rawSub}` : rawSub);
        if (!parsedSub) return;

        bundle.attendanceRecords.push({
          id: uid('att_imp', idx),
          code: (rawCode || parsedSub.code).toUpperCase(),
          subjectName: rawSub || parsedSub.name,
          date: dateISO,
          status,
          selected: true,
        });
      });
    }

    // 3B. Past Attendance Summary Table (e.g., Subject | Attended | Total or Subject | Present | Absent)
    if (attendedCol >= 0 && (totalCol >= 0 || missedCol >= 0) && (codeCol >= 0 || nameCol >= 0)) {
      dataRows.forEach((r, idx) => {
        const rawCode = codeCol >= 0 ? r[codeCol] : '';
        const rawName = nameCol >= 0 ? r[nameCol] : rawCode;
        if (!rawCode && !rawName) return;

        const attended = parseInt((r[attendedCol] || '').replace(/[^\d]/g, ''), 10);
        if (Number.isNaN(attended)) return;

        let missed = 0;
        if (missedCol >= 0 && r[missedCol] !== '') {
          missed = Math.max(0, parseInt(r[missedCol].replace(/[^\d]/g, ''), 10) || 0);
        } else if (totalCol >= 0 && r[totalCol] !== '') {
          const total = parseInt(r[totalCol].replace(/[^\d]/g, ''), 10) || 0;
          missed = Math.max(0, total - attended);
        }

        const cancelled =
          cancelledCol >= 0 && r[cancelledCol]
            ? Math.max(0, parseInt(r[cancelledCol].replace(/[^\d]/g, ''), 10) || 0)
            : 0;

        const parsedSub = deriveCourseCodeAndName(rawCode ? `${rawCode} ${rawName}` : rawName);
        if (!parsedSub) return;

        bundle.attendanceSummaries.push({
          id: uid('sum_imp', idx),
          code: (rawCode || parsedSub.code).toUpperCase(),
          subjectName: rawName || parsedSub.name,
          attended,
          missed,
          cancelled,
          selected: true,
        });
      });
    }

    // 3C. Row-per-Class Timetable Table (require real time values so holiday tables with Day + From Date are not misread)
    if (dayCol >= 0 && (timeCol >= 0 || startCol >= 0) && !explicitHolidayHeader) {
      dataRows.forEach((r, idx) => {
        const day = normalizeDay(r[dayCol] || '');
        if (!day) return;

        let startTime: string | null = null;
        let endTime: string | null = null;
        if (startCol >= 0 && r[startCol] && !parseDateOrRange(r[startCol])) {
          startTime = normalizeTime24(r[startCol]);
          if (startTime) {
            endTime =
              (endCol >= 0 && r[endCol] ? normalizeTime24(r[endCol]) : null) ||
              parseTimeRange(startTime)?.endTime ||
              '10:00';
          }
        } else if (timeCol >= 0 && r[timeCol] && !parseDateOrRange(r[timeCol])) {
          const tr = parseTimeRange(r[timeCol]);
          if (tr) {
            startTime = tr.startTime;
            endTime = tr.endTime;
          }
        }
        if (!startTime || !endTime) return;

        const rawCode = codeCol >= 0 ? r[codeCol] : '';
        const rawName = nameCol >= 0 ? r[nameCol] : '';
        const parsedSub = deriveCourseCodeAndName(
          rawCode && rawName ? `${rawCode} ${rawName}` : rawName || rawCode
        );
        if (!parsedSub) return;

        bundle.candidates.push({
          id: uid('cand_row', idx),
          code: (rawCode || parsedSub.code).toUpperCase(),
          subjectName: rawName || parsedSub.name,
          day,
          startTime,
          endTime,
          room: (roomCol >= 0 && r[roomCol]) || parsedSub.room || 'Room 101',
          faculty: (facultyCol >= 0 && r[facultyCol]) || 'Instructor',
          type: typeCol >= 0 ? normalizeClassType(r[typeCol]) : parsedSub.type || 'Lecture',
          confidence: 0.96,
          selected: true,
        });
      });
    }

    // 3D. Assignments Table
    if (dueCol >= 0 && nameCol >= 0) {
      dataRows.forEach((r, idx) => {
        const dueISO = normalizeISODate(r[dueCol] || '');
        const title = r[nameCol] || '';
        if (!dueISO || !title) return;
        const code = (codeCol >= 0 && r[codeCol] ? r[codeCol] : 'GEN').toUpperCase();
        bundle.assignments.push({
          id: uid('asg_imp', idx),
          subjectCode: code,
          subjectName: code,
          title,
          dueDate: dueISO,
          dueTime: '23:59',
          priority: 'medium',
          type: 'Homework',
          selected: true,
        });
      });
    }

    // 3E. Holidays & Academic Calendar Table (supports Day column, single dates, From/To columns, and date ranges)
    if (
      holidayStartCol >= 0 &&
      holidayTitleCol >= 0 &&
      holidayStartCol !== holidayTitleCol &&
      attendedCol < 0 &&
      dueCol < 0 &&
      bundle.attendanceRecords.length === 0 &&
      bundle.candidates.length === 0 &&
      (explicitHolidayHeader || codeCol < 0)
    ) {
      dataRows.forEach((r, idx) => {
        const rawStartCell = r[holidayStartCol] || '';
        const title = (r[holidayTitleCol] || '').trim();
        if (!rawStartCell || !title) return;

        const parsedStart = parseDateOrRange(rawStartCell);
        if (!parsedStart) return;

        const rawEndCell =
          holidayEndCol >= 0 && holidayEndCol !== holidayStartCol ? r[holidayEndCol] || '' : '';
        const parsedEnd = rawEndCell ? parseDateOrRange(rawEndCell) : null;
        const endDate =
          parsedEnd && parsedEnd.endDate >= parsedStart.startDate
            ? parsedEnd.endDate
            : parsedStart.endDate;

        const rawType = typeCol >= 0 ? r[typeCol] || '' : '';
        const rawRemarks = remarksCol >= 0 ? r[remarksCol] || '' : '';
        const rowContext = `${title} ${rawType} ${rawRemarks}`;

        bundle.holidays.push({
          id: uid('hol_imp', idx),
          title,
          startDate: parsedStart.startDate,
          endDate,
          type: normalizeHolidayType(rawType, title),
          description: rawRemarks || undefined,
          cancelsClasses: inferHolidayCancelsClasses(rowContext),
          selected: true,
        });
      });
    }

    // 3F. Standalone Subject List Table
    if (
      bundle.candidates.length === 0 &&
      bundle.attendanceSummaries.length === 0 &&
      bundle.attendanceRecords.length === 0 &&
      bundle.holidays.length === 0 &&
      (codeCol >= 0 || nameCol >= 0) &&
      headers.some((h) => /credit|faculty|instructor|target|subject|course/.test(h))
    ) {
      const creditsCol = findCol([/credit/]);
      const targetCol = findCol([/target/, /min.*att/]);
      dataRows.forEach((r, idx) => {
        const rawCode = codeCol >= 0 ? r[codeCol] : '';
        const rawName = nameCol >= 0 ? r[nameCol] : '';
        const parsedSub = deriveCourseCodeAndName(
          rawCode && rawName ? `${rawCode} ${rawName}` : rawName || rawCode
        );
        if (!parsedSub) return;

        bundle.subjects.push({
          id: uid('sub_imp', idx),
          code: (rawCode || parsedSub.code).toUpperCase(),
          name: rawName || parsedSub.name,
          credits: creditsCol >= 0 ? parseInt(r[creditsCol], 10) || 3 : 3,
          faculty: (facultyCol >= 0 && r[facultyCol]) || 'Instructor',
          room: (roomCol >= 0 && r[roomCol]) || 'Room 101',
          targetAttendance: targetCol >= 0 ? parseInt(r[targetCol], 10) || 75 : 75,
          color: SUBJECT_PALETTE[idx % SUBJECT_PALETTE.length],
          selected: true,
        });
      });
    }
  }

  // 4. Headerless CSV/Row fallback (class rows OR 2-to-4 column holiday rows like "2026-10-20, Diwali Break")
  if (
    bundle.candidates.length === 0 &&
    bundle.attendanceSummaries.length === 0 &&
    bundle.attendanceRecords.length === 0 &&
    bundle.subjects.length === 0 &&
    bundle.holidays.length === 0
  ) {
    rows.forEach((parts, idx) => {
      if (parts.length < 2) return;

      if (parts.length >= 3) {
        let dayVal: DayOfWeek | null = null;
        let dayIdx = -1;
        let timeVal: { startTime: string; endTime: string } | null = null;
        let timeIdx = -1;

        for (let cIdx = 0; cIdx < parts.length; cIdx++) {
          const cell = parts[cIdx];
          if (!dayVal) {
            const d = normalizeDay(cell);
            if (d) {
              dayVal = d;
              dayIdx = cIdx;
            }
          }
          if (!timeVal && !parseDateOrRange(cell)) {
            const tr = parseTimeRange(cell);
            if (tr) {
              timeVal = tr;
              timeIdx = cIdx;
            }
          }
        }

        if (dayVal && timeVal) {
          const remaining = parts.filter((_, i) => i !== dayIdx && i !== timeIdx && parts[i]);
          const codeCandidate = remaining[0] || 'SUB101';
          const nameCandidate = remaining[1] || codeCandidate;
          const parsedSub = deriveCourseCodeAndName(
            remaining.length >= 2 ? `${codeCandidate} ${nameCandidate}` : codeCandidate
          );
          if (parsedSub) {
            bundle.candidates.push({
              id: uid('cand_hl', idx),
              code: parsedSub.code,
              subjectName: remaining.length >= 2 ? nameCandidate : parsedSub.name,
              day: dayVal,
              startTime: timeVal.startTime,
              endTime: timeVal.endTime,
              room: remaining[2] || parsedSub.room || 'Room 101',
              faculty: remaining[3] || 'Instructor',
              type: normalizeClassType(remaining[4]),
              confidence: 0.92,
              selected: true,
            });
            return;
          }
        }
      }

      // Headerless holiday row: e.g. ["2026-10-02", "Gandhi Jayanti"] or ["Diwali Break", "2026-11-08", "2026-11-12"]
      const firstDate = parseDateOrRange(parts[0] || '');
      const secondDate = parseDateOrRange(parts[1] || '');
      if (firstDate && parts[1] && !normalizeAttendanceStatus(parts[1])) {
        const maybeEnd = parts[2] ? parseDateOrRange(parts[2]) : null;
        const title = maybeEnd ? parts[1] : parts[1];
        const typeHint = parts.slice(maybeEnd ? 3 : 2).join(' ');
        if (/[A-Za-z]{2,}/.test(title) && !normalizeDay(title)) {
          bundle.holidays.push({
            id: uid('hol_hl', idx),
            title: title.trim(),
            startDate: firstDate.startDate,
            endDate:
              maybeEnd && maybeEnd.endDate >= firstDate.startDate
                ? maybeEnd.endDate
                : firstDate.endDate,
            type: normalizeHolidayType(typeHint, title),
            cancelsClasses: inferHolidayCancelsClasses(`${title} ${typeHint}`),
            selected: true,
          });
        }
      } else if (!firstDate && secondDate && parts[0] && /[A-Za-z]{2,}/.test(parts[0])) {
        const maybeEnd = parts[2] ? parseDateOrRange(parts[2]) : null;
        const title = parts[0].trim();
        const typeHint = parts.slice(maybeEnd ? 3 : 2).join(' ');
        if (!normalizeDay(title)) {
          bundle.holidays.push({
            id: uid('hol_hl', idx),
            title,
            startDate: secondDate.startDate,
            endDate:
              maybeEnd && maybeEnd.endDate >= secondDate.startDate
                ? maybeEnd.endDate
                : secondDate.endDate,
            type: normalizeHolidayType(typeHint, title),
            cancelsClasses: inferHolidayCancelsClasses(`${title} ${typeHint}`),
            selected: true,
          });
        }
      }
    });
  }

  return finalizeBundleSubjects(bundle);
}

/**
 * Splits delimited text (CSV, TSV, semicolon, pipe, Markdown tables) or free-form lines.
 */
export function parseDelimitedOrFreeText(text: string): ExtractedBundle {
  const cleanLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^\|?[\s:-]+\|[\s|:-]*$/.test(l)); // ignore markdown separator rows

  if (cleanLines.length === 0) return emptyBundle();

  // Detect delimiter (ignoring unquoted prose commas inside "Month D, YYYY" dates)
  const sample = cleanLines.slice(0, 10).join('\n');
  const sampleWithoutDateCommas = sample.replace(
    /(?<!")\b([A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?),\s*(20\d{2})\b(?!")/g,
    '$1 $2'
  );
  let delimiter = ',';
  const tabCount = (sample.match(/\t/g) || []).length;
  const pipeCount = (sample.match(/\|/g) || []).length;
  const semiCount = (sample.match(/;/g) || []).length;
  const commaCount = (sampleWithoutDateCommas.match(/,/g) || []).length;

  if (tabCount >= Math.max(commaCount, pipeCount, semiCount) && tabCount > 0) delimiter = '\t';
  else if (pipeCount >= Math.max(commaCount, semiCount) && pipeCount > 1) delimiter = '|';
  else if (semiCount > commaCount && semiCount > 0) delimiter = ';';

  if (tabCount > 0 || pipeCount > 1 || semiCount > 0 || commaCount > 0) {
    const matrix = cleanLines.map((line) => {
      const trimmed = delimiter === '|' ? line.replace(/^\||\|$/g, '') : line;
      return splitCSVRow(trimmed, delimiter);
    });
    const gridBundle = analyzeTabularMatrix(matrix);
    if (countBundleItems(gridBundle) > 0) {
      return gridBundle;
    }
  }

  // Free-text line-by-line fallback (timetables, attendance fractions, and academic holiday lists)
  const bundle = emptyBundle();
  let activeHeadingDay: DayOfWeek | null = null;

  // Infer academic year hint if mentioned in header lines (e.g., "Academic Calendar 2026-27")
  const yearHintMatch = cleanLines.slice(0, 5).join(' ').match(/\b(20\d{2})\b/);
  const fallbackYear = yearHintMatch ? parseInt(yearHintMatch[1], 10) : new Date().getFullYear();

  cleanLines.forEach((rawLine, idx) => {
    const line = rawLine.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim();
    if (!line) return;

    const standaloneDay = normalizeDay(line.replace(/[:\-]/g, ''));
    if (standaloneDay && line.split(/\s+/).length === 1) {
      activeHeadingDay = standaloneDay;
      return;
    }

    // Check attendance fraction pattern like "CS301 Algorithms - 18/22" or "Attended 18 out of 22"
    const fracMatch = line.match(
      /^(.+?)\s*[:\-–]\s*(?:attended\s*)?(\d{1,3})\s*(?:\/|out of)\s*(\d{1,3})\b/i
    );
    if (fracMatch && !extractDateRangeFromText(line, fallbackYear)) {
      const sub = deriveCourseCodeAndName(fracMatch[1]);
      const att = parseInt(fracMatch[2], 10);
      const tot = parseInt(fracMatch[3], 10);
      if (sub && tot >= att) {
        bundle.attendanceSummaries.push({
          id: uid('sum_txt', idx),
          code: sub.code,
          subjectName: sub.name,
          attended: att,
          missed: Math.max(0, tot - att),
          cancelled: 0,
          selected: true,
        });
        return;
      }
    }

    // Check schedule line with explicit clock time range (must contain ':' or am/pm so date ranges like "Nov 8 - 12" are not misread as clock times)
    const clockTimeMatch = line.match(
      /(\d{1,2}(?:[:.]\d{2}\s*(?:am|pm)?|\s*(?:am|pm))\s*(?:-|–|—|to)\s*\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)/i
    );
    if (clockTimeMatch) {
      const tr = parseTimeRange(clockTimeMatch[1]);
      const dayToken = line
        .split(/[\s,|]+/)
        .map((tok) => normalizeDay(tok))
        .find((d) => d !== null);
      const day = dayToken || activeHeadingDay;
      if (tr && day) {
        const rest = line
          .replace(clockTimeMatch[0], ' ')
          .replace(
            /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi,
            ' '
          )
          .replace(/\s+/g, ' ')
          .trim();
        const sub = deriveCourseCodeAndName(rest);
        if (sub) {
          bundle.candidates.push({
            id: uid('cand_txt', idx),
            code: sub.code,
            subjectName: sub.name,
            day,
            startTime: tr.startTime,
            endTime: tr.endTime,
            room: sub.room || 'Room 101',
            faculty: 'Instructor',
            type: sub.type || 'Lecture',
            confidence: 0.88,
            selected: true,
          });
          return;
        }
      }
    }

    // Check academic holiday / break date or date-range line (e.g. "Oct 2, 2026 - Gandhi Jayanti", "Nov 8 - Nov 12, 2026: Diwali Break")
    if (!/\b20\d{2}\s*[-–/]\s*(?:20)?\d{2}\b/.test(line) || /[A-Za-z]{3,}\s+\d{1,2}/.test(line)) {
      const dateSpan = extractDateRangeFromText(line, fallbackYear);
      if (dateSpan) {
        let remainder = line
          .replace(dateSpan.matchedText, ' ')
          .replace(
            /\(\s*(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)(?:\s*[-–to]+\s*(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun))?\s*\)/gi,
            ' '
          )
          .replace(
            /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
            ' '
          )
          .replace(/^(?:restricted\s+holiday|gazetted\s+holiday|public\s+holiday|holiday)\s*[:\-–—]\s*/i, '')
          .replace(/\(\s*(?:national|institutional|public|gazetted|restricted|optional)[^)]*\)/gi, ' ')
          .replace(/^[\s:|\-–—,]+|[\s:|\-–—,]+$/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        if (remainder.length >= 2 && /[A-Za-z]{2,}/.test(remainder)) {
          bundle.holidays.push({
            id: uid('hol_txt', idx),
            title: remainder,
            startDate: dateSpan.startDate,
            endDate: dateSpan.endDate,
            type: normalizeHolidayType(line, remainder),
            cancelsClasses: inferHolidayCancelsClasses(line),
            selected: true,
          });
        }
      }
    }
  });

  return finalizeBundleSubjects(bundle);
}

function splitCSVRow(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result.map((s) => s.replace(/^"|"$/g, '').trim());
}

/**
 * Parses iCalendar (.ics / .vcs) exports from Google Calendar, Apple Calendar, Outlook, Canvas, or Moodle.
 */
export function parseICSContent(icsText: string): ExtractedBundle {
  const bundle = emptyBundle();
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const blocks = unfolded.split(/BEGIN:VEVENT/i).slice(1);

  const byDayMap: Record<string, DayOfWeek> = {
    MO: 'Monday',
    TU: 'Tuesday',
    WE: 'Wednesday',
    TH: 'Thursday',
    FR: 'Friday',
    SA: 'Saturday',
    SU: 'Sunday',
  };

  blocks.forEach((rawBlock, idx) => {
    const block = rawBlock.split(/END:VEVENT/i)[0] || '';
    const lines = block.split(/\r?\n/);
    const props: Record<string, string> = {};

    lines.forEach((line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const rawKey = line.slice(0, colonIdx).split(';')[0].trim().toUpperCase();
        const val = line.slice(colonIdx + 1).trim();
        props[rawKey] = val;
      }
    });

    const summary = (props.SUMMARY || '').replace(/\\,/g, ',');
    if (!summary) return;

    const dtStart = props.DTSTART || '';
    const dtEnd = props.DTEND || '';
    const rrule = props.RRULE || '';
    const location = (props.LOCATION || '').replace(/\\,/g, ',');

    // Parse date & time from YYYYMMDD or YYYYMMDDTHHMMSS
    const dtMatch = dtStart.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
    const endMatch = dtEnd.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
    if (!dtMatch) return;

    const dateISO = `${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}`;
    const hasTime = Boolean(dtMatch[4]);
    const startTime = hasTime ? `${dtMatch[4]}:${dtMatch[5]}` : '09:00';
    const endTime =
      endMatch && endMatch[4]
        ? `${endMatch[4]}:${endMatch[5]}`
        : parseTimeRange(startTime)?.endTime || '10:00';

    if (/holiday|break|vacation|recess|festival/i.test(summary) || (!hasTime && !rrule)) {
      const endISO = endMatch ? `${endMatch[1]}-${endMatch[2]}-${endMatch[3]}` : dateISO;
      const cleanSummary = summary.replace(/^holiday:\s*/i, '');
      bundle.holidays.push({
        id: uid('hol_ics', idx),
        title: cleanSummary,
        startDate: dateISO,
        endDate: endISO >= dateISO ? endISO : dateISO,
        type: normalizeHolidayType(props.CATEGORIES || '', cleanSummary),
        cancelsClasses: inferHolidayCancelsClasses(`${summary} ${props.DESCRIPTION || ''}`),
        selected: true,
      });
      return;
    }

    if (/due|deadline|assignment|submission|quiz|homework/i.test(summary) && !rrule) {
      const cleanTitle = summary.replace(/^(due|deadline):\s*/i, '');
      const sub = deriveCourseCodeAndName(cleanTitle);
      bundle.assignments.push({
        id: uid('asg_ics', idx),
        subjectCode: sub?.code || 'COURSE',
        subjectName: sub?.code || 'Course',
        title: cleanTitle,
        dueDate: dateISO,
        dueTime: startTime,
        priority: 'high',
        type: 'Homework',
        selected: true,
      });
      return;
    }

    // Recurring or scheduled class event
    const sub = deriveCourseCodeAndName(summary);
    if (!sub) return;

    let days: DayOfWeek[] = [];
    const byDayMatch = rrule.match(/BYDAY=([A-Z,]+)/i);
    if (byDayMatch) {
      days = byDayMatch[1]
        .toUpperCase()
        .split(',')
        .map((code) => byDayMap[code.slice(-2)])
        .filter(Boolean);
    }
    if (days.length === 0) {
      const dtObj = new Date(
        parseInt(dtMatch[1], 10),
        parseInt(dtMatch[2], 10) - 1,
        parseInt(dtMatch[3], 10),
        12
      );
      const dayNames: DayOfWeek[] = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      days = [dayNames[dtObj.getDay()]];
    }

    days.forEach((day, dIdx) => {
      bundle.candidates.push({
        id: uid('cand_ics', idx * 10 + dIdx),
        code: sub.code,
        subjectName: sub.name,
        day,
        startTime,
        endTime,
        room: location || sub.room || 'Room 101',
        faculty: 'Instructor',
        type: sub.type || 'Lecture',
        confidence: 0.97,
        selected: true,
      });
    });
  });

  return finalizeBundleSubjects(bundle);
}

/**
 * Parses JSON files: both full oggytrack backups and custom JSON arrays/objects.
 */
export function parseJSONContent(jsonText: string): ExtractedBundle {
  const bundle = emptyBundle();
  const data = JSON.parse(jsonText);

  if (Array.isArray(data)) {
    // Array of classes, subjects, or attendance records
    data.forEach((item, idx) => {
      if (!item || typeof item !== 'object') return;
      if (item.day && (item.startTime || item.time)) {
        const day = normalizeDay(String(item.day)) || 'Monday';
        const tr = item.startTime
          ? { startTime: normalizeTime24(String(item.startTime)) || '09:00', endTime: normalizeTime24(String(item.endTime || '')) || '10:00' }
          : parseTimeRange(String(item.time)) || { startTime: '09:00', endTime: '10:00' };
        const code = String(item.code || item.subjectCode || 'SUB101').toUpperCase();
        const name = String(item.subjectName || item.name || item.subject || code);
        bundle.candidates.push({
          id: uid('cand_json', idx),
          code,
          subjectName: name,
          day,
          startTime: tr.startTime,
          endTime: tr.endTime,
          room: String(item.room || 'Room 101'),
          faculty: String(item.faculty || item.instructor || 'Instructor'),
          type: normalizeClassType(item.type),
          confidence: 0.99,
          selected: true,
        });
      } else if (item.date && item.status) {
        const status = normalizeAttendanceStatus(String(item.status));
        const dateISO = normalizeISODate(String(item.date));
        if (status && dateISO) {
          bundle.attendanceRecords.push({
            id: uid('att_json', idx),
            code: String(item.code || item.subjectCode || item.subjectId || 'SUB101').toUpperCase(),
            subjectName: String(item.subjectName || item.name || item.code || 'Course'),
            date: dateISO,
            status,
            note: item.note ? String(item.note) : undefined,
            selected: true,
          });
        }
      } else if (typeof item.attended === 'number') {
        bundle.attendanceSummaries.push({
          id: uid('sum_json', idx),
          code: String(item.code || 'SUB101').toUpperCase(),
          subjectName: String(item.subjectName || item.name || item.code || 'Course'),
          attended: item.attended,
          missed: Number(item.missed ?? Math.max(0, Number(item.total || item.conducted || 0) - item.attended)),
          cancelled: Number(item.cancelled || 0),
          selected: true,
        });
      } else if (
        (item.startDate || item.date || item.holidayDate) &&
        (item.title || item.holiday || item.occasion || item.name) &&
        !item.status
      ) {
        const rawStart = String(item.startDate || item.date || item.holidayDate);
        const parsedStart = parseDateOrRange(rawStart);
        const parsedEnd = item.endDate ? parseDateOrRange(String(item.endDate)) : null;
        const holTitle = String(item.title || item.holiday || item.occasion || item.name);
        if (parsedStart && holTitle) {
          bundle.holidays.push({
            id: uid('hol_json', idx),
            title: holTitle,
            startDate: parsedStart.startDate,
            endDate:
              parsedEnd && parsedEnd.endDate >= parsedStart.startDate
                ? parsedEnd.endDate
                : parsedStart.endDate,
            type: normalizeHolidayType(item.type || item.category, holTitle),
            description: item.description ? String(item.description) : undefined,
            cancelsClasses:
              typeof item.cancelsClasses === 'boolean'
                ? item.cancelsClasses
                : inferHolidayCancelsClasses(`${holTitle} ${item.description || ''}`),
            selected: true,
          });
        }
      } else if (item.name && item.code) {
        bundle.subjects.push({
          id: uid('sub_json', idx),
          code: String(item.code).toUpperCase(),
          name: String(item.name),
          credits: Number(item.credits) || 3,
          faculty: String(item.faculty || 'Instructor'),
          room: String(item.room || 'Room 101'),
          targetAttendance: Number(item.targetAttendance) || 75,
          color: item.color || SUBJECT_PALETTE[idx % SUBJECT_PALETTE.length],
          selected: true,
        });
      }
    });
    return finalizeBundleSubjects(bundle);
  }

  if (data && typeof data === 'object') {
    const subjIdMap = new Map<string, { code: string; name: string }>();

    if (Array.isArray(data.subjects)) {
      data.subjects.forEach((s: any, idx: number) => {
        const code = String(s.code || `SUB${idx + 1}`).toUpperCase();
        const name = String(s.name || code);
        if (s.id) subjIdMap.set(String(s.id), { code, name });
        bundle.subjects.push({
          id: String(s.id || uid('sub_jb', idx)),
          code,
          name,
          credits: Number(s.credits) || 3,
          faculty: String(s.faculty || 'Instructor'),
          room: String(s.room || 'Room 101'),
          targetAttendance: Number(s.targetAttendance) || 75,
          color: s.color || SUBJECT_PALETTE[idx % SUBJECT_PALETTE.length],
          selected: true,
        });
      });
    }

    const rawTimetable = data.timetable || data.classes || data.schedule;
    if (Array.isArray(rawTimetable)) {
      rawTimetable.forEach((t: any, idx: number) => {
        const day = normalizeDay(String(t.day || 'Monday')) || 'Monday';
        bundle.candidates.push({
          id: uid('cand_jb', idx),
          code: String(t.code || 'SUB101').toUpperCase(),
          subjectName: String(t.subjectName || t.name || t.code || 'Course'),
          day,
          startTime: normalizeTime24(String(t.startTime || '09:00')) || '09:00',
          endTime: normalizeTime24(String(t.endTime || '10:00')) || '10:00',
          room: String(t.room || 'Room 101'),
          faculty: String(t.faculty || 'Instructor'),
          type: normalizeClassType(t.type),
          confidence: 0.99,
          selected: true,
        });
      });
    }

    const rawAttendance = data.attendance || data.attendanceRecords;
    if (Array.isArray(rawAttendance)) {
      rawAttendance.forEach((r: any, idx: number) => {
        const status = normalizeAttendanceStatus(String(r.status || ''));
        const dateISO = normalizeISODate(String(r.date || ''));
        if (!status || !dateISO) return;
        const mapped = r.subjectId ? subjIdMap.get(String(r.subjectId)) : undefined;
        bundle.attendanceRecords.push({
          id: uid('att_jb', idx),
          code: String(r.code || mapped?.code || r.subjectId || 'SUB101').toUpperCase(),
          subjectName: String(r.subjectName || mapped?.name || r.code || 'Course'),
          date: dateISO,
          status,
          note: r.note ? String(r.note) : undefined,
          selected: true,
        });
      });
    }

    if (Array.isArray(data.attendanceSummaries)) {
      data.attendanceSummaries.forEach((s: any, idx: number) => {
        bundle.attendanceSummaries.push({
          id: uid('sum_jb', idx),
          code: String(s.code || 'SUB101').toUpperCase(),
          subjectName: String(s.subjectName || s.name || s.code || 'Course'),
          attended: Math.max(0, Number(s.attended) || 0),
          missed: Math.max(0, Number(s.missed) || 0),
          cancelled: Math.max(0, Number(s.cancelled) || 0),
          selected: true,
        });
      });
    }

    if (Array.isArray(data.assignments)) {
      data.assignments.forEach((a: any, idx: number) => {
        const dueISO = normalizeISODate(String(a.dueDate || ''));
        if (!dueISO || !a.title) return;
        bundle.assignments.push({
          id: uid('asg_jb', idx),
          subjectCode: String(a.subjectCode || 'COURSE').toUpperCase(),
          subjectName: String(a.subjectName || a.subjectCode || 'Course'),
          title: String(a.title),
          dueDate: dueISO,
          dueTime: String(a.dueTime || '23:59'),
          priority: (['low', 'medium', 'high', 'urgent'].includes(a.priority) ? a.priority : 'medium') as AssignmentPriority,
          type: (a.type || 'Homework') as AssignmentType,
          selected: true,
        });
      });
    }

    if (Array.isArray(data.holidays)) {
      data.holidays.forEach((h: any, idx: number) => {
        const parsedStart = parseDateOrRange(String(h.startDate || h.date || ''));
        const parsedEnd = h.endDate ? parseDateOrRange(String(h.endDate)) : null;
        const holTitle = String(h.title || h.holiday || h.name || '').trim();
        if (!parsedStart || !holTitle) return;
        bundle.holidays.push({
          id: uid('hol_jb', idx),
          title: holTitle,
          startDate: parsedStart.startDate,
          endDate:
            parsedEnd && parsedEnd.endDate >= parsedStart.startDate
              ? parsedEnd.endDate
              : parsedStart.endDate,
          type: normalizeHolidayType(h.type || h.category, holTitle),
          description: h.description ? String(h.description) : undefined,
          cancelsClasses:
            typeof h.cancelsClasses === 'boolean'
              ? h.cancelsClasses
              : inferHolidayCancelsClasses(`${holTitle} ${h.description || ''}`),
          selected: true,
        });
      });
    }

    if (data.user && typeof data.user === 'object') {
      bundle.restoredProfile = data.user;
    }
    if (data.settings && typeof data.settings === 'object') {
      bundle.restoredSettings = data.settings;
    }
    if (typeof data.customWallpaper === 'string') {
      bundle.restoredWallpaper = data.customWallpaper;
    }
    if (typeof data.documentSummary === 'string') {
      bundle.documentSummary = data.documentSummary;
    }
  }

  return finalizeBundleSubjects(bundle);
}

/**
 * Extracts HTML <table> grids and visible text from saved ERP / portal HTML pages.
 */
export function parseHTMLContent(html: string): { bundle: ExtractedBundle; plainText: string } {
  const merged = emptyBundle();
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  const rowRegex = /<tr[\s\S]*?<\/tr>/gi;
  const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;

  const stripTags = (s: string) =>
    s
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .trim();

  const tables = html.match(tableRegex) || [];
  tables.forEach((tbl) => {
    const rows: string[][] = [];
    const trMatches = tbl.match(rowRegex) || [];
    trMatches.forEach((tr) => {
      const cells: string[] = [];
      let m: RegExpExecArray | null;
      cellRegex.lastIndex = 0;
      while ((m = cellRegex.exec(tr)) !== null) {
        cells.push(stripTags(m[1]));
      }
      if (cells.length > 0) rows.push(cells);
    });
    if (rows.length > 0) {
      mergeBundles(merged, analyzeTabularMatrix(rows));
    }
  });

  const plainText = stripTags(html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, ''));
  return { bundle: finalizeBundleSubjects(merged), plainText };
}

/**
 * Extracts tables and text from OpenXML (.docx, .pptx) and OpenDocument (.odt) XML files.
 */
function parseWordOrOdtXml(xml: string): { bundle: ExtractedBundle; plainText: string } {
  const merged = emptyBundle();
  const stripXml = (s: string) =>
    s
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

  // Word <w:tbl> extraction
  const wTables = xml.match(/<w:tbl[\s\S]*?<\/w:tbl>/g) || [];
  wTables.forEach((tbl) => {
    const rows: string[][] = [];
    const trs = tbl.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
    trs.forEach((tr) => {
      const tcs = tr.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];
      const rowCells = tcs.map((tc) => stripXml(tc));
      if (rowCells.length > 0) rows.push(rowCells);
    });
    if (rows.length > 0) mergeBundles(merged, analyzeTabularMatrix(rows));
  });

  // ODT <table:table> extraction
  const odtTables = xml.match(/<table:table[\s\S]*?<\/table:table>/g) || [];
  odtTables.forEach((tbl) => {
    const rows: string[][] = [];
    const trs = tbl.match(/<table:table-row[\s\S]*?<\/table:table-row>/g) || [];
    trs.forEach((tr) => {
      const tcs = tr.match(/<table:table-cell[\s\S]*?<\/table:table-cell>/g) || [];
      const rowCells = tcs.map((tc) => stripXml(tc));
      if (rowCells.length > 0) rows.push(rowCells);
    });
    if (rows.length > 0) mergeBundles(merged, analyzeTabularMatrix(rows));
  });

  const plainText = xml
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/text:p>/g, '\n')
    .replace(/<\/a:p>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

  return { bundle: finalizeBundleSubjects(merged), plainText };
}

function finalizeBundleSubjects(bundle: ExtractedBundle): ExtractedBundle {
  const existingCodes = new Set(bundle.subjects.map((s) => s.code.toUpperCase()));
  const ensureSub = (code: string, name: string, room?: string, faculty?: string) => {
    const upper = code.toUpperCase();
    if (!existingCodes.has(upper)) {
      existingCodes.add(upper);
      bundle.subjects.push({
        id: uid('sub_auto', bundle.subjects.length),
        code: upper,
        name: name || upper,
        credits: 3,
        faculty: faculty || 'Instructor',
        room: room || 'Room 101',
        targetAttendance: 75,
        color: SUBJECT_PALETTE[bundle.subjects.length % SUBJECT_PALETTE.length],
        selected: true,
      });
    }
  };

  bundle.candidates.forEach((c) => ensureSub(c.code, c.subjectName, c.room, c.faculty));
  bundle.attendanceSummaries.forEach((s) => ensureSub(s.code, s.subjectName));
  bundle.attendanceRecords.forEach((r) => ensureSub(r.code, r.subjectName));
  return bundle;
}

function mergeBundles(target: ExtractedBundle, source: ExtractedBundle): ExtractedBundle {
  if (source.documentSummary && !target.documentSummary) {
    target.documentSummary = source.documentSummary;
  }

  const subCodes = new Set(target.subjects.map((s) => s.code.toUpperCase()));
  source.subjects.forEach((s) => {
    if (!subCodes.has(s.code.toUpperCase())) {
      subCodes.add(s.code.toUpperCase());
      target.subjects.push(s);
    }
  });

  const classKeys = new Set(
    target.candidates.map((c) => `${c.code.toUpperCase()}_${c.day}_${c.startTime}`)
  );
  source.candidates.forEach((c) => {
    const key = `${c.code.toUpperCase()}_${c.day}_${c.startTime}`;
    if (!classKeys.has(key)) {
      classKeys.add(key);
      target.candidates.push(c);
    }
  });

  const attKeys = new Set(
    target.attendanceRecords.map((r) => `${r.code.toUpperCase()}_${r.date}_${r.status}`)
  );
  source.attendanceRecords.forEach((r) => {
    const key = `${r.code.toUpperCase()}_${r.date}_${r.status}`;
    if (!attKeys.has(key)) {
      attKeys.add(key);
      target.attendanceRecords.push(r);
    }
  });

  const sumKeys = new Set(target.attendanceSummaries.map((s) => s.code.toUpperCase()));
  source.attendanceSummaries.forEach((s) => {
    if (!sumKeys.has(s.code.toUpperCase())) {
      sumKeys.add(s.code.toUpperCase());
      target.attendanceSummaries.push(s);
    }
  });

  const asgKeys = new Set(target.assignments.map((a) => `${a.title.toLowerCase()}_${a.dueDate}`));
  source.assignments.forEach((a) => {
    const key = `${a.title.toLowerCase()}_${a.dueDate}`;
    if (!asgKeys.has(key)) {
      asgKeys.add(key);
      target.assignments.push(a);
    }
  });

  const holKeys = new Set(target.holidays.map((h) => `${h.title.toLowerCase()}_${h.startDate}`));
  source.holidays.forEach((h) => {
    const key = `${h.title.toLowerCase()}_${h.startDate}`;
    if (!holKeys.has(key)) {
      holKeys.add(key);
      target.holidays.push(h);
    }
  });

  if (source.restoredProfile) target.restoredProfile = source.restoredProfile;
  if (source.restoredSettings) target.restoredSettings = source.restoredSettings;
  if (source.restoredWallpaper) target.restoredWallpaper = source.restoredWallpaper;

  return finalizeBundleSubjects(target);
}

function countBundleItems(b: ExtractedBundle): number {
  return (
    b.subjects.length +
    b.candidates.length +
    b.attendanceRecords.length +
    b.attendanceSummaries.length +
    b.assignments.length +
    b.holidays.length
  );
}

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function normalizeImageForVision(
  file: File
): Promise<{ mimeType: string; base64Data: string }> {
  const nativeVisionMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
  const lowerExt = file.name.split('.').pop()?.toLowerCase() || '';
  const inferredMime =
    file.type ||
    (lowerExt === 'png'
      ? 'image/png'
      : lowerExt === 'jpg' || lowerExt === 'jpeg'
      ? 'image/jpeg'
      : lowerExt === 'webp'
      ? 'image/webp'
      : lowerExt === 'heic'
      ? 'image/heic'
      : 'image/png');

  if (nativeVisionMimes.includes(inferredMime)) {
    const buf = await file.arrayBuffer();
    return { mimeType: inferredMime, base64Data: await arrayBufferToBase64(buf) };
  }

  // Convert BMP / GIF / SVG / TIFF via browser Image + Canvas to PNG if running in DOM
  if (typeof document !== 'undefined' && typeof Image !== 'undefined') {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Failed to decode image in browser.'));
        el.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 1200;
      canvas.height = img.naturalHeight || 900;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        return {
          mimeType: 'image/png',
          base64Data: dataUrl.split(',')[1] || '',
        };
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const buf = await file.arrayBuffer();
  return { mimeType: 'image/png', base64Data: await arrayBufferToBase64(buf) };
}

async function requestServerExtraction(params: {
  fileName: string;
  mimeType: string;
  base64Data?: string;
  extractedText?: string;
}): Promise<ExtractedBundle | null> {
  if (typeof fetch === 'undefined') return null;

  const response = await fetch('/api/extract-academic-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      currentDateISO: formatDateISO(new Date()),
    }),
  });

  if (!response.ok) {
    let errText = 'Document analyzer request failed.';
    try {
      const body = await response.json();
      if (body?.error) errText = body.error;
    } catch {
      // ignore json parse failure
    }
    throw new Error(errText);
  }

  const raw = await response.json();
  return parseJSONContent(JSON.stringify(raw));
}

/**
 * Universal academic file parser supporting ALL file formats:
 * - Spreadsheets: .xlsx, .xls, .ods, .csv, .tsv
 * - Documents & Web: .pdf, .docx, .pptx, .odt, .html, .htm, .xml, .md, .txt, .rtf
 * - Calendars & Backups: .ics, .vcs, .json, .zip
 * - Images / Screenshots / Photos: .png, .jpg, .jpeg, .webp, .gif, .bmp, .heic, .svg
 */
export async function parseTimetableFile(
  file: File,
  existingTimetable: TimetableEntry[] = []
): Promise<ParseResult> {
  const warnings: string[] = [];
  const fileName = file.name;
  const fileSize = file.size;
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() || '' : '';
  const mime = (file.type || '').toLowerCase();

  if (fileSize === 0) {
    throw new Error('The uploaded file is empty (0 bytes).');
  }
  if (fileSize > 25 * 1024 * 1024) {
    throw new Error('File exceeds maximum allowed size (25 MB).');
  }

  const combined = emptyBundle();
  let extractedPlainText = '';

  const isImage =
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'heic', 'heif', 'svg'].includes(ext);
  const isPDF = mime === 'application/pdf' || ext === 'pdf';
  const isSpreadsheet =
    ['xlsx', 'xls', 'ods', 'xlsm', 'xlsb'].includes(ext) ||
    mime.includes('spreadsheet') ||
    mime.includes('excel');
  const isOpenXmlOrZip =
    ['docx', 'pptx', 'odt', 'zip'].includes(ext) ||
    mime.includes('wordprocessingml') ||
    mime.includes('presentationml') ||
    mime === 'application/zip';
  const isICS = ['ics', 'vcs'].includes(ext) || mime === 'text/calendar';
  const isJSON = ext === 'json' || mime === 'application/json';
  const isHTML = ['html', 'htm'].includes(ext) || mime === 'text/html';

  // 1. Handle PDF & Images via Server Multimodal Vision & OCR
  if (isImage) {
    const imgPayload = await normalizeImageForVision(file);
    const serverBundle = await requestServerExtraction({
      fileName,
      mimeType: imgPayload.mimeType,
      base64Data: imgPayload.base64Data,
    });
    if (serverBundle) mergeBundles(combined, serverBundle);
  } else if (isPDF) {
    const buf = await file.arrayBuffer();
    const base64Data = await arrayBufferToBase64(buf);
    const serverBundle = await requestServerExtraction({
      fileName,
      mimeType: 'application/pdf',
      base64Data,
    });
    if (serverBundle) mergeBundles(combined, serverBundle);
  } else if (isJSON) {
    const text = await file.text();
    mergeBundles(combined, parseJSONContent(text));
  } else if (isICS) {
    const text = await file.text();
    mergeBundles(combined, parseICSContent(text));
  } else if (isSpreadsheet) {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: 'array', cellDates: true });
    const sheetTexts: string[] = [];

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        raw: false,
        defval: '',
      });
      if (matrix.length > 0) {
        mergeBundles(combined, analyzeTabularMatrix(matrix));
        const csvSnap = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
        if (csvSnap.trim()) {
          sheetTexts.push(`--- Sheet: ${sheetName} ---\n${csvSnap}`);
        }
      }
    });
    extractedPlainText = sheetTexts.join('\n\n');
  } else if (isOpenXmlOrZip) {
    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const textChunks: string[] = [];

    if (zip.files['word/document.xml']) {
      const xml = await zip.files['word/document.xml'].async('string');
      const res = parseWordOrOdtXml(xml);
      mergeBundles(combined, res.bundle);
      textChunks.push(res.plainText);
    } else if (zip.files['content.xml']) {
      const xml = await zip.files['content.xml'].async('string');
      const res = parseWordOrOdtXml(xml);
      mergeBundles(combined, res.bundle);
      textChunks.push(res.plainText);
    } else {
      const slideNames = Object.keys(zip.files)
        .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
        .sort();
      if (slideNames.length > 0) {
        for (const sName of slideNames) {
          const xml = await zip.files[sName].async('string');
          const res = parseWordOrOdtXml(xml);
          mergeBundles(combined, res.bundle);
          textChunks.push(res.plainText);
        }
      } else {
        // Generic .zip archive: inspect inner spreadsheets, CSVs, JSONs, ICS, HTML, TXT
        for (const [innerName, zipEntry] of Object.entries(zip.files)) {
          if (zipEntry.dir) continue;
          const innerExt = innerName.split('.').pop()?.toLowerCase() || '';
          if (['json'].includes(innerExt)) {
            mergeBundles(combined, parseJSONContent(await zipEntry.async('string')));
          } else if (['ics', 'vcs'].includes(innerExt)) {
            mergeBundles(combined, parseICSContent(await zipEntry.async('string')));
          } else if (['xlsx', 'xls', 'ods'].includes(innerExt)) {
            const innerBuf = await zipEntry.async('arraybuffer');
            const wb = XLSX.read(innerBuf, { type: 'array', cellDates: true });
            wb.SheetNames.forEach((sn) => {
              const mat = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[sn], {
                header: 1,
                raw: false,
                defval: '',
              });
              mergeBundles(combined, analyzeTabularMatrix(mat));
            });
          } else if (['csv', 'tsv', 'txt', 'md'].includes(innerExt)) {
            const txt = await zipEntry.async('string');
            mergeBundles(combined, parseDelimitedOrFreeText(txt));
            textChunks.push(txt);
          } else if (['html', 'htm'].includes(innerExt)) {
            const html = await zipEntry.async('string');
            const res = parseHTMLContent(html);
            mergeBundles(combined, res.bundle);
            textChunks.push(res.plainText);
          }
        }
      }
    }
    extractedPlainText = textChunks.join('\n\n');
  } else if (isHTML) {
    const html = await file.text();
    const res = parseHTMLContent(html);
    mergeBundles(combined, res.bundle);
    extractedPlainText = res.plainText;
  } else {
    // CSV, TSV, Markdown, RTF, XML, TXT, or any custom/unknown file extension
    const rawText = await file.text();
    // Strip basic RTF control words if .rtf
    const cleanedText =
      ext === 'rtf'
        ? rawText.replace(/\\[a-z]+\d*\s?/gi, ' ').replace(/[{}]/g, ' ')
        : rawText;
    extractedPlainText = cleanedText;
    mergeBundles(combined, parseDelimitedOrFreeText(cleanedText));
  }

  // 2. If deterministic parsing found 0 structured items (e.g., complex syllabus, messy ERP copy, Word doc paragraphs),
  // send extracted text to server analyzer to structure it accurately!
  if (countBundleItems(combined) === 0 && extractedPlainText.trim().length > 0) {
    try {
      const serverBundle = await requestServerExtraction({
        fileName,
        mimeType: 'text/plain',
        extractedText: extractedPlainText,
      });
      if (serverBundle) {
        mergeBundles(combined, serverBundle);
      }
    } catch (err: any) {
      warnings.push(err?.message || 'Could not reach server analyzer for unstructured text.');
    }
  }

  const totalDetected = countBundleItems(combined);
  if (totalDetected === 0) {
    throw new Error(
      `No subjects, class sessions, attendance records, or holidays were detected in "${fileName}". Check that the file contains readable schedule, attendance, or holiday calendar details.`
    );
  }

  // 3. Conflict Detection against existing timetable
  combined.candidates = combined.candidates.map((cand) => {
    const conflict = existingTimetable.find(
      (ex) =>
        ex.day === cand.day &&
        isTimeOverlap(ex.startTime, ex.endTime, cand.startTime, cand.endTime)
    );

    if (conflict) {
      warnings.push(
        `Schedule overlap on ${cand.day} between ${cand.code} and ${conflict.code} (${conflict.startTime}-${conflict.endTime}).`
      );
      return {
        ...cand,
        hasConflict: true,
        conflictDetails: `Overlaps with existing class ${conflict.code} (${conflict.startTime} - ${conflict.endTime})`,
      };
    }
    return cand;
  });

  const summaryParts: string[] = [];
  if (combined.subjects.length > 0) summaryParts.push(`${combined.subjects.length} subjects`);
  if (combined.candidates.length > 0) summaryParts.push(`${combined.candidates.length} class slots`);
  if (combined.attendanceSummaries.length > 0)
    summaryParts.push(`${combined.attendanceSummaries.length} past attendance summaries`);
  if (combined.attendanceRecords.length > 0)
    summaryParts.push(`${combined.attendanceRecords.length} dated attendance logs`);
  if (combined.assignments.length > 0) summaryParts.push(`${combined.assignments.length} assignments`);
  if (combined.holidays.length > 0) summaryParts.push(`${combined.holidays.length} holidays`);

  return {
    success: true,
    documentSummary:
      combined.documentSummary || `Extracted ${summaryParts.join(', ')} from ${fileName}.`,
    candidates: combined.candidates,
    subjects: combined.subjects,
    attendanceRecords: combined.attendanceRecords,
    attendanceSummaries: combined.attendanceSummaries,
    assignments: combined.assignments,
    holidays: combined.holidays,
    restoredProfile: combined.restoredProfile,
    restoredSettings: combined.restoredSettings,
    restoredWallpaper: combined.restoredWallpaper,
    fileName,
    fileType: file.type || ext.toUpperCase() || 'FILE',
    fileSize,
    detectedCount: totalDetected,
    warnings,
  };
}

export function isTimeOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const aStart = toMin(startA);
  const aEnd = toMin(endA);
  const bStart = toMin(startB);
  const bEnd = toMin(endB);
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

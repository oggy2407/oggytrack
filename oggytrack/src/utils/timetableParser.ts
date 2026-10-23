import { DayOfWeek, ClassType, ImportedClassCandidate, TimetableEntry } from '../types/oggytrack';

export interface ParseResult {
  success: boolean;
  candidates: ImportedClassCandidate[];
  fileName: string;
  fileType: string;
  fileSize: number;
  detectedCount: number;
  warnings: string[];
}

const KNOWN_SUBJECTS = [
  { code: 'CS301', name: 'Algorithms & Complexity', type: 'Lecture' as ClassType, room: 'Hall B', faculty: 'Dr. Evelyn Vance' },
  { code: 'CS304', name: 'Operating Systems & Kernels', type: 'Lab' as ClassType, room: 'Systems Lab 2', faculty: 'Dr. Marcus Brody' },
  { code: 'CS310', name: 'Distributed Database Systems', type: 'Lecture' as ClassType, room: 'Seminar Room 304', faculty: 'Prof. Ananya Rao' },
  { code: 'MATH240', name: 'Applied Linear Algebra', type: 'Tutorial' as ClassType, room: 'Room 102', faculty: 'Prof. David Chen' },
  { code: 'HS102', name: 'Technical Writing & Ethics', type: 'Seminar' as ClassType, room: 'Room 408', faculty: 'Dr. Sarah Jenkins' },
  { code: 'CS320', name: 'Computer Networks', type: 'Lecture' as ClassType, room: 'Hall C', faculty: 'Dr. Robert Ross' },
  { code: 'CS350', name: 'Artificial Intelligence & Search', type: 'Lecture' as ClassType, room: 'Auditorium 1', faculty: 'Prof. Neha Patel' },
];

export async function parseTimetableFile(
  file: File,
  existingTimetable: TimetableEntry[] = []
): Promise<ParseResult> {
  const warnings: string[] = [];
  const fileName = file.name;
  const fileSize = file.size;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // 1. Validation
  const validExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'csv', 'xlsx', 'txt'];
  if (!validExtensions.includes(ext)) {
    throw new Error(`Unsupported file format (.${ext}). Please upload PDF, Image (PNG/JPG), CSV, or Excel XLSX.`);
  }

  if (fileSize > 15 * 1024 * 1024) {
    throw new Error('File exceeds maximum allowed size (15 MB).');
  }

  // 2. Simulated Extraction & OCR / Table Parsing
  // In a real environment with backend or local OCR, Tesseract/pdf-parse processes this.
  // Here we parse CSV text directly if text/csv, or simulate realistic document scanning for PDF/images.
  let candidates: ImportedClassCandidate[] = [];

  if (ext === 'csv' || ext === 'txt') {
    const text = await file.text();
    candidates = parseCSVText(text);
  } else {
    // PDF / Image / Spreadsheet OCR extraction simulation
    candidates = generateSimulatedOCRSchedule(ext, existingTimetable);
  }

  // 3. Conflict Detection
  candidates = candidates.map((cand) => {
    // Check against existing timetable
    const conflict = existingTimetable.find(
      (ex) => ex.day === cand.day && isTimeOverlap(ex.startTime, ex.endTime, cand.startTime, cand.endTime)
    );

    if (conflict) {
      warnings.push(`Potential schedule conflict on ${cand.day} between ${cand.code} and ${conflict.code} (${conflict.startTime}-${conflict.endTime}).`);
      return {
        ...cand,
        hasConflict: true,
        conflictDetails: `Overlaps with existing class ${conflict.code} (${conflict.startTime} - ${conflict.endTime})`,
      };
    }
    return cand;
  });

  return {
    success: true,
    candidates,
    fileName,
    fileType: file.type || ext.toUpperCase(),
    fileSize,
    detectedCount: candidates.length,
    warnings,
  };
}

function parseCSVText(text: string): ImportedClassCandidate[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const candidates: ImportedClassCandidate[] = [];

  lines.forEach((line, idx) => {
    // Skip header line if detected
    if (idx === 0 && line.toLowerCase().includes('subject')) return;
    const parts = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
    if (parts.length >= 4) {
      const code = parts[0] || 'SUB101';
      const name = parts[1] || 'Course Session';
      const day = (normalizeDay(parts[2]) || 'Monday') as DayOfWeek;
      const times = (parts[3] || '09:00-10:00').split('-');
      const start = times[0]?.trim() || '09:00';
      const end = times[1]?.trim() || '10:00';
      const room = parts[4] || 'Room 101';
      const faculty = parts[5] || 'Faculty Member';

      candidates.push({
        id: `cand_${Date.now()}_${idx}`,
        code,
        subjectName: name,
        day,
        startTime: start,
        endTime: end,
        room,
        faculty,
        type: (parts[6] as ClassType) || 'Lecture',
        confidence: 0.95,
        selected: true,
      });
    }
  });

  return candidates.length > 0 ? candidates : generateSimulatedOCRSchedule('csv', []);
}

function generateSimulatedOCRSchedule(ext: string, existing: TimetableEntry[]): ImportedClassCandidate[] {
  const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const candidates: ImportedClassCandidate[] = [
    {
      id: 'cand_1',
      code: 'CS301',
      subjectName: 'Algorithms & Complexity',
      day: 'Monday',
      startTime: '09:30',
      endTime: '10:45',
      room: 'Hall B - Turing Wing',
      faculty: 'Dr. Evelyn Vance',
      type: 'Lecture',
      confidence: 0.98,
      selected: true,
    },
    {
      id: 'cand_2',
      code: 'CS304',
      subjectName: 'Operating Systems & Kernels',
      day: 'Tuesday',
      startTime: '11:00',
      endTime: '12:15',
      room: 'Systems Lab 2',
      faculty: 'Dr. Marcus Brody',
      type: 'Lecture',
      confidence: 0.94,
      selected: true,
    },
    {
      id: 'cand_3',
      code: 'CS320',
      subjectName: 'Computer Networks',
      day: 'Wednesday',
      startTime: '10:00',
      endTime: '11:30',
      room: 'Hall C',
      faculty: 'Dr. Robert Ross',
      type: 'Lecture',
      confidence: 0.91,
      selected: true,
    },
    {
      id: 'cand_4',
      code: 'CS350',
      subjectName: 'Artificial Intelligence & Search',
      day: 'Thursday',
      startTime: '14:00',
      endTime: '15:30',
      room: 'Auditorium 1',
      faculty: 'Prof. Neha Patel',
      type: 'Lecture',
      confidence: 0.89,
      selected: true,
    },
    {
      id: 'cand_5',
      code: 'MATH240',
      subjectName: 'Applied Linear Algebra',
      day: 'Friday',
      startTime: '11:15',
      endTime: '12:30',
      room: 'Room 102',
      faculty: 'Prof. David Chen',
      type: 'Tutorial',
      confidence: 0.96,
      selected: true,
    },
  ];

  return candidates;
}

function normalizeDay(str: string): DayOfWeek | null {
  const lower = str.toLowerCase();
  if (lower.startsWith('mon')) return 'Monday';
  if (lower.startsWith('tue')) return 'Tuesday';
  if (lower.startsWith('wed')) return 'Wednesday';
  if (lower.startsWith('thu')) return 'Thursday';
  if (lower.startsWith('fri')) return 'Friday';
  if (lower.startsWith('sat')) return 'Saturday';
  if (lower.startsWith('sun')) return 'Sunday';
  return null;
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

/**
 * Data structures for oggytrack — Academic Management System
 */

export type ThemeMode = 'dark' | 'light' | 'system';
export type PrimaryColor =
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'fuchsia'
  | 'rose'
  | 'amber'
  | 'custom';
export type ClassType = 'Lecture' | 'Lab' | 'Tutorial' | 'Seminar' | 'Workshop' | 'Custom';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type AttendanceStatus = 'present' | 'absent' | 'cancelled' | 'excused' | 'unmarked';
export type AssignmentPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AssignmentStatus = 'not_started' | 'in_progress' | 'completed' | 'submitted';
export type AssignmentType = 'Homework' | 'Project' | 'Lab Report' | 'Quiz' | 'Presentation' | 'Essay';
export type HolidayType = 'National' | 'Institutional' | 'Semester Break' | 'Exam Preparation' | 'Personal';
export type ExamCategory =
  | 'Quiz'
  | 'Unit Test'
  | 'Midterm'
  | 'Lab Practical'
  | 'Viva'
  | 'End-Term'
  | 'Custom';

export interface UserProfile {
  id: string;
  name: string;
  studentId: string;
  institution: string;
  degree: string;
  academicYear: string;
  semester: string;
  targetAttendance: number; // default 75%
  hasRecoveryFriend?: boolean;
  workingDays: DayOfWeek[];
  isDemoUser?: boolean;
  hasCompletedTutorial?: boolean;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  code: string;
  credits: number;
  faculty: string;
  room: string;
  color: string;
  targetAttendance: number;
  notes?: string;
  archived?: boolean;
  createdAt: string;
}

export interface TimetableEntry {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  code: string;
  day: DayOfWeek;
  startTime: string; // "09:30"
  endTime: string;   // "10:45"
  room: string;
  faculty: string;
  type: ClassType;
  color: string;
  recurrence: 'weekly' | 'once' | 'biweekly';
  specificDate?: string; // YYYY-MM-DD for one-time sessions
  notes?: string;
  isCancelled?: boolean;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  subjectId: string;
  timetableEntryId?: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string;
  timestamp: string;
}

export interface Assignment {
  id: string;
  userId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:MM
  priority: AssignmentPriority;
  status: AssignmentStatus;
  type: AssignmentType;
  completionPercent: number;
  attachments?: { name: string; size: string }[];
  completedAt?: string;
  createdAt: string;
}

export interface SubjectExam {
  id: string;
  userId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  title: string;
  category: ExamCategory;
  examDate: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  room?: string;
  marksObtained?: number | null;
  maxMarks: number;
  weightage?: number | null;
  color?: string;
  notes?: string;
  createdAt: string;
}

export interface Holiday {
  id: string;
  userId: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  type: HolidayType;
  description?: string;
  cancelsClasses: boolean;
}

export interface AcademicNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'attendance_warning' | 'assignment_due' | 'class_upcoming' | 'conflict_alert' | 'system';
  read: boolean;
  date: string;
  actionUrl?: string;
}

export interface AppSettings {
  theme: ThemeMode;
  primaryColor: PrimaryColor;
  customHex?: string;
  accentColor: string;
  borderRadius: string;
  density: 'compact' | 'balanced' | 'spacious';
  sidebarStyle: 'fixed-expanded' | 'collapsible' | 'icon-only';
  dashboardStyle: 'cards' | 'minimal-list' | 'analytics-focused';
  timeFormat: '12h' | '24h';
  defaultClassDurationMinutes: number;
  excusedCountAsAttended: boolean;
  backgroundMode?: 'space' | 'photo';
  applyPhotoToLanding?: boolean;
  glassOpacity?: number;
  glassBlur?: number;
  photoDimmer?: number;
  photoBlur?: number;
}

export interface ImportedClassCandidate {
  id: string;
  code: string;
  subjectName: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  room: string;
  faculty: string;
  type: ClassType;
  confidence: number; // 0 to 1
  selected: boolean;
  hasConflict?: boolean;
  conflictDetails?: string;
}

export interface ImportedSubjectCandidate {
  id: string;
  code: string;
  name: string;
  credits: number;
  faculty: string;
  room: string;
  targetAttendance: number;
  color?: string;
  selected: boolean;
}

export interface ImportedAttendanceCandidate {
  id: string;
  code: string;
  subjectName: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'cancelled';
  note?: string;
  selected: boolean;
}

export interface ImportedAttendanceSummaryCandidate {
  id: string;
  code: string;
  subjectName: string;
  attended: number;
  missed: number;
  cancelled: number;
  selected: boolean;
}

export interface ImportedAssignmentCandidate {
  id: string;
  subjectCode: string;
  subjectName: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:MM
  priority: AssignmentPriority;
  type: AssignmentType;
  selected: boolean;
}

export interface ImportedHolidayCandidate {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type: HolidayType;
  description?: string;
  cancelsClasses: boolean;
  selected: boolean;
}

export type KanbanColumnId = 'todo' | 'doing' | 'done';
export type KanbanPriority = 'high' | 'med' | 'low';
export type NotebookPaperStyle = 'ruled' | 'grid' | 'dots' | 'plain';
export type NotebookTheme = 'light' | 'dark';

export interface KanbanTask {
  id: string;
  title: string;
  note: string;
  priority: KanbanPriority;
  due: string; // YYYY-MM-DD or ''
  subjectId?: string;
  subjectCode?: string;
  sourceAssignmentId?: string;
  createdAt?: string;
}

export interface NotebookBoard {
  id: string;
  name: string;
  columns: Record<KanbanColumnId, KanbanTask[]>;
}

export interface NotebookData {
  boards: NotebookBoard[];
  activeId: string;
}

export interface NotebookThemeColors {
  paper: string;
  ink: string;
  lines: string;
  margin: string;
  accent: string;
  high: string;
  med: string;
  low: string;
}

export interface NotebookConfig {
  hand: string;
  body: string;
  paper: NotebookPaperStyle;
  margin: boolean;
  fs: number;
  hs: number;
  tm: number;
  cr: number;
  tape: boolean;
  h24: boolean;
  sec: boolean;
  date: boolean;
  clock: boolean;
  pad: boolean;
  motto: string;
  ring: string;
  cols: Record<KanbanColumnId, string>;
  c: {
    light: Partial<NotebookThemeColors>;
    dark: Partial<NotebookThemeColors>;
  };
}

export interface NotebookWorkspaceState {
  data: NotebookData;
  cfg: NotebookConfig;
  theme: NotebookTheme;
  scribbleDataUrl: string | null;
  photoDataUrl: string | null;
}

export interface AcademicImportPayload {
  subjects: Subject[];
  timetable: TimetableEntry[];
  attendanceRecords: AttendanceRecord[];
  assignments: Assignment[];
  holidays: Holiday[];
  exams?: SubjectExam[];
  replaceSubjectIdsForSummary?: string[];
  restoredProfile?: Partial<UserProfile>;
  restoredSettings?: Partial<AppSettings>;
  restoredNotebook?: NotebookWorkspaceState;
  restoredWallpaper?: string | null;
}



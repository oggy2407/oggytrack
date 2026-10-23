/**
 * Data structures for oggytrack — Academic Management System
 */

export type ThemeMode = 'dark' | 'light' | 'system';
export type PrimaryColor = 'violet' | 'indigo' | 'blue' | 'teal' | 'emerald' | 'rose' | 'custom';
export type ClassType = 'Lecture' | 'Lab' | 'Tutorial' | 'Seminar' | 'Workshop' | 'Custom';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type AttendanceStatus = 'present' | 'absent' | 'cancelled' | 'excused' | 'unmarked';
export type AssignmentPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AssignmentStatus = 'not_started' | 'in_progress' | 'completed' | 'submitted';
export type AssignmentType = 'Homework' | 'Project' | 'Lab Report' | 'Quiz' | 'Presentation' | 'Essay';
export type HolidayType = 'National' | 'Institutional' | 'Semester Break' | 'Exam Preparation' | 'Personal';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  studentId: string;
  institution: string;
  degree: string;
  academicYear: string;
  semester: string;
  targetAttendance: number; // default 75%
  timezone: string;
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

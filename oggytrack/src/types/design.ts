export type ThemeMode = 'light' | 'dark' | 'system';

export type PrimaryColor = 
  | 'indigo' 
  | 'blue' 
  | 'violet' 
  | 'teal' 
  | 'emerald' 
  | 'rose' 
  | 'custom';

export type LayoutDensity = 'compact' | 'balanced' | 'spacious';

export type SidebarStyle = 'fixed-expanded' | 'collapsible' | 'icon-only';

export type DashboardStyle = 'cards' | 'minimal-list' | 'analytics-focused';

export type AnimationIntensity = 'none' | 'subtle' | 'smooth';

export type MobileNavStyle = 'bottom-nav' | 'slide-drawer';

export type DesignPresetId = 'minimal' | 'dark-tech' | 'linear' | 'student-planner' | 'glassmorphism' | 'custom';

export interface DesignConfig {
  id: DesignPresetId;
  name: string;
  tagline: string;
  theme: ThemeMode;
  primaryColor: PrimaryColor;
  customHex?: string;
  accentColor: string;
  borderRadius: 'rounded-none' | 'rounded-md' | 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl';
  density: LayoutDensity;
  sidebarStyle: SidebarStyle;
  dashboardStyle: DashboardStyle;
  animations: AnimationIntensity;
  mobileNav: MobileNavStyle;
  fontFamily: 'plus-jakarta' | 'outfit' | 'inter' | 'mono';
  surfaceStyle: 'flat' | 'bordered' | 'glass' | 'high-contrast' | 'soft-shadow';
}

export type PreviewScreen = 'dashboard' | 'timetable' | 'attendance' | 'assignments' | 'calendar';
export type ViewportMode = 'desktop' | 'mobile';

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  credits: number;
  faculty: string;
  room: string;
  color: string;
  targetAttendance: number; // e.g. 75%
  attended: number;
  missed: number;
  cancelled: number;
  excused: number;
}

export interface ClassSession {
  id: string;
  subjectId: string;
  subjectName: string;
  code: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startTime: string; // e.g. "09:30"
  endTime: string;   // e.g. "10:30"
  room: string;
  faculty: string;
  type: 'Lecture' | 'Lab' | 'Tutorial' | 'Seminar';
  color: string;
  isToday?: boolean;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
}

export interface AssignmentItem {
  id: string;
  title: string;
  subjectCode: string;
  subjectName: string;
  dueDate: string;
  dueTime: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'not_started' | 'in_progress' | 'completed';
  type: 'Homework' | 'Project' | 'Lab Report' | 'Quiz' | 'Presentation';
  completionPercent: number;
}

export interface HolidayItem {
  id: string;
  title: string;
  date: string;
  type: 'National' | 'Institutional' | 'Semester Break' | 'Optional';
  daysCount: number;
  description: string;
}

export interface AcademicEvent {
  id: string;
  title: string;
  date: string;
  category: 'class' | 'exam' | 'assignment' | 'holiday' | 'event';
  time?: string;
  subjectCode?: string;
}

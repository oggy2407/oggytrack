import { 
  UserProfile, 
  Subject, 
  TimetableEntry, 
  AttendanceRecord, 
  Assignment, 
  Holiday, 
  AcademicNotification, 
  AppSettings,
  DayOfWeek
} from '../types/oggytrack';
import { getDayOfWeekFromDate } from './dateUtils';

const STORAGE_KEYS = {
  AUTH: 'oggytrack_auth',
  CURRENT_USER: 'oggytrack_current_user',
  ACCOUNTS: 'oggytrack_accounts',
  SUBJECTS: 'oggytrack_subjects',
  TIMETABLE: 'oggytrack_timetable',
  ATTENDANCE: 'oggytrack_attendance',
  ASSIGNMENTS: 'oggytrack_assignments',
  HOLIDAYS: 'oggytrack_holidays',
  NOTIFICATIONS: 'oggytrack_notifications',
  SETTINGS: 'oggytrack_settings',
};

export interface AuthCredentials {
  username: string;
  password: string;
  isAuthenticated: boolean;
  lastLoginAt?: string;
}

export interface StoredAccount {
  username: string;
  password: string;
  profile: UserProfile;
  createdAt: string;
}

export const DEFAULT_AUTH: AuthCredentials = {
  username: '',
  password: '',
  isAuthenticated: false,
};

export const DEFAULT_USER: UserProfile = {
  id: 'usr_guest',
  name: 'Student',
  email: 'student@campus.edu',
  studentId: 'STU-2026',
  institution: 'College of Technology',
  degree: 'Bachelor of Technology',
  academicYear: '2026-2027',
  semester: 'Semester 1',
  targetAttendance: 75,
  timezone: 'America/New_York',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  hasCompletedTutorial: false,
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  primaryColor: 'violet',
  accentColor: '#a855f7',
  borderRadius: 'rounded-2xl',
  density: 'balanced',
  sidebarStyle: 'collapsible',
  dashboardStyle: 'cards',
  timeFormat: '12h',
  defaultClassDurationMinutes: 60,
  excusedCountAsAttended: false,
};

export const SAMPLE_ENGINEERING_SUBJECTS: Subject[] = [
  {
    id: 'sub_sample_algo',
    userId: '',
    name: 'Algorithms & Complexity',
    code: 'CS301',
    credits: 4,
    faculty: 'Dr. Evelyn Vance',
    room: 'Hall B - Turing Wing',
    color: '#8b5cf6',
    targetAttendance: 75,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sub_sample_os',
    userId: '',
    name: 'Operating Systems & Kernels',
    code: 'CS304',
    credits: 4,
    faculty: 'Dr. Marcus Brody',
    room: 'Systems Lab 2',
    color: '#06b6d4',
    targetAttendance: 75,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sub_sample_db',
    userId: '',
    name: 'Distributed Database Systems',
    code: 'CS310',
    credits: 3,
    faculty: 'Prof. Ananya Rao',
    room: 'Seminar Room 304',
    color: '#f59e0b',
    targetAttendance: 75,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sub_sample_math',
    userId: '',
    name: 'Applied Linear Algebra',
    code: 'MATH240',
    credits: 3,
    faculty: 'Prof. David Chen',
    room: 'Lecture Room 102',
    color: '#ec4899',
    targetAttendance: 75,
    createdAt: new Date().toISOString(),
  },
];

export const SAMPLE_ENGINEERING_TIMETABLE: TimetableEntry[] = [
  {
    id: 'tt_sample_1',
    userId: '',
    subjectId: 'sub_sample_algo',
    subjectName: 'Algorithms & Complexity',
    code: 'CS301',
    day: 'Wednesday',
    startTime: '09:30',
    endTime: '10:45',
    room: 'Hall B - Turing Wing',
    faculty: 'Dr. Evelyn Vance',
    type: 'Lecture',
    color: '#8b5cf6',
    recurrence: 'weekly',
  },
  {
    id: 'tt_sample_2',
    userId: '',
    subjectId: 'sub_sample_math',
    subjectName: 'Applied Linear Algebra',
    code: 'MATH240',
    day: 'Wednesday',
    startTime: '11:15',
    endTime: '12:30',
    room: 'Lecture Room 102',
    faculty: 'Prof. David Chen',
    type: 'Tutorial',
    color: '#ec4899',
    recurrence: 'weekly',
  },
  {
    id: 'tt_sample_3',
    userId: '',
    subjectId: 'sub_sample_os',
    subjectName: 'Operating Systems & Kernels',
    code: 'CS304',
    day: 'Wednesday',
    startTime: '14:00',
    endTime: '16:00',
    room: 'Systems Lab 2',
    faculty: 'Dr. Marcus Brody',
    type: 'Lab',
    color: '#06b6d4',
    recurrence: 'weekly',
  },
];

/**
 * Storage Controller Class
 */
class LocalDB {
  private getUserKey(prefix: string, userId: string): string {
    return `${prefix}_${userId}`;
  }

  getAccounts(): Record<string, StoredAccount> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  saveAccounts(accounts: Record<string, StoredAccount>) {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  }

  getAuth(): AuthCredentials {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH);
      return data ? JSON.parse(data) : DEFAULT_AUTH;
    } catch {
      return DEFAULT_AUTH;
    }
  }

  saveAuth(auth: AuthCredentials) {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(auth));
  }

  signOut() {
    const current = this.getAuth();
    const updated: AuthCredentials = {
      ...current,
      isAuthenticated: false,
    };
    this.saveAuth(updated);
  }

  /**
   * Professional seamless login or register:
   * Write username and password, and it starts!
   */
  authenticateOrRegister(
    rawUsername: string,
    rawPassword: string
  ): { success: boolean; isNew: boolean; user: UserProfile; error?: string } {
    const username = rawUsername.trim();
    const password = rawPassword.trim();

    if (!username || !password) {
      return {
        success: false,
        isNew: false,
        user: DEFAULT_USER,
        error: 'Please enter both username and password.',
      };
    }

    const accounts = this.getAccounts();
    const key = username.toLowerCase();
    const existing = accounts[key];

    if (existing) {
      if (existing.password !== password) {
        return {
          success: false,
          isNew: false,
          user: existing.profile,
          error: 'Incorrect password for this username. Please try again.',
        };
      }

      // Valid existing account
      this.saveAuth({
        username,
        password,
        isAuthenticated: true,
        lastLoginAt: new Date().toISOString(),
      });
      this.setCurrentUser(existing.profile);

      return {
        success: true,
        isNew: false,
        user: existing.profile,
      };
    }

    // Create a new clean account without demo clutter
    const formattedName = username
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const newUser: UserProfile = {
      id: `usr_${Date.now()}_${key.replace(/[^a-z0-9]/g, '')}`,
      name: formattedName,
      email: `${key}@campus.edu`,
      studentId: `STU-${Math.floor(1000 + Math.random() * 9000)}`,
      institution: 'College of Technology',
      degree: 'B.Tech / B.S. Student',
      academicYear: '2026-2027',
      semester: 'Semester 1',
      targetAttendance: 75,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      hasCompletedTutorial: false,
    };

    accounts[key] = {
      username,
      password,
      profile: newUser,
      createdAt: new Date().toISOString(),
    };
    this.saveAccounts(accounts);

    // Save active session
    this.saveAuth({
      username,
      password,
      isAuthenticated: true,
      lastLoginAt: new Date().toISOString(),
    });
    this.setCurrentUser(newUser);

    // Initialize clean empty datasets for new user
    this.saveSubjects([], newUser.id);
    this.saveTimetable([], newUser.id);
    this.saveAttendanceRecords([], newUser.id);
    this.saveAssignments([], newUser.id);
    this.saveHolidays([], newUser.id);
    this.saveNotifications([], newUser.id);

    return {
      success: true,
      isNew: true,
      user: newUser,
    };
  }

  getCurrentUser(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed;
      }
      return DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  }

  setCurrentUser(user: UserProfile) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    // Also sync to accounts if available
    const auth = this.getAuth();
    if (auth.username) {
      const accounts = this.getAccounts();
      const key = auth.username.toLowerCase();
      if (accounts[key]) {
        accounts[key].profile = user;
        this.saveAccounts(accounts);
      }
    }
  }

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings: AppSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  getSubjects(userId: string): Subject[] {
    try {
      const raw = localStorage.getItem(this.getUserKey(STORAGE_KEYS.SUBJECTS, userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveSubjects(subjects: Subject[], userId: string) {
    localStorage.setItem(this.getUserKey(STORAGE_KEYS.SUBJECTS, userId), JSON.stringify(subjects));
  }

  getTimetable(userId: string): TimetableEntry[] {
    try {
      const raw = localStorage.getItem(this.getUserKey(STORAGE_KEYS.TIMETABLE, userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveTimetable(entries: TimetableEntry[], userId: string) {
    localStorage.setItem(this.getUserKey(STORAGE_KEYS.TIMETABLE, userId), JSON.stringify(entries));
  }

  getAttendanceRecords(userId: string): AttendanceRecord[] {
    try {
      const raw = localStorage.getItem(this.getUserKey(STORAGE_KEYS.ATTENDANCE, userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveAttendanceRecords(records: AttendanceRecord[], userId: string) {
    localStorage.setItem(this.getUserKey(STORAGE_KEYS.ATTENDANCE, userId), JSON.stringify(records));
  }

  getAssignments(userId: string): Assignment[] {
    try {
      const raw = localStorage.getItem(this.getUserKey(STORAGE_KEYS.ASSIGNMENTS, userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveAssignments(assignments: Assignment[], userId: string) {
    localStorage.setItem(this.getUserKey(STORAGE_KEYS.ASSIGNMENTS, userId), JSON.stringify(assignments));
  }

  getHolidays(userId: string): Holiday[] {
    try {
      const raw = localStorage.getItem(this.getUserKey(STORAGE_KEYS.HOLIDAYS, userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveHolidays(holidays: Holiday[], userId: string) {
    localStorage.setItem(this.getUserKey(STORAGE_KEYS.HOLIDAYS, userId), JSON.stringify(holidays));
  }

  getNotifications(userId: string): AcademicNotification[] {
    try {
      const raw = localStorage.getItem(this.getUserKey(STORAGE_KEYS.NOTIFICATIONS, userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveNotifications(notifs: AcademicNotification[], userId: string) {
    localStorage.setItem(this.getUserKey(STORAGE_KEYS.NOTIFICATIONS, userId), JSON.stringify(notifs));
  }

  /**
   * Helper to load sample engineering courses if the user requests it during tutorial or setup
   */
  loadSampleEngineeringTemplate(userId: string) {
    const workingDays: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const liveDay = getDayOfWeekFromDate(new Date());
    const primaryDay: DayOfWeek = workingDays.includes(liveDay) ? liveDay : 'Monday';
    const secondaryDay: DayOfWeek = primaryDay === 'Monday' ? 'Wednesday' : 'Monday';

    const subjects = SAMPLE_ENGINEERING_SUBJECTS.map((s) => ({ ...s, userId }));
    const timetable = SAMPLE_ENGINEERING_TIMETABLE.map((t, idx) => ({
      ...t,
      userId,
      day: idx < 2 ? primaryDay : secondaryDay,
    }));
    this.saveSubjects(subjects, userId);
    this.saveTimetable(timetable, userId);
    return { subjects, timetable };
  }

  resetAllData(userId: string) {
    localStorage.removeItem(this.getUserKey(STORAGE_KEYS.SUBJECTS, userId));
    localStorage.removeItem(this.getUserKey(STORAGE_KEYS.TIMETABLE, userId));
    localStorage.removeItem(this.getUserKey(STORAGE_KEYS.ATTENDANCE, userId));
    localStorage.removeItem(this.getUserKey(STORAGE_KEYS.ASSIGNMENTS, userId));
    localStorage.removeItem(this.getUserKey(STORAGE_KEYS.HOLIDAYS, userId));
    localStorage.removeItem(this.getUserKey(STORAGE_KEYS.NOTIFICATIONS, userId));
  }

  exportBackupJson(userId: string): string {
    const payload = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      user: this.getCurrentUser(),
      subjects: this.getSubjects(userId),
      timetable: this.getTimetable(userId),
      attendance: this.getAttendanceRecords(userId),
      assignments: this.getAssignments(userId),
      holidays: this.getHolidays(userId),
      settings: this.getSettings(),
    };
    return JSON.stringify(payload, null, 2);
  }
}

export const db = new LocalDB();

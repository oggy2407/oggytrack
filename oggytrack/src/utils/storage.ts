import { 
  UserProfile, 
  Subject, 
  TimetableEntry, 
  AttendanceRecord, 
  Assignment, 
  Holiday, 
  SubjectExam,
  AcademicNotification, 
  AppSettings,
  DayOfWeek,
  NotebookWorkspaceState
} from '../types/oggytrack';
import { getDayOfWeekFromDate } from './dateUtils';
import { createDefaultNotebookWorkspace } from './notebookKanban';
import {
  AccountRecordLike,
  RecoveryMethod,
  generateSessionToken,
  hashRecoveryAnswer,
  hashSecret,
  sanitizeUserProfile,
  upgradeAccountRecord,
  resetPasswordWithRecovery,
  validateAndApplySecurityUpdate,
  verifyRecoveryChallenge,
  verifySecret,
} from './authSecurity';
import {
  DEFAULT_GLASS_SETTINGS,
  WALLPAPER_STORAGE_KEY,
  isSafeImageDataUrl,
} from './wallpaperGlass';

const STORAGE_KEYS = {
  AUTH: 'oggytrack_auth',
  CURRENT_USER: 'oggytrack_current_user',
  ACCOUNTS: 'oggytrack_accounts',
  SUBJECTS: 'oggytrack_subjects',
  TIMETABLE: 'oggytrack_timetable',
  ATTENDANCE: 'oggytrack_attendance',
  ASSIGNMENTS: 'oggytrack_assignments',
  HOLIDAYS: 'oggytrack_holidays',
  EXAMS: 'oggytrack_exams',
  NOTEBOOK: 'oggytrack_notebook',
  NOTIFICATIONS: 'oggytrack_notifications',
  SETTINGS: 'oggytrack_settings',
  WALLPAPER: WALLPAPER_STORAGE_KEY,
};

export interface AuthCredentials {
  username: string;
  sessionToken?: string;
  isAuthenticated: boolean;
  isDemoSession?: boolean;
  lastLoginAt?: string;
}

export interface StoredAccount {
  username: string;
  passwordHash: string;
  friendNameHash?: string;
  profile: UserProfile;
  createdAt: string;
}

export const DEFAULT_AUTH: AuthCredentials = {
  username: '',
  isAuthenticated: false,
};

export const DEFAULT_USER: UserProfile = {
  id: 'usr_guest',
  name: 'Student',
  studentId: 'STU-2026',
  institution: 'College of Technology',
  degree: 'Bachelor of Technology',
  academicYear: '2026-2027',
  semester: 'Semester 1',
  targetAttendance: 75,
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  hasCompletedTutorial: false,
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  primaryColor: 'emerald',
  accentColor: '#10b981',
  borderRadius: 'rounded-2xl',
  density: 'balanced',
  sidebarStyle: 'collapsible',
  dashboardStyle: 'cards',
  timeFormat: '12h',
  defaultClassDurationMinutes: 60,
  excusedCountAsAttended: false,
  backgroundMode: DEFAULT_GLASS_SETTINGS.backgroundMode,
  applyPhotoToLanding: DEFAULT_GLASS_SETTINGS.applyPhotoToLanding,
  glassOpacity: DEFAULT_GLASS_SETTINGS.glassOpacity,
  glassBlur: DEFAULT_GLASS_SETTINGS.glassBlur,
  photoDimmer: DEFAULT_GLASS_SETTINGS.photoDimmer,
  photoBlur: DEFAULT_GLASS_SETTINGS.photoBlur,
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
    color: '#10b981',
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
    color: '#3b82f6',
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
    color: '#10b981',
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
      if (!data) return {};
      const parsed = JSON.parse(data) as Record<string, AccountRecordLike>;
      const migratedMap: Record<string, StoredAccount> = {};
      let needsSave = false;

      for (const [key, rawRecord] of Object.entries(parsed)) {
        if (!rawRecord || typeof rawRecord !== 'object') continue;
        const { upgraded, didMigrate } = upgradeAccountRecord(rawRecord);
        if (didMigrate) needsSave = true;
        migratedMap[key] = {
          username: upgraded.username,
          passwordHash: upgraded.passwordHash,
          ...(upgraded.friendNameHash ? { friendNameHash: upgraded.friendNameHash } : {}),
          profile: upgraded.profile,
          createdAt: upgraded.createdAt,
        };
      }

      if (needsSave) {
        this.saveAccounts(migratedMap);
      }
      return migratedMap;
    } catch {
      return {};
    }
  }

  saveAccounts(accounts: Record<string, StoredAccount | AccountRecordLike>) {
    const sanitized: Record<string, StoredAccount> = {};
    for (const [key, rec] of Object.entries(accounts)) {
      const { upgraded } = upgradeAccountRecord(rec as AccountRecordLike);
      sanitized[key] = {
        username: upgraded.username,
        passwordHash: upgraded.passwordHash,
        ...(upgraded.friendNameHash ? { friendNameHash: upgraded.friendNameHash } : {}),
        profile: upgraded.profile,
        createdAt: upgraded.createdAt,
      };
    }
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(sanitized));
  }

  getAuth(): AuthCredentials {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH);
      if (!data) return DEFAULT_AUTH;
      const parsed = JSON.parse(data) as AuthCredentials & Record<string, unknown>;
      const cleanAuth: AuthCredentials = {
        username: typeof parsed.username === 'string' ? parsed.username : '',
        ...(typeof parsed.sessionToken === 'string' ? { sessionToken: parsed.sessionToken } : {}),
        isAuthenticated: Boolean(parsed.isAuthenticated),
        ...(parsed.isDemoSession ? { isDemoSession: true } : {}),
        ...(typeof parsed.lastLoginAt === 'string' ? { lastLoginAt: parsed.lastLoginAt } : {}),
      };
      // Automatically scrub any legacy plaintext `password` property from active session storage
      if ('password' in parsed) {
        this.saveAuth(cleanAuth);
      }
      return cleanAuth;
    } catch {
      return DEFAULT_AUTH;
    }
  }

  saveAuth(auth: AuthCredentials) {
    const cleanAuth: AuthCredentials = {
      username: auth.username || '',
      ...(auth.sessionToken ? { sessionToken: auth.sessionToken } : {}),
      isAuthenticated: Boolean(auth.isAuthenticated),
      ...(auth.isDemoSession ? { isDemoSession: true } : {}),
      ...(auth.lastLoginAt ? { lastLoginAt: auth.lastLoginAt } : {}),
    };
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(cleanAuth));
  }

  signOut() {
    this.saveAuth({
      username: '',
      isAuthenticated: false,
    });
  }

  /**
   * Launches an isolated guest/demo academic workspace without storing or embedding
   * any hardcoded passwords or recovery answers in client source code.
   */
  launchDemoSession(): UserProfile {
    const demoId = 'usr_demo_workspace';
    const existingUser = this.getCurrentUser();
    const demoUser: UserProfile = sanitizeUserProfile(
      {
        id: demoId,
        name: existingUser.id === demoId && existingUser.name ? existingUser.name : 'Demo Student',
        studentId: 'STU-DEMO',
        institution: 'College of Technology',
        degree: 'B.Tech Computer Science',
        academicYear: '2026-2027',
        semester: 'Semester 4',
        targetAttendance: 75,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        isDemoUser: true,
        hasCompletedTutorial: true,
      },
      false
    );

    if (this.getSubjects(demoId).length === 0) {
      this.loadSampleEngineeringTemplate(demoId);
    }

    this.saveAuth({
      username: 'demo_workspace',
      sessionToken: generateSessionToken(),
      isAuthenticated: true,
      isDemoSession: true,
      lastLoginAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(demoUser));
    return demoUser;
  }

  /**
   * Seamless login or registration with salted SHA-256 credential hashing.
   */
  authenticateOrRegister(
    rawUsername: string,
    rawPassword: string,
    rawFriendName?: string
  ): { success: boolean; isNew: boolean; user: UserProfile; error?: string } {
    const username = rawUsername.trim();
    const password = rawPassword.trim();
    const friendName = (rawFriendName || '').trim();

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
      if (!verifySecret(password, existing.passwordHash)) {
        return {
          success: false,
          isNew: false,
          user: existing.profile,
          error: 'Incorrect password for this username. Please try again.',
        };
      }

      const syncedProfile = sanitizeUserProfile(
        existing.profile as UserProfile & Record<string, unknown>,
        Boolean(existing.friendNameHash)
      );

      this.saveAuth({
        username: existing.username || username,
        sessionToken: generateSessionToken(),
        isAuthenticated: true,
        lastLoginAt: new Date().toISOString(),
      });
      this.setCurrentUser(syncedProfile);

      return {
        success: true,
        isNew: false,
        user: syncedProfile,
      };
    }

    const formattedName = username
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const friendNameHash = hashRecoveryAnswer(friendName);

    const newUser: UserProfile = sanitizeUserProfile(
      {
        id: `usr_${Date.now()}_${key.replace(/[^a-z0-9]/g, '')}`,
        name: formattedName,
        studentId: `STU-${Math.floor(1000 + Math.random() * 9000)}`,
        institution: 'College of Technology',
        degree: 'B.Tech / B.S. Student',
        academicYear: '2026-2027',
        semester: 'Semester 1',
        targetAttendance: 75,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        hasCompletedTutorial: false,
      },
      Boolean(friendNameHash)
    );

    accounts[key] = {
      username,
      passwordHash: hashSecret(password),
      ...(friendNameHash ? { friendNameHash } : {}),
      profile: newUser,
      createdAt: new Date().toISOString(),
    };
    this.saveAccounts(accounts);

    this.saveAuth({
      username,
      sessionToken: generateSessionToken(),
      isAuthenticated: true,
      lastLoginAt: new Date().toISOString(),
    });
    this.setCurrentUser(newUser);

    this.saveSubjects([], newUser.id);
    this.saveTimetable([], newUser.id);
    this.saveAttendanceRecords([], newUser.id);
    this.saveAssignments([], newUser.id);
    this.saveHolidays([], newUser.id);
    this.saveExams([], newUser.id);
    this.saveNotebookWorkspace(createDefaultNotebookWorkspace([]), newUser.id);
    this.saveNotifications([], newUser.id);

    return {
      success: true,
      isNew: true,
      user: newUser,
    };
  }

  hasAccountRecoveryFriend(username?: string): boolean {
    const target = (username || this.getAuth().username || '').trim().toLowerCase();
    if (!target) return false;
    const acc = this.getAccounts()[target];
    return Boolean(acc?.friendNameHash);
  }

  setAccountRecoveryFriend(rawFriendName: string, username?: string): boolean {
    const cleaned = rawFriendName.trim();
    const target = (username || this.getAuth().username || '').trim().toLowerCase();
    if (!cleaned || !target) return false;

    const accounts = this.getAccounts();
    const acc = accounts[target];
    if (!acc) return false;

    const friendNameHash = hashRecoveryAnswer(cleaned);
    if (!friendNameHash) return false;

    acc.friendNameHash = friendNameHash;
    acc.profile = sanitizeUserProfile(
      acc.profile as UserProfile & Record<string, unknown>,
      true
    );
    this.saveAccounts(accounts);

    const currentUser = this.getCurrentUser();
    if (currentUser.id === acc.profile.id) {
      localStorage.setItem(
        STORAGE_KEYS.CURRENT_USER,
        JSON.stringify(sanitizeUserProfile(currentUser as UserProfile & Record<string, unknown>, true))
      );
    }
    return true;
  }

  hasExistingAccount(rawUsername: string): boolean {
    const key = rawUsername.trim().toLowerCase();
    if (!key) return false;
    return Boolean(this.getAccounts()[key]);
  }

  updateAccountSecurity(params: {
    currentUsername: string;
    nextUsername: string;
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
    friendName: string;
  }): {
    success: boolean;
    error?: string;
    passwordChanged?: boolean;
    hasRecoveryFriend?: boolean;
    auth?: AuthCredentials;
    user?: UserProfile;
  } {
    const currentAuth = this.getAuth();
    const res = validateAndApplySecurityUpdate({
      accounts: this.getAccounts(),
      currentUsername: params.currentUsername || currentAuth.username,
      nextUsername: params.nextUsername,
      oldPassword: params.oldPassword,
      newPassword: params.newPassword,
      confirmPassword: params.confirmPassword,
      friendName: params.friendName,
    });

    if (!res.success || !res.updatedAccounts || !res.updatedUsername) {
      return { success: false, error: res.error };
    }

    this.saveAccounts(res.updatedAccounts);

    const updatedAuth: AuthCredentials = {
      ...currentAuth,
      username: res.updatedUsername,
      sessionToken: res.passwordChanged
        ? generateSessionToken()
        : currentAuth.sessionToken || generateSessionToken(),
      lastLoginAt: new Date().toISOString(),
    };
    this.saveAuth(updatedAuth);

    const currentUser = this.getCurrentUser();
    const syncedUser = sanitizeUserProfile(
      currentUser as UserProfile & Record<string, unknown>,
      Boolean(res.hasRecoveryFriend)
    );
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(syncedUser));

    const nextKey = res.updatedUsername.toLowerCase();
    if (res.updatedAccounts[nextKey]) {
      res.updatedAccounts[nextKey].profile = syncedUser;
      this.saveAccounts(res.updatedAccounts);
    }

    return {
      success: true,
      passwordChanged: res.passwordChanged,
      hasRecoveryFriend: res.hasRecoveryFriend,
      auth: updatedAuth,
      user: syncedUser,
    };
  }

  verifyAccountRecovery(params: {
    username: string;
    method: RecoveryMethod;
    answer: string;
  }) {
    return verifyRecoveryChallenge({
      accounts: this.getAccounts(),
      username: params.username,
      method: params.method,
      answer: params.answer,
    });
  }

  resetAccountPassword(params: {
    username: string;
    method: RecoveryMethod;
    answer: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    const res = resetPasswordWithRecovery({
      accounts: this.getAccounts(),
      username: params.username,
      method: params.method,
      answer: params.answer,
      newPassword: params.newPassword,
      confirmPassword: params.confirmPassword,
    });

    if (!res.success || !res.updatedAccounts || !res.updatedUsername) {
      return { success: false, error: res.error };
    }

    this.saveAccounts(res.updatedAccounts);

    const activeAuth = this.getAuth();
    if (
      activeAuth.username &&
      activeAuth.username.trim().toLowerCase() === res.updatedUsername.toLowerCase()
    ) {
      this.saveAuth({
        ...activeAuth,
        sessionToken: generateSessionToken(),
        lastLoginAt: new Date().toISOString(),
      });
    }

    return {
      success: true,
      username: res.updatedUsername,
      user: res.updatedProfile,
    };
  }

  getCurrentUser(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (data) {
        const parsed = JSON.parse(data) as UserProfile & Record<string, unknown>;
        const sanitized = sanitizeUserProfile(parsed);
        if ('recoveryFriendName' in parsed || 'email' in parsed || 'timezone' in parsed) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(sanitized));
        }
        return sanitized;
      }
      return DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  }

  setCurrentUser(user: UserProfile) {
    const auth = this.getAuth();
    const accounts = auth.username ? this.getAccounts() : {};
    const key = auth.username ? auth.username.toLowerCase() : '';
    const existingAccount = key ? accounts[key] : undefined;
    const hasFriend = existingAccount
      ? Boolean(existingAccount.friendNameHash)
      : Boolean(user.hasRecoveryFriend);

    const cleanUser = sanitizeUserProfile(
      user as UserProfile & Record<string, unknown>,
      hasFriend
    );
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(cleanUser));

    if (existingAccount) {
      accounts[key].profile = cleanUser;
      this.saveAccounts(accounts);
    }
  }

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings: AppSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  getCustomWallpaper(): string | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.WALLPAPER);
      if (!raw || !isSafeImageDataUrl(raw)) return null;
      return raw;
    } catch {
      return null;
    }
  }

  saveCustomWallpaper(dataUrl: string | null): boolean {
    try {
      if (!dataUrl) {
        localStorage.removeItem(STORAGE_KEYS.WALLPAPER);
        return true;
      }
      if (!isSafeImageDataUrl(dataUrl)) return false;
      localStorage.setItem(STORAGE_KEYS.WALLPAPER, dataUrl);
      return true;
    } catch {
      return false;
    }
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

  getExams(userId: string): SubjectExam[] {
    try {
      const raw = localStorage.getItem(this.getUserKey(STORAGE_KEYS.EXAMS, userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveExams(exams: SubjectExam[], userId: string) {
    localStorage.setItem(this.getUserKey(STORAGE_KEYS.EXAMS, userId), JSON.stringify(exams));
  }

  getNotebookWorkspace(userId: string): NotebookWorkspaceState {
    try {
      const raw = localStorage.getItem(this.getUserKey(STORAGE_KEYS.NOTEBOOK, userId));
      if (raw) {
        const parsed = JSON.parse(raw) as NotebookWorkspaceState;
        if (parsed && parsed.data && Array.isArray(parsed.data.boards) && parsed.data.boards.length > 0) {
          const fallback = createDefaultNotebookWorkspace(this.getSubjects(userId));
          return {
            data: parsed.data,
            cfg: {
              ...fallback.cfg,
              ...(parsed.cfg || {}),
              cols: { ...fallback.cfg.cols, ...(parsed.cfg?.cols || {}) },
              c: {
                light: { ...(parsed.cfg?.c?.light || {}) },
                dark: { ...(parsed.cfg?.c?.dark || {}) },
              },
            },
            theme: parsed.theme === 'dark' ? 'dark' : 'light',
            scribbleDataUrl: parsed.scribbleDataUrl ?? null,
            photoDataUrl: parsed.photoDataUrl ?? null,
          };
        }
      }
      return createDefaultNotebookWorkspace(this.getSubjects(userId));
    } catch {
      return createDefaultNotebookWorkspace(this.getSubjects(userId));
    }
  }

  saveNotebookWorkspace(workspace: NotebookWorkspaceState, userId: string) {
    localStorage.setItem(
      this.getUserKey(STORAGE_KEYS.NOTEBOOK, userId),
      JSON.stringify(workspace)
    );
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
    this.saveNotebookWorkspace(createDefaultNotebookWorkspace(subjects), userId);
    return { subjects, timetable };
  }

  resetAllData(userId: string) {
    localStorage.removeItem(this.getUserKey(STORAGE_KEYS.SUBJECTS, userId));
    localStorage.removeItem(this.getUserKey(STORAGE_KEYS.TIMETABLE, userId));
    localStorage.removeItem(this.getUserKey(STORAGE_KEYS.ATTENDANCE, userId));
    localStorage.removeItem(this.getUserKey(STORAGE_KEYS.ASSIGNMENTS, userId));
    localStorage.removeItem(this.getUserKey(STORAGE_KEYS.HOLIDAYS, userId));
    localStorage.removeItem(this.getUserKey(STORAGE_KEYS.EXAMS, userId));
    localStorage.removeItem(this.getUserKey(STORAGE_KEYS.NOTEBOOK, userId));
    localStorage.removeItem(this.getUserKey(STORAGE_KEYS.NOTIFICATIONS, userId));
  }

  exportBackupJson(userId: string): string {
    const cleanUser = sanitizeUserProfile(
      this.getCurrentUser() as UserProfile & Record<string, unknown>
    );
    const payload = {
      version: '2.3.0',
      exportedAt: new Date().toISOString(),
      user: cleanUser,
      subjects: this.getSubjects(userId),
      timetable: this.getTimetable(userId),
      attendance: this.getAttendanceRecords(userId),
      assignments: this.getAssignments(userId),
      holidays: this.getHolidays(userId),
      exams: this.getExams(userId),
      notebook: this.getNotebookWorkspace(userId),
      settings: this.getSettings(),
      customWallpaper: this.getCustomWallpaper(),
    };
    return JSON.stringify(payload, null, 2);
  }
}

export const db = new LocalDB();

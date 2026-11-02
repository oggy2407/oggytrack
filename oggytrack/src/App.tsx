import React, { useState, useEffect } from 'react';
import {
  AcademicImportPayload,
  AcademicNotification,
  AppSettings,
  Assignment,
  AttendanceRecord,
  Holiday,
  NotebookWorkspaceState,
  Subject,
  SubjectExam,
  TimetableEntry,
  UserProfile,
} from './types/oggytrack';
import { db, AuthCredentials } from './utils/storage';
import { buildBackfillAttendanceRecords } from './utils/academicCalculations';
import { applyWorkspaceAccentToRoot } from './utils/colorPalette';
import { applyGlassAppearanceToRoot } from './utils/wallpaperGlass';
import { createDefaultNotebookWorkspace } from './utils/notebookKanban';
import { formatDateISO } from './utils/dateUtils';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { TimetableManager } from './components/timetable/TimetableManager';
import { TimetableImporter, ImporterFocusMode } from './components/timetable/TimetableImporter';
import { AttendanceCenter } from './components/attendance/AttendanceCenter';
import { ExamsManager } from './components/exams/ExamsManager';
import { AssignmentTracker } from './components/assignments/AssignmentTracker';
import { HolidayManager } from './components/holidays/HolidayManager';
import { SubjectManager } from './components/subjects/SubjectManager';
import { UnifiedCalendar } from './components/calendar/UnifiedCalendar';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { NotebookKanbanView } from './components/todo/NotebookKanbanView';
import { AuthPage } from './components/auth/AuthPage';
import { BlackHoleCanvas } from './components/mars/BlackHoleCanvas';
import { CustomPhotoBackground } from './components/common/CustomPhotoBackground';
import { OnboardingTutorial } from './components/onboarding/OnboardingTutorial';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => db.getCurrentUser());
  const [auth, setAuth] = useState<AuthCredentials>(() => db.getAuth());
  const [settings, setSettings] = useState<AppSettings>(() => db.getSettings());
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(() =>
    db.getCustomWallpaper()
  );
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Core Data States
  const [subjects, setSubjects] = useState<Subject[]>(() => db.getSubjects(currentUser.id));
  const [timetable, setTimetable] = useState<TimetableEntry[]>(() => db.getTimetable(currentUser.id));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() =>
    db.getAttendanceRecords(currentUser.id)
  );
  const [assignments, setAssignments] = useState<Assignment[]>(() => db.getAssignments(currentUser.id));
  const [holidays, setHolidays] = useState<Holiday[]>(() => db.getHolidays(currentUser.id));
  const [exams, setExams] = useState<SubjectExam[]>(() => db.getExams(currentUser.id));
  const [notebookWorkspace, setNotebookWorkspace] = useState<NotebookWorkspaceState>(() =>
    db.getNotebookWorkspace(currentUser.id)
  );
  const [notifications, setNotifications] = useState<AcademicNotification[]>(() =>
    db.getNotifications(currentUser.id)
  );
  const [examSubjectFilter, setExamSubjectFilter] = useState<string>('all');
  const [autoOpenAddExamSubjectId, setAutoOpenAddExamSubjectId] = useState<string | null>(null);
  const [autoOpenAddTodoNote, setAutoOpenAddTodoNote] = useState<boolean>(false);

  // Global Modals & Tutorial
  const [importModalMode, setImportModalMode] = useState<ImporterFocusMode | null>(null);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  useEffect(() => {
    applyWorkspaceAccentToRoot(document.documentElement.style, settings);
    applyGlassAppearanceToRoot(
      document.documentElement,
      settings,
      Boolean(customWallpaper)
    );
  }, [settings, customWallpaper]);

  const handleUpdateWallpaper = (nextDataUrl: string | null): boolean => {
    const ok = db.saveCustomWallpaper(nextDataUrl);
    if (ok) {
      setCustomWallpaper(nextDataUrl);
    }
    return ok;
  };

  useEffect(() => {
    document.documentElement.classList.add('dark');

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' && !db.getAuth().isAuthenticated) {
        const demoUser = db.launchDemoSession();
        setCurrentUser(demoUser);
        setSubjects(db.getSubjects(demoUser.id));
        setTimetable(db.getTimetable(demoUser.id));
        setAttendance(db.getAttendanceRecords(demoUser.id));
        setAssignments(db.getAssignments(demoUser.id));
        setHolidays(db.getHolidays(demoUser.id));
        setExams(db.getExams(demoUser.id));
        setNotebookWorkspace(db.getNotebookWorkspace(demoUser.id));
        setNotifications(db.getNotifications(demoUser.id));
        setAuth(db.getAuth());
        setShowTutorial(false);
      }
    }
  }, []);

  const loadUserData = (userId: string) => {
    setSubjects(db.getSubjects(userId));
    setTimetable(db.getTimetable(userId));
    setAttendance(db.getAttendanceRecords(userId));
    setAssignments(db.getAssignments(userId));
    setHolidays(db.getHolidays(userId));
    setExams(db.getExams(userId));
    setNotebookWorkspace(db.getNotebookWorkspace(userId));
    setNotifications(db.getNotifications(userId));
  };

  const handleSignOut = () => {
    db.signOut();
    setAuth({ username: '', isAuthenticated: false });
    setActivePage('dashboard');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const handleLaunchDemo = () => {
    const demoUser = db.launchDemoSession();
    setCurrentUser(demoUser);
    loadUserData(demoUser.id);
    setAuth(db.getAuth());
    setShowTutorial(false);
  };

  const handleLoginSuccess = (user: UserProfile, isNewUser: boolean) => {
    setCurrentUser(user);
    loadUserData(user.id);
    const updatedAuth = db.getAuth();
    setAuth(updatedAuth);

    if (isNewUser || !user.hasCompletedTutorial) {
      setShowTutorial(true);
    }
  };

  const handleFinishTutorial = (
    updatedUser: UserProfile,
    newSubjects: Subject[],
    newTimetable: TimetableEntry[],
    newRecoveryFriendName?: string
  ) => {
    if (newRecoveryFriendName && newRecoveryFriendName.trim()) {
      db.setAccountRecoveryFriend(newRecoveryFriendName.trim());
    }
    const finalUser: UserProfile = {
      ...updatedUser,
      hasRecoveryFriend:
        Boolean(newRecoveryFriendName?.trim()) || Boolean(updatedUser.hasRecoveryFriend),
    };
    setCurrentUser(finalUser);
    db.setCurrentUser(finalUser);

    if (newSubjects.length > 0) {
      setSubjects(newSubjects);
      db.saveSubjects(newSubjects, finalUser.id);
    }
    if (newTimetable.length > 0) {
      setTimetable(newTimetable);
      db.saveTimetable(newTimetable, finalUser.id);
    }

    setShowTutorial(false);
  };

  const handleSkipTutorial = () => {
    const updated = { ...currentUser, hasCompletedTutorial: true };
    setCurrentUser(updated);
    db.setCurrentUser(updated);
    setShowTutorial(false);
  };

  /**
   * Marks or toggles attendance for a specific scheduled class slot on ANY date (past or today).
   */
  const handleMarkDateAttendance = (
    subjectId: string,
    status: 'present' | 'absent' | 'cancelled',
    dateISO: string,
    timetableEntryId?: string
  ) => {
    setAttendance((prev) => {
      const existingIndex = prev.findIndex(
        (r) =>
          r.subjectId === subjectId &&
          r.date === dateISO &&
          (timetableEntryId ? r.timetableEntryId === timetableEntryId : !r.timetableEntryId)
      );

      let updated: AttendanceRecord[];
      if (existingIndex >= 0) {
        if (prev[existingIndex].status === status) {
          updated = prev.filter((_, idx) => idx !== existingIndex);
        } else {
          updated = prev.map((r, idx) =>
            idx === existingIndex
              ? { ...r, status, timestamp: new Date().toISOString() }
              : r
          );
        }
      } else {
        const newRecord: AttendanceRecord = {
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: currentUser.id,
          subjectId,
          timetableEntryId,
          date: dateISO,
          status,
          timestamp: new Date().toISOString(),
        };
        updated = [newRecord, ...prev];
      }

      db.saveAttendanceRecords(updated, currentUser.id);
      return updated;
    });
  };

  /**
   * Dashboard shortcut for today's scheduled classes.
   */
  const handleMarkTodayAttendance = (
    subjectId: string,
    status: 'present' | 'absent' | 'cancelled',
    timetableEntryId?: string
  ) => {
    const todayStr = formatDateISO(new Date());
    handleMarkDateAttendance(subjectId, status, todayStr, timetableEntryId);
  };

  /**
   * Appends a new attendance record on the chosen date (never deleting prior records on repeated clicks).
   */
  const handleAppendAttendance = (
    subjectId: string,
    status: 'present' | 'absent' | 'cancelled',
    dateISO: string,
    note?: string
  ) => {
    const newRecord: AttendanceRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: currentUser.id,
      subjectId,
      date: dateISO || formatDateISO(new Date()),
      status,
      note,
      timestamp: new Date().toISOString(),
    };

    setAttendance((prev) => {
      const updated = [newRecord, ...prev];
      db.saveAttendanceRecords(updated, currentUser.id);
      return updated;
    });
  };

  const handleUpdateAttendanceRecord = (
    recordId: string,
    status: 'present' | 'absent' | 'cancelled'
  ) => {
    setAttendance((prev) => {
      const updated = prev.map((r) =>
        r.id === recordId ? { ...r, status, timestamp: new Date().toISOString() } : r
      );
      db.saveAttendanceRecords(updated, currentUser.id);
      return updated;
    });
  };

  const handleDeleteAttendanceRecord = (recordId: string) => {
    setAttendance((prev) => {
      const updated = prev.filter((r) => r.id !== recordId);
      db.saveAttendanceRecords(updated, currentUser.id);
      return updated;
    });
  };

  const handleBackfillAttendance = (
    entries: Array<{
      subjectId: string;
      attended: number;
      missed: number;
      cancelled: number;
    }>,
    mode: 'replace' | 'append',
    endDateISO: string
  ) => {
    setAttendance((prev) => {
      const targetSubjectIds = new Set(entries.map((e) => e.subjectId));
      const base =
        mode === 'replace'
          ? prev.filter((r) => !targetSubjectIds.has(r.subjectId))
          : [...prev];

      const generatedAll: AttendanceRecord[] = [];
      entries.forEach((entry) => {
        const scheduledDays = timetable
          .filter((t) => t.subjectId === entry.subjectId)
          .map((t) => t.day);
        const generated = buildBackfillAttendanceRecords({
          userId: currentUser.id,
          subjectId: entry.subjectId,
          attended: entry.attended,
          missed: entry.missed,
          cancelled: entry.cancelled,
          endDateISO,
          scheduledDays,
          note: 'Past attendance backfill',
        });
        generatedAll.push(...generated);
      });

      const updated = [...generatedAll, ...base];
      db.saveAttendanceRecords(updated, currentUser.id);
      return updated;
    });
  };

  const handleResetSubjectAttendance = (subjectId: string) => {
    const updated = attendance.filter((r) => r.subjectId !== subjectId);
    setAttendance(updated);
    db.saveAttendanceRecords(updated, currentUser.id);
  };

  // Timetable Handlers
  const handleSaveTimetableEntry = (entry: TimetableEntry) => {
    const exists = timetable.some((e) => e.id === entry.id);
    const updated = exists
      ? timetable.map((e) => (e.id === entry.id ? entry : e))
      : [...timetable, entry];
    setTimetable(updated);
    db.saveTimetable(updated, currentUser.id);
  };

  const handleDeleteTimetableEntry = (id: string) => {
    const updated = timetable.filter((e) => e.id !== id);
    setTimetable(updated);
    db.saveTimetable(updated, currentUser.id);
  };

  // Universal File Import Handler (Subjects + Timetable + Past Attendance + Assignments + Holidays)
  const handleImportConfirmed = (payload: AcademicImportPayload) => {
    if (payload.subjects.length > 0) {
      const mergedSubjects = [...subjects];
      payload.subjects.forEach((ns) => {
        if (
          !mergedSubjects.some(
            (s) => s.id === ns.id || s.code.toLowerCase() === ns.code.toLowerCase()
          )
        ) {
          mergedSubjects.push(ns);
        }
      });
      setSubjects(mergedSubjects);
      db.saveSubjects(mergedSubjects, currentUser.id);
    }

    if (payload.timetable.length > 0) {
      const mergedTimetable = [...timetable];
      payload.timetable.forEach((nt) => {
        const duplicate = mergedTimetable.some(
          (ex) =>
            ex.code.toLowerCase() === nt.code.toLowerCase() &&
            ex.day === nt.day &&
            ex.startTime === nt.startTime
        );
        if (!duplicate) {
          mergedTimetable.push(nt);
        }
      });
      setTimetable(mergedTimetable);
      db.saveTimetable(mergedTimetable, currentUser.id);
    }

    if (payload.attendanceRecords.length > 0) {
      const replaceIds = new Set(payload.replaceSubjectIdsForSummary || []);
      const baseAttendance =
        replaceIds.size > 0
          ? attendance.filter((r) => !replaceIds.has(r.subjectId))
          : [...attendance];
      const mergedAttendance = [...payload.attendanceRecords, ...baseAttendance];
      setAttendance(mergedAttendance);
      db.saveAttendanceRecords(mergedAttendance, currentUser.id);
    }

    if (payload.assignments.length > 0) {
      const mergedAssignments = [...payload.assignments, ...assignments];
      setAssignments(mergedAssignments);
      db.saveAssignments(mergedAssignments, currentUser.id);
    }

    if (payload.holidays.length > 0) {
      const mergedHolidays = [...holidays];
      payload.holidays.forEach((nh) => {
        const duplicateIdx = mergedHolidays.findIndex(
          (eh) =>
            eh.title.trim().toLowerCase() === nh.title.trim().toLowerCase() &&
            eh.startDate === nh.startDate
        );
        if (duplicateIdx >= 0) {
          mergedHolidays[duplicateIdx] = {
            ...mergedHolidays[duplicateIdx],
            endDate: nh.endDate,
            type: nh.type,
            cancelsClasses: nh.cancelsClasses,
            description: nh.description ?? mergedHolidays[duplicateIdx].description,
          };
        } else {
          mergedHolidays.push(nh);
        }
      });
      setHolidays(mergedHolidays);
      db.saveHolidays(mergedHolidays, currentUser.id);
    }

    if (payload.exams && payload.exams.length > 0) {
      const mergedExams = [...payload.exams, ...exams];
      setExams(mergedExams);
      db.saveExams(mergedExams, currentUser.id);
    }

    if (payload.restoredProfile) {
      const nextUser = {
        ...currentUser,
        institution: payload.restoredProfile.institution ?? currentUser.institution,
        degree: payload.restoredProfile.degree ?? currentUser.degree,
        semester: payload.restoredProfile.semester ?? currentUser.semester,
        targetAttendance: payload.restoredProfile.targetAttendance ?? currentUser.targetAttendance,
      };
      setCurrentUser(nextUser);
      db.setCurrentUser(nextUser);
    }

    if (payload.restoredSettings) {
      const nextSettings = { ...settings, ...payload.restoredSettings };
      setSettings(nextSettings);
      db.saveSettings(nextSettings);
    }

    if (payload.restoredNotebook) {
      setNotebookWorkspace(payload.restoredNotebook);
      db.saveNotebookWorkspace(payload.restoredNotebook, currentUser.id);
    }

    if (payload.restoredWallpaper) {
      handleUpdateWallpaper(payload.restoredWallpaper);
    }

    setImportModalMode(null);
  };

  // Assignment Handlers
  const handleSaveAssignment = (asg: Assignment) => {
    const exists = assignments.some((a) => a.id === asg.id);
    const updated = exists
      ? assignments.map((a) => (a.id === asg.id ? asg : a))
      : [asg, ...assignments];
    setAssignments(updated);
    db.saveAssignments(updated, currentUser.id);
  };

  const handleDeleteAssignment = (id: string) => {
    const updated = assignments.filter((a) => a.id !== id);
    setAssignments(updated);
    db.saveAssignments(updated, currentUser.id);
  };

  const handleToggleAssignmentComplete = (id: string) => {
    const updated = assignments.map((a) => {
      if (a.id === id) {
        const isDone = a.status === 'completed' || a.status === 'submitted';
        return {
          ...a,
          status: (isDone ? 'in_progress' : 'completed') as Assignment['status'],
          completionPercent: isDone ? 50 : 100,
          completedAt: isDone ? undefined : new Date().toISOString(),
        };
      }
      return a;
    });
    setAssignments(updated);
    db.saveAssignments(updated, currentUser.id);
  };

  // Subject Handlers
  const handleSaveSubject = (sub: Subject) => {
    const previousSub = subjects.find((s) => s.id === sub.id);
    const updated = previousSub
      ? subjects.map((s) => (s.id === sub.id ? sub : s))
      : [sub, ...subjects];
    setSubjects(updated);
    db.saveSubjects(updated, currentUser.id);

    if (previousSub && previousSub.color !== sub.color) {
      const syncedTimetable = timetable.map((entry) =>
        entry.subjectId === sub.id && entry.color === previousSub.color
          ? { ...entry, color: sub.color }
          : entry
      );
      setTimetable(syncedTimetable);
      db.saveTimetable(syncedTimetable, currentUser.id);
    }
  };

  const handleDeleteSubject = (id: string) => {
    const updatedSubjects = subjects.filter((s) => s.id !== id);
    const updatedTimetable = timetable.filter((t) => t.subjectId !== id);
    const updatedAttendance = attendance.filter((a) => a.subjectId !== id);
    const updatedExams = exams.filter((e) => e.subjectId !== id);

    setSubjects(updatedSubjects);
    setTimetable(updatedTimetable);
    setAttendance(updatedAttendance);
    setExams(updatedExams);

    db.saveSubjects(updatedSubjects, currentUser.id);
    db.saveTimetable(updatedTimetable, currentUser.id);
    db.saveAttendanceRecords(updatedAttendance, currentUser.id);
    db.saveExams(updatedExams, currentUser.id);
  };

  // Exam & Marks Handlers
  const handleSaveExam = (exam: SubjectExam) => {
    const exists = exams.some((e) => e.id === exam.id);
    const updated = exists
      ? exams.map((e) => (e.id === exam.id ? exam : e))
      : [exam, ...exams];
    setExams(updated);
    db.saveExams(updated, currentUser.id);
  };

  const handleDeleteExam = (id: string) => {
    const updated = exams.filter((e) => e.id !== id);
    setExams(updated);
    db.saveExams(updated, currentUser.id);
  };

  const handleOpenSubjectExams = (subjectId?: string, openAddModal: boolean = false) => {
    setExamSubjectFilter(subjectId || 'all');
    setAutoOpenAddExamSubjectId(openAddModal && subjectId ? subjectId : null);
    setActivePage('exams');
  };

  // Holiday Handlers
  const handleSaveHoliday = (hol: Holiday) => {
    const exists = holidays.some((h) => h.id === hol.id);
    const updated = exists
      ? holidays.map((h) => (h.id === hol.id ? hol : h))
      : [hol, ...holidays];
    setHolidays(updated);
    db.saveHolidays(updated, currentUser.id);
  };

  const handleDeleteHoliday = (id: string) => {
    const updated = holidays.filter((h) => h.id !== id);
    setHolidays(updated);
    db.saveHolidays(updated, currentUser.id);
  };

  // Notification Handlers
  const handleMarkNotifRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    db.saveNotifications(updated, currentUser.id);
  };

  const handleClearAllNotifs = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    db.saveNotifications(updated, currentUser.id);
  };

  const handleChangeNotebookWorkspace = (updated: NotebookWorkspaceState) => {
    setNotebookWorkspace(updated);
    db.saveNotebookWorkspace(updated, currentUser.id);
  };

  // Reset & Export Handlers
  const handleResetData = () => {
    db.resetAllData(currentUser.id);
    const freshNotebook = createDefaultNotebookWorkspace([]);
    db.saveNotebookWorkspace(freshNotebook, currentUser.id);
    setSubjects([]);
    setTimetable([]);
    setAttendance([]);
    setAssignments([]);
    setHolidays([]);
    setExams([]);
    setNotebookWorkspace(freshNotebook);
    setNotifications([]);
  };

  const handleExportJson = () => {
    const jsonStr = db.exportBackupJson(currentUser.id);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oggytrack-${currentUser.name
      .toLowerCase()
      .replace(/\s+/g, '-')}-${formatDateISO(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!auth.isAuthenticated) {
    return (
      <AuthPage
        onLoginSuccess={handleLoginSuccess}
        onLaunchDemo={handleLaunchDemo}
        settings={settings}
        customWallpaper={customWallpaper}
      />
    );
  }

  const renderCurrentPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardView
            user={currentUser}
            settings={settings}
            subjects={subjects}
            timetable={timetable}
            attendance={attendance}
            assignments={assignments}
            holidays={holidays}
            notebookWorkspace={notebookWorkspace}
            onNavigate={setActivePage}
            onMarkAttendance={handleMarkTodayAttendance}
            onToggleAssignmentComplete={handleToggleAssignmentComplete}
            onOpenAddClassModal={() => setActivePage('timetable')}
            onOpenAddAssignmentModal={() => setActivePage('assignments')}
            onOpenImportModal={() => setImportModalMode('universal')}
            onOpenAddSubjectModal={() => setActivePage('subjects')}
          />
        );

      case 'todo':
        return (
          <NotebookKanbanView
            workspace={notebookWorkspace}
            subjects={subjects}
            assignments={assignments}
            autoOpenAddModal={autoOpenAddTodoNote}
            onConsumeAutoOpen={() => setAutoOpenAddTodoNote(false)}
            onChangeWorkspace={handleChangeNotebookWorkspace}
          />
        );

      case 'timetable':
        return (
          <TimetableManager
            userId={currentUser.id}
            timetable={timetable}
            subjects={subjects}
            settings={settings}
            onSaveEntry={handleSaveTimetableEntry}
            onDeleteEntry={handleDeleteTimetableEntry}
            onOpenImportModal={() => setImportModalMode('universal')}
          />
        );

      case 'attendance':
        return (
          <AttendanceCenter
            user={currentUser}
            subjects={subjects}
            timetable={timetable}
            holidays={holidays}
            attendance={attendance}
            settings={settings}
            onMarkDateAttendance={handleMarkDateAttendance}
            onAppendAttendance={handleAppendAttendance}
            onUpdateAttendanceRecord={handleUpdateAttendanceRecord}
            onDeleteAttendanceRecord={handleDeleteAttendanceRecord}
            onBackfillAttendance={handleBackfillAttendance}
            onResetSubjectAttendance={handleResetSubjectAttendance}
            onOpenImportModal={() => setImportModalMode('universal')}
          />
        );

      case 'exams':
        return (
          <ExamsManager
            userId={currentUser.id}
            subjects={subjects}
            exams={exams}
            initialSubjectFilter={examSubjectFilter}
            autoOpenAddForSubjectId={autoOpenAddExamSubjectId}
            onConsumeAutoOpen={() => setAutoOpenAddExamSubjectId(null)}
            onSaveExam={handleSaveExam}
            onDeleteExam={handleDeleteExam}
            onNavigateSubjects={() => setActivePage('subjects')}
          />
        );

      case 'assignments':
        return (
          <AssignmentTracker
            userId={currentUser.id}
            assignments={assignments}
            subjects={subjects}
            onSaveAssignment={handleSaveAssignment}
            onDeleteAssignment={handleDeleteAssignment}
            onToggleComplete={handleToggleAssignmentComplete}
          />
        );

      case 'holidays':
        return (
          <HolidayManager
            userId={currentUser.id}
            holidays={holidays}
            timetable={timetable}
            onSaveHoliday={handleSaveHoliday}
            onDeleteHoliday={handleDeleteHoliday}
            onOpenScanModal={() => setImportModalMode('holidays')}
          />
        );

      case 'subjects':
        return (
          <SubjectManager
            userId={currentUser.id}
            subjects={subjects}
            attendance={attendance}
            assignments={assignments}
            timetable={timetable}
            exams={exams}
            onSaveSubject={handleSaveSubject}
            onDeleteSubject={handleDeleteSubject}
            onOpenSubjectExams={handleOpenSubjectExams}
          />
        );

      case 'calendar':
        return (
          <UnifiedCalendar
            subjects={subjects}
            timetable={timetable}
            assignments={assignments}
            holidays={holidays}
            exams={exams}
            attendance={attendance}
            onMarkDateAttendance={handleMarkDateAttendance}
            onAppendAttendance={handleAppendAttendance}
            onUpdateAttendanceRecord={handleUpdateAttendanceRecord}
            onDeleteAttendanceRecord={handleDeleteAttendanceRecord}
            onOpenScanHolidays={() => setImportModalMode('holidays')}
            onOpenExams={(subId) => handleOpenSubjectExams(subId, false)}
            timeFormat={settings.timeFormat}
          />
        );

      case 'analytics':
        return (
          <AnalyticsView
            user={currentUser}
            subjects={subjects}
            attendance={attendance}
            assignments={assignments}
            timetable={timetable}
          />
        );

      case 'settings':
        return (
          <SettingsView
            user={currentUser}
            settings={settings}
            customWallpaper={customWallpaper}
            onUpdateWallpaper={handleUpdateWallpaper}
            onUpdateUser={(updated) => {
              setCurrentUser(updated);
              db.setCurrentUser(updated);
            }}
            onUpdateSettings={(updated) => {
              setSettings(updated);
              db.saveSettings(updated);
            }}
            onSignOut={handleSignOut}
            onResetData={handleResetData}
            onExportJson={handleExportJson}
            onOpenImportModal={() => setImportModalMode('universal')}
          />
        );

      default:
        return (
          <DashboardView
            user={currentUser}
            settings={settings}
            subjects={subjects}
            timetable={timetable}
            attendance={attendance}
            assignments={assignments}
            holidays={holidays}
            notebookWorkspace={notebookWorkspace}
            onNavigate={setActivePage}
            onMarkAttendance={handleMarkTodayAttendance}
            onToggleAssignmentComplete={handleToggleAssignmentComplete}
            onOpenAddClassModal={() => setActivePage('timetable')}
            onOpenAddAssignmentModal={() => setActivePage('assignments')}
            onOpenImportModal={() => setImportModalMode('universal')}
            onOpenAddSubjectModal={() => setActivePage('subjects')}
          />
        );
    }
  };

  const isCustomPhotoActive =
    settings.backgroundMode === 'photo' && Boolean(customWallpaper);

  return (
    <div className="min-h-screen flex flex-col relative bg-[#03050d] text-[#f3f6ff] font-sans overflow-x-hidden">
      {isCustomPhotoActive && customWallpaper ? (
        <CustomPhotoBackground imageUrl={customWallpaper} settings={settings} />
      ) : (
        <BlackHoleCanvas
          activePage={activePage}
          sidebarCollapsed={sidebarCollapsed}
        />
      )}

      <div className="relative z-10 flex-1 flex flex-col min-h-screen">
        <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
          <Sidebar
            user={currentUser}
            settings={settings}
            activePage={activePage}
            onNavigate={setActivePage}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            onSignOut={handleSignOut}
          />

          <div className="flex-1 flex flex-col min-w-0">
            <Navbar
              user={currentUser}
              settings={settings}
              customWallpaper={customWallpaper}
              onUpdateWallpaper={handleUpdateWallpaper}
              notifications={notifications}
              activePage={activePage}
              onNavigate={setActivePage}
              onUpdateSettings={(updated) => {
                setSettings(updated);
                db.saveSettings(updated);
              }}
              onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
              onQuickAddClass={() => setActivePage('timetable')}
              onQuickAddAssignment={() => setActivePage('assignments')}
              onQuickAddTodoNote={() => {
                setAutoOpenAddTodoNote(true);
                setActivePage('todo');
              }}
              onMarkNotificationRead={handleMarkNotifRead}
              onClearAllNotifications={handleClearAllNotifs}
              onSignOut={handleSignOut}
            />

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              {renderCurrentPage()}
            </main>
          </div>
        </div>
      </div>

      {importModalMode && (
        <TimetableImporter
          userId={currentUser.id}
          existingTimetable={timetable}
          subjects={subjects}
          initialMode={importModalMode}
          onImportConfirmed={handleImportConfirmed}
          onClose={() => setImportModalMode(null)}
        />
      )}

      {showTutorial && (
        <OnboardingTutorial
          user={currentUser}
          onFinish={handleFinishTutorial}
          onSkip={handleSkipTutorial}
        />
      )}
    </div>
  );
}

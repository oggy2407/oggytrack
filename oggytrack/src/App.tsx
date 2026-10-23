import React, { useState, useEffect } from 'react';
import { 
  UserProfile, 
  Subject, 
  TimetableEntry, 
  AttendanceRecord, 
  Assignment, 
  Holiday, 
  AcademicNotification, 
  AppSettings 
} from './types/oggytrack';
import { db, AuthCredentials } from './utils/storage';
import { formatDateISO } from './utils/dateUtils';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { TimetableManager } from './components/timetable/TimetableManager';
import { TimetableImporter } from './components/timetable/TimetableImporter';
import { AttendanceCenter } from './components/attendance/AttendanceCenter';
import { AssignmentTracker } from './components/assignments/AssignmentTracker';
import { HolidayManager } from './components/holidays/HolidayManager';
import { SubjectManager } from './components/subjects/SubjectManager';
import { UnifiedCalendar } from './components/calendar/UnifiedCalendar';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { AuthPage } from './components/auth/AuthPage';
import { OnboardingTutorial } from './components/onboarding/OnboardingTutorial';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => db.getCurrentUser());
  const [auth, setAuth] = useState<AuthCredentials>(() => db.getAuth());
  const [settings, setSettings] = useState<AppSettings>(() => db.getSettings());
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Core Data States
  const [subjects, setSubjects] = useState<Subject[]>(() => db.getSubjects(currentUser.id));
  const [timetable, setTimetable] = useState<TimetableEntry[]>(() => db.getTimetable(currentUser.id));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => db.getAttendanceRecords(currentUser.id));
  const [assignments, setAssignments] = useState<Assignment[]>(() => db.getAssignments(currentUser.id));
  const [holidays, setHolidays] = useState<Holiday[]>(() => db.getHolidays(currentUser.id));
  const [notifications, setNotifications] = useState<AcademicNotification[]>(() => db.getNotifications(currentUser.id));

  // Global Modals & Tutorial
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Enforce sleek dark theme system
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Reload data whenever active user switches
  const loadUserData = (userId: string) => {
    setSubjects(db.getSubjects(userId));
    setTimetable(db.getTimetable(userId));
    setAttendance(db.getAttendanceRecords(userId));
    setAssignments(db.getAssignments(userId));
    setHolidays(db.getHolidays(userId));
    setNotifications(db.getNotifications(userId));
  };

  // Sign out cleanly
  const handleSignOut = () => {
    db.signOut();
    setAuth({ username: '', password: '', isAuthenticated: false });
    setActivePage('dashboard');
  };

  // Handle successful login or new registration
  const handleLoginSuccess = (user: UserProfile, isNewUser: boolean) => {
    setCurrentUser(user);
    loadUserData(user.id);
    const updatedAuth = db.getAuth();
    setAuth(updatedAuth);

    if (isNewUser || !user.hasCompletedTutorial) {
      setShowTutorial(true);
    }
  };

  // Tutorial completion
  const handleFinishTutorial = (
    updatedUser: UserProfile,
    newSubjects: Subject[],
    newTimetable: TimetableEntry[]
  ) => {
    setCurrentUser(updatedUser);
    db.setCurrentUser(updatedUser);

    if (newSubjects.length > 0) {
      setSubjects(newSubjects);
      db.saveSubjects(newSubjects, updatedUser.id);
    }
    if (newTimetable.length > 0) {
      setTimetable(newTimetable);
      db.saveTimetable(newTimetable, updatedUser.id);
    }

    setShowTutorial(false);
  };

  const handleSkipTutorial = () => {
    const updated = { ...currentUser, hasCompletedTutorial: true };
    setCurrentUser(updated);
    db.setCurrentUser(updated);
    setShowTutorial(false);
  };

  // Attendance Handlers
  const handleMarkAttendance = (
    subjectId: string, 
    status: 'present' | 'absent' | 'cancelled', 
    timetableEntryId?: string
  ) => {
    const todayStr = formatDateISO(new Date());
    const existingIndex = attendance.findIndex(
      (r) => r.subjectId === subjectId && r.date === todayStr && (timetableEntryId ? r.timetableEntryId === timetableEntryId : true)
    );

    let updated: AttendanceRecord[];

    if (existingIndex >= 0) {
      if (attendance[existingIndex].status === status) {
        // Toggle off / delete mark if clicked again
        updated = attendance.filter((_, idx) => idx !== existingIndex);
      } else {
        // Update status
        updated = attendance.map((r, idx) => 
          idx === existingIndex ? { ...r, status, timestamp: new Date().toISOString() } : r
        );
      }
    } else {
      const newRecord: AttendanceRecord = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: currentUser.id,
        subjectId,
        timetableEntryId,
        date: todayStr,
        status,
        timestamp: new Date().toISOString(),
      };
      updated = [newRecord, ...attendance];
    }

    setAttendance(updated);
    db.saveAttendanceRecords(updated, currentUser.id);
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

  const handleImportConfirmed = (importedEntries: TimetableEntry[], newSubjects: Subject[]) => {
    if (newSubjects.length > 0) {
      const mergedSubjects = [...subjects];
      newSubjects.forEach((ns) => {
        if (!mergedSubjects.some((s) => s.id === ns.id || s.code === ns.code)) {
          mergedSubjects.push(ns);
        }
      });
      setSubjects(mergedSubjects);
      db.saveSubjects(mergedSubjects, currentUser.id);
    }

    const mergedTimetable = [...timetable, ...importedEntries];
    setTimetable(mergedTimetable);
    db.saveTimetable(mergedTimetable, currentUser.id);
    setShowImportModal(false);
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
          status: (isDone ? 'in_progress' : 'completed') as any,
          completionPercent: isDone ? 50 : 100,
          completedAt: isDone ? undefined : new Date().toISOString(),
        };
      }
      return a;
    });
    setAssignments(updated);
    db.saveAssignments(updated, currentUser.id);
  };

  // Subject Handlers with complete delete & cascade cleanup
  const handleSaveSubject = (sub: Subject) => {
    const exists = subjects.some((s) => s.id === sub.id);
    const updated = exists
      ? subjects.map((s) => (s.id === sub.id ? sub : s))
      : [sub, ...subjects];
    setSubjects(updated);
    db.saveSubjects(updated, currentUser.id);
  };

  const handleDeleteSubject = (id: string) => {
    const updatedSubjects = subjects.filter((s) => s.id !== id);
    const updatedTimetable = timetable.filter((t) => t.subjectId !== id);
    const updatedAttendance = attendance.filter((a) => a.subjectId !== id);

    setSubjects(updatedSubjects);
    setTimetable(updatedTimetable);
    setAttendance(updatedAttendance);

    db.saveSubjects(updatedSubjects, currentUser.id);
    db.saveTimetable(updatedTimetable, currentUser.id);
    db.saveAttendanceRecords(updatedAttendance, currentUser.id);
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

  // Reset & Export Handlers
  const handleResetData = () => {
    db.resetAllData(currentUser.id);
    setSubjects([]);
    setTimetable([]);
    setAttendance([]);
    setAssignments([]);
    setHolidays([]);
    setNotifications([]);
  };

  const handleExportJson = () => {
    const jsonStr = db.exportBackupJson(currentUser.id);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oggytrack-${currentUser.name.toLowerCase().replace(/\s+/g, '-')}-${formatDateISO(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // If user is not authenticated, show the professional frontend landing & sign-in page!
  if (!auth.isAuthenticated) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Render Main Dashboard Views
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
            onNavigate={setActivePage}
            onMarkAttendance={handleMarkAttendance}
            onToggleAssignmentComplete={handleToggleAssignmentComplete}
            onOpenAddClassModal={() => setActivePage('timetable')}
            onOpenAddAssignmentModal={() => setActivePage('assignments')}
            onOpenImportModal={() => setShowImportModal(true)}
            onOpenAddSubjectModal={() => setActivePage('subjects')}
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
            onOpenImportModal={() => setShowImportModal(true)}
          />
        );

      case 'attendance':
        return (
          <AttendanceCenter
            user={currentUser}
            subjects={subjects}
            attendance={attendance}
            settings={settings}
            onMarkAttendance={handleMarkAttendance}
            onResetSubjectAttendance={handleResetSubjectAttendance}
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
            onSaveSubject={handleSaveSubject}
            onDeleteSubject={handleDeleteSubject}
          />
        );

      case 'calendar':
        return (
          <UnifiedCalendar
            timetable={timetable}
            assignments={assignments}
            holidays={holidays}
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
            onNavigate={setActivePage}
            onMarkAttendance={handleMarkAttendance}
            onToggleAssignmentComplete={handleToggleAssignmentComplete}
            onOpenAddClassModal={() => setActivePage('timetable')}
            onOpenAddAssignmentModal={() => setActivePage('assignments')}
            onOpenImportModal={() => setShowImportModal(true)}
            onOpenAddSubjectModal={() => setActivePage('subjects')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-slate-950 text-slate-100 font-sans">
      {/* Background ambient radial glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full blur-[130px] opacity-20 bg-purple-600" />
        <div className="absolute top-[40%] -right-[10%] w-[45vw] h-[45vw] rounded-full bg-indigo-900/15 blur-[140px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-cyan-900/10 blur-[130px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col min-h-screen">
        <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
          {/* Desktop Persistent & Mobile Left Drawer Sidebar */}
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

          {/* Main Layout Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Navbar */}
            <Navbar
              user={currentUser}
              settings={settings}
              notifications={notifications}
              activePage={activePage}
              onNavigate={setActivePage}
              onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
              onQuickAddClass={() => setActivePage('timetable')}
              onQuickAddAssignment={() => setActivePage('assignments')}
              onMarkNotificationRead={handleMarkNotifRead}
              onClearAllNotifications={handleClearAllNotifs}
              onSignOut={handleSignOut}
            />

            {/* Scrollable Viewport */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              {renderCurrentPage()}
            </main>
          </div>
        </div>
      </div>

      {/* Global Modals */}
      {showImportModal && (
        <TimetableImporter
          userId={currentUser.id}
          existingTimetable={timetable}
          subjects={subjects}
          onImportConfirmed={handleImportConfirmed}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {/* Interactive Let's Get Started Setup Tutorial */}
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

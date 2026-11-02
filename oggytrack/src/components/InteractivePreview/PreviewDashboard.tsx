import React, { useState } from 'react';
import { DesignConfig, ClassSession, SubjectItem, AssignmentItem } from '../../types/design';
import { MOCK_STUDENT, MOCK_SUBJECTS, MOCK_CLASSES, MOCK_ASSIGNMENTS, MOCK_HOLIDAYS } from '../../utils/mockAcademicData';
import { calculateAttendance, predictAttendance } from '../../utils/academicCalculations';
import { 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  BookOpen, 
  Plus, 
  ArrowRight,
  TrendingUp,
  FileCheck,
  UploadCloud,
  Check,
  X
} from 'lucide-react';

interface PreviewDashboardProps {
  config: DesignConfig;
  onNavigateScreen: (screen: 'timetable' | 'attendance' | 'assignments' | 'calendar') => void;
}

export const PreviewDashboard: React.FC<PreviewDashboardProps> = ({
  config,
  onNavigateScreen,
}) => {
  const [classes, setClasses] = useState<ClassSession[]>(MOCK_CLASSES);
  const [subjects, setSubjects] = useState<SubjectItem[]>(MOCK_SUBJECTS);
  const [assignments, setAssignments] = useState<AssignmentItem[]>(MOCK_ASSIGNMENTS);
  const [quickNotification, setQuickNotification] = useState<string | null>(null);

  // Overall attendance calculation
  const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
  const totalMissed = subjects.reduce((sum, s) => sum + s.missed, 0);
  const overallStats = calculateAttendance(totalAttended, totalMissed, 75);

  const todayClasses = classes.filter((c) => c.day === 'Wednesday');

  const showToast = (msg: string) => {
    setQuickNotification(msg);
    setTimeout(() => setQuickNotification(null), 3000);
  };

  const markAttendanceToday = (classId: string, status: 'attended' | 'missed') => {
    const targetClass = classes.find((c) => c.id === classId);
    if (!targetClass) return;

    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id === targetClass.subjectId) {
          return {
            ...s,
            attended: status === 'attended' ? s.attended + 1 : s.attended,
            missed: status === 'missed' ? s.missed + 1 : s.missed,
          };
        }
        return s;
      })
    );

    showToast(
      status === 'attended'
        ? `Marked Present for ${targetClass.code}!`
        : `Marked Absent for ${targetClass.code}. Attendance recalculated.`
    );
  };

  const toggleAssignmentStatus = (id: string) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const isDone = a.status === 'completed';
          return {
            ...a,
            status: isDone ? 'in_progress' : 'completed',
            completionPercent: isDone ? 50 : 100,
          };
        }
        return a;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {quickNotification && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{quickNotification}</span>
          </div>
          <button onClick={() => setQuickNotification(null)} className="opacity-70 hover:opacity-100 p-0.5" aria-label="Close notification">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Greeting & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Welcome back, {MOCK_STUDENT.name.split(' ')[0]} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Wednesday, October 21, 2026 · {MOCK_STUDENT.degree} ({MOCK_STUDENT.semester})
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateScreen('timetable')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
          >
            <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
            <span>Import Timetable</span>
          </button>
          <button
            onClick={() => onNavigateScreen('attendance')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white shadow-xs transition-opacity hover:opacity-95"
            style={{ backgroundColor: config.accentColor }}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Attendance Center</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Overall Attendance */}
        <div
          onClick={() => onNavigateScreen('attendance')}
          className={`p-4 border cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all bg-white dark:bg-slate-900 ${config.borderRadius} shadow-xs`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Overall Attendance</span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
              Target {MOCK_STUDENT.targetAttendance}%
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
              {overallStats.percentage}%
            </span>
            <span className="text-xs text-slate-400">
              ({overallStats.attended}/{overallStats.conducted} classes)
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${overallStats.percentage}%`,
                backgroundColor: config.accentColor,
              }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Safe to miss 4 classes</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* Metric 2: Today's Classes */}
        <div
          onClick={() => onNavigateScreen('timetable')}
          className={`p-4 border cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all bg-white dark:bg-slate-900 ${config.borderRadius} shadow-xs`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Today's Schedule</span>
            <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
              Wednesday
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {todayClasses.length} Classes
            </span>
            <span className="text-xs text-slate-400">scheduled</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 truncate font-medium">
            Next: CS301 Algorithms (09:30 AM)
          </p>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Hall B · Turing Wing</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* Metric 3: Assignments */}
        <div
          onClick={() => onNavigateScreen('assignments')}
          className={`p-4 border cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all bg-white dark:bg-slate-900 ${config.borderRadius} shadow-xs`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Pending Tasks</span>
            <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded">
              1 Due Today
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {assignments.filter((a) => a.status !== 'completed').length} Tasks
            </span>
            <span className="text-xs text-slate-400">to submit</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 truncate font-medium">
            OS Scheduler Lab (due 23:59)
          </p>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>85% complete</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* Metric 4: Upcoming Holiday */}
        <div
          onClick={() => onNavigateScreen('calendar')}
          className={`p-4 border cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all bg-white dark:bg-slate-900 ${config.borderRadius} shadow-xs`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Next Break</span>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded">
              In 12 Days
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Reading Break
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 truncate">
            Nov 02 - Nov 04 (3 Days)
          </p>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>No lectures scheduled</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Classes + Subject Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Today's Class Timeline (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Today's Classes & Sessions</span>
            </h2>
            <button
              onClick={() => onNavigateScreen('timetable')}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              Full Timetable <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {todayClasses.map((cls, idx) => (
              <div
                key={cls.id}
                className={`p-4 border bg-white dark:bg-slate-900 transition-all ${config.borderRadius} ${
                  idx === 0
                    ? 'border-indigo-400/80 dark:border-indigo-500/60 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-2.5 h-12 rounded-full shrink-0"
                      style={{ backgroundColor: cls.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                          {cls.code}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {cls.type}
                        </span>
                        {idx === 0 && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                            Next Class
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                        {cls.subjectName}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="font-medium tabular-nums">{cls.startTime} - {cls.endTime}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{cls.room}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          <span>{cls.faculty}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => markAttendanceToday(cls.id, 'attended')}
                      className="px-2.5 py-1 text-xs font-medium rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                      title="Mark Present"
                    >
                      Present
                    </button>
                    <button
                      onClick={() => markAttendanceToday(cls.id, 'missed')}
                      className="px-2.5 py-1 text-xs font-medium rounded border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors"
                      title="Mark Absent"
                    >
                      Absent
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Subject Attendance Thresholds & Warnings (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <span>Subject Attendance Health</span>
            </h2>
            <button
              onClick={() => onNavigateScreen('attendance')}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              Predictions <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {subjects.map((sub) => {
              const stats = calculateAttendance(sub.attended, sub.missed, sub.targetAttendance);
              const pred = predictAttendance(sub.attended, sub.missed, sub.targetAttendance);

              return (
                <div
                  key={sub.id}
                  className={`p-3.5 border bg-white dark:bg-slate-900 ${config.borderRadius} ${
                    stats.isBelowTarget
                      ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/10'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: sub.color }}
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {sub.code}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                          {sub.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {stats.percentage}%
                      </span>
                      {stats.isBelowTarget ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/70 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> Low
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                          Safe
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden my-2">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, stats.percentage)}%`,
                        backgroundColor: stats.isBelowTarget ? '#d97706' : sub.color,
                      }}
                    />
                  </div>

                  {/* Plain Language Prediction explanation */}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>{pred.explanation}</span>
                    <span className="text-slate-400 tabular-nums">
                      {sub.attended}/{sub.attended + sub.missed}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Assignment Deadlines Strip */}
      <div className={`p-5 border bg-white dark:bg-slate-900 ${config.borderRadius} border-slate-200 dark:border-slate-800`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-base text-slate-900 dark:text-slate-100">
              Active Assignments & Deliverables
            </h2>
          </div>
          <button
            onClick={() => onNavigateScreen('assignments')}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            View All Tasks ({assignments.length}) <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {assignments.slice(0, 2).map((asg) => (
            <div
              key={asg.id}
              className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <button
                  onClick={() => toggleAssignmentStatus(asg.id)}
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    asg.status === 'completed'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                  }`}
                >
                  {asg.status === 'completed' && <Check className="w-3 h-3" />}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400">
                      {asg.subjectCode}
                    </span>
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                      {asg.priority}
                    </span>
                  </div>
                  <h4 className={`text-xs font-semibold text-slate-900 dark:text-slate-100 mt-1 line-clamp-1 ${
                    asg.status === 'completed' ? 'line-through text-slate-400' : ''
                  }`}>
                    {asg.title}
                  </h4>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Due: {asg.dueDate} · {asg.completionPercent}% complete
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

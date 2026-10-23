import React from 'react';
import { 
  UserProfile, 
  Subject, 
  TimetableEntry, 
  AttendanceRecord, 
  Assignment, 
  Holiday, 
  AppSettings,
  DayOfWeek
} from '../../types/oggytrack';
import { calculateAttendance, predictAttendance } from '../../utils/academicCalculations';
import {
  formatDateISO,
  formatFullDate,
  formatLiveClock,
  formatReadableISO,
  formatTimeHHMM,
  getDayOfWeekFromDate,
  getDaysDifference,
  useLiveClock,
} from '../../utils/dateUtils';
import { 
  Clock, 
  MapPin, 
  User, 
  AlertTriangle, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  FileCheck, 
  UploadCloud, 
  Plus, 
  ArrowRight, 
  Check
} from 'lucide-react';

interface DashboardViewProps {
  user: UserProfile;
  settings: AppSettings;
  subjects: Subject[];
  timetable: TimetableEntry[];
  attendance: AttendanceRecord[];
  assignments: Assignment[];
  holidays: Holiday[];
  onNavigate: (page: string) => void;
  onMarkAttendance: (subjectId: string, status: 'present' | 'absent' | 'cancelled', timetableEntryId?: string) => void;
  onToggleAssignmentComplete: (assignmentId: string) => void;
  onOpenAddClassModal: () => void;
  onOpenAddAssignmentModal: () => void;
  onOpenImportModal: () => void;
  onOpenAddSubjectModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  settings,
  subjects,
  timetable,
  attendance,
  assignments,
  holidays,
  onNavigate,
  onMarkAttendance,
  onToggleAssignmentComplete,
  onOpenAddClassModal,
  onOpenImportModal,
}) => {
  const now = useLiveClock(1000);
  const currentDay: DayOfWeek = getDayOfWeekFromDate(now);
  const currentDateStr = formatDateISO(now);
  const currentTimeHHMM = formatTimeHHMM(now);

  // Overall Attendance calculations
  const totalAttended = attendance.filter((r) => r.status === 'present').length;
  const totalMissed = attendance.filter((r) => r.status === 'absent').length;
  const overallStats = calculateAttendance(totalAttended, totalMissed, user.targetAttendance);
  const overallPrediction = predictAttendance(totalAttended, totalMissed, user.targetAttendance);

  // Today's classes sorted chronologically
  const todayClasses = timetable
    .filter((entry) => entry.day === currentDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Find ongoing or next upcoming class based on live current time
  const nextOrCurrentClass =
    todayClasses.find((cls) => cls.endTime >= currentTimeHHMM) || null;

  // Check today's marked attendance status for each class
  const getTodayClassAttendance = (subjectId: string, timetableEntryId?: string) => {
    return attendance.find(
      (r) =>
        r.subjectId === subjectId &&
        r.date === currentDateStr &&
        (timetableEntryId ? r.timetableEntryId === timetableEntryId : true)
    )?.status;
  };

  // Pending & urgent assignments
  const pendingAssignments = assignments.filter((a) => a.status !== 'completed' && a.status !== 'submitted');
  const dueTodayAssignments = assignments.filter(
    (a) => a.dueDate === currentDateStr && a.status !== 'completed' && a.status !== 'submitted'
  );

  // Next upcoming or currently active holiday (strictly from real user holidays)
  const upcomingHolidays = holidays
    .filter((h) => h.endDate >= currentDateStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const nextHoliday = upcomingHolidays[0] || null;
  const nextHolidayDiff = nextHoliday ? getDaysDifference(currentDateStr, nextHoliday.startDate) : null;
  const nextHolidayBadge = !nextHoliday
    ? 'None Set'
    : currentDateStr >= nextHoliday.startDate && currentDateStr <= nextHoliday.endDate
    ? 'Today'
    : nextHolidayDiff === 1
    ? 'Tomorrow'
    : `In ${nextHolidayDiff} Days`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Welcome & Live Date/Time Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user.name.split(' ')[0]}
            </h1>
            <span className="text-xs font-semibold text-purple-300">
              · {user.semester}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 tabular-nums">
            {formatFullDate(now)} · {formatLiveClock(now, settings.timeFormat, true)} · {user.degree} · {user.institution}
          </p>
        </div>

        {/* Quick Action Ribbon */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-purple-400" />
            <span>Import Timetable</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddClassModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition-all whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Attendance Health */}
        <button
          type="button"
          onClick={() => onNavigate('attendance')}
          className="interactive-card text-left p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 hover:border-purple-500/50 transition-all duration-200 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Total Attendance</span>
            <span className="text-emerald-300 font-semibold tabular-nums">
              Target {user.targetAttendance}%
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-white tracking-tight tabular-nums group-hover:text-purple-300 transition-colors">
              {overallStats.percentage}%
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              ({overallStats.attended}/{overallStats.conducted} sessions)
            </span>
          </div>

          <div className="w-full bg-white/10 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-purple-500 to-indigo-500"
              style={{ width: `${Math.min(100, overallStats.percentage)}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-purple-300/90">
            <span className="truncate">
              {overallStats.conducted === 0
                ? 'No classes recorded yet'
                : overallPrediction.canSafeMiss > 0
                ? `Safe to miss ${overallPrediction.canSafeMiss} classes`
                : overallStats.isBelowTarget
                ? `Attend next ${overallPrediction.mustAttendConsecutive} classes`
                : 'On threshold edge'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-2 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 2: Today's Classes */}
        <button
          type="button"
          onClick={() => onNavigate('timetable')}
          className="interactive-card text-left p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 hover:border-cyan-500/50 transition-all duration-200 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Today's Schedule</span>
            <span className="text-cyan-300 font-semibold">
              {currentDay}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-white tracking-tight tabular-nums group-hover:text-cyan-300 transition-colors">
              {todayClasses.length} {todayClasses.length === 1 ? 'Class' : 'Classes'}
            </span>
            <span className="text-xs text-slate-400">scheduled</span>
          </div>

          <div className="text-xs text-slate-300 mt-2 truncate font-medium tabular-nums">
            {nextOrCurrentClass
              ? `${nextOrCurrentClass.startTime <= currentTimeHHMM ? 'Ongoing' : 'Next'}: ${nextOrCurrentClass.code} · ${nextOrCurrentClass.startTime}`
              : todayClasses.length > 0
              ? 'All sessions finished for today'
              : 'No classes scheduled today'}
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-cyan-300/90">
            <span className="truncate">{nextOrCurrentClass?.room || 'View full timetable'}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-2 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 3: Assignments Overview */}
        <button
          type="button"
          onClick={() => onNavigate('assignments')}
          className="interactive-card text-left p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 hover:border-rose-500/50 transition-all duration-200 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Active Tasks</span>
            <span className={dueTodayAssignments.length > 0 ? 'text-rose-300 font-semibold tabular-nums' : 'text-slate-400'}>
              {dueTodayAssignments.length > 0 ? `${dueTodayAssignments.length} Due Today` : 'Up to date'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-white tracking-tight tabular-nums group-hover:text-rose-300 transition-colors">
              {pendingAssignments.length} Pending
            </span>
          </div>

          <div className="text-xs text-slate-300 mt-2 truncate font-medium">
            {dueTodayAssignments[0]?.title || pendingAssignments[0]?.title || 'No urgent deadlines today'}
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-rose-300/90">
            <span className="tabular-nums">{assignments.length - pendingAssignments.length} completed</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-2 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 4: Upcoming Recess / Break */}
        <button
          type="button"
          onClick={() => onNavigate('holidays')}
          className="interactive-card text-left p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 hover:border-amber-500/50 transition-all duration-200 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Next Campus Break</span>
            <span className="text-amber-300 font-semibold tabular-nums">
              {nextHolidayBadge}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-white tracking-tight truncate group-hover:text-amber-300 transition-colors">
              {nextHoliday ? nextHoliday.title : 'No Breaks Added'}
            </span>
          </div>

          <div className="text-xs text-slate-300 mt-2 truncate font-medium tabular-nums">
            {nextHoliday
              ? nextHoliday.startDate === nextHoliday.endDate
                ? formatReadableISO(nextHoliday.startDate, false)
                : `${nextHoliday.startDate} to ${nextHoliday.endDate}`
              : 'Add upcoming holidays or study breaks'}
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-amber-300/90">
            <span>{nextHoliday ? (nextHoliday.cancelsClasses ? 'Classes suspended' : 'Optional classes') : 'Manage holidays'}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-2 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Main Grid: Today's Classes Timeline (7 Cols) + Subject Health Monitor (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Today's Class Timeline */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-purple-400" />
              <h2 className="font-bold text-base text-white tracking-tight">
                {currentDay}'s Classes & Sessions
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('timetable')}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              Full Schedule <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {todayClasses.map((cls) => {
              const mark = getTodayClassAttendance(cls.subjectId, cls.id);
              const isHighlighted = nextOrCurrentClass?.id === cls.id;
              const isOngoing = cls.startTime <= currentTimeHHMM && cls.endTime >= currentTimeHHMM;

              return (
                <div
                  key={cls.id}
                  className={`p-4 rounded-2xl bg-slate-900/60 backdrop-blur-xl border transition-all ${
                    isHighlighted
                      ? 'border-purple-500/40 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/20'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-2 h-12 rounded-full shrink-0"
                        style={{ backgroundColor: cls.color || '#a855f7' }}
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-white">
                            {cls.code}
                          </span>
                          <span className="text-white/30">·</span>
                          <span className="text-slate-300">
                            {cls.type}
                          </span>
                          {isHighlighted && (
                            <>
                              <span className="text-white/30">·</span>
                              <span className="text-purple-300 font-semibold">
                                {isOngoing ? 'Ongoing Now' : 'Next Session'}
                              </span>
                            </>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-white mt-1">
                          {cls.subjectName}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1 font-mono tabular-nums text-slate-200">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {cls.startTime} - {cls.endTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {cls.room}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {cls.faculty}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Attendance Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => onMarkAttendance(cls.subjectId, 'present', cls.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-150 cursor-pointer ${
                          mark === 'present'
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-950/40'
                            : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300'
                        }`}
                        title="Mark Present for this class"
                      >
                        {mark === 'present' ? 'Present ✓' : 'Present'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onMarkAttendance(cls.subjectId, 'absent', cls.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-150 cursor-pointer ${
                          mark === 'absent'
                            ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-950/40'
                            : 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-300'
                        }`}
                        title="Mark Absent for this class"
                      >
                        {mark === 'absent' ? 'Absent ✗' : 'Absent'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {todayClasses.length === 0 && (
              <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-400 space-y-3">
                <p>No classes scheduled for {currentDay} ({formatReadableISO(currentDateStr, false)}).</p>
                <button
                  type="button"
                  onClick={() => onNavigate('timetable')}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer"
                >
                  Open Weekly Timetable
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Subject Attendance Monitor */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <h2 className="font-bold text-base text-white tracking-tight">
                Subject Attendance Health
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              Simulate <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {subjects.map((sub) => {
              const subRecords = attendance.filter((r) => r.subjectId === sub.id);
              const att = subRecords.filter((r) => r.status === 'present').length;
              const miss = subRecords.filter((r) => r.status === 'absent').length;
              const stats = calculateAttendance(att, miss, sub.targetAttendance);
              const pred = predictAttendance(att, miss, sub.targetAttendance);

              return (
                <button
                  type="button"
                  key={sub.id}
                  onClick={() => onNavigate('attendance')}
                  className={`w-full text-left p-3.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border transition-all cursor-pointer ${
                    stats.isBelowTarget
                      ? 'border-amber-500/50 bg-amber-950/20'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: sub.color }}
                      />
                      <span className="font-mono font-bold text-xs text-white shrink-0">{sub.code}</span>
                      <span className="text-xs text-slate-300 truncate">{sub.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold tabular-nums text-white">
                        {stats.percentage}%
                      </span>
                      {stats.conducted === 0 ? (
                        <span className="text-[11px] font-medium text-slate-400">
                          No Classes
                        </span>
                      ) : stats.isBelowTarget ? (
                        <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3" /> Low
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-300">
                          Safe
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/10 h-1.5 rounded-full my-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, stats.percentage)}%`,
                        backgroundColor: stats.isBelowTarget ? '#f59e0b' : sub.color,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate">{pred.explanation}</span>
                    <span className="tabular-nums text-slate-300 shrink-0 ml-2">
                      {att}/{stats.conducted}
                    </span>
                  </div>
                </button>
              );
            })}

            {subjects.length === 0 && (
              <div className="p-8 text-center rounded-2xl bg-white/5 border border-dashed border-white/10 space-y-3">
                <p className="text-xs text-slate-400">No subjects configured yet.</p>
                <button
                  type="button"
                  onClick={() => onNavigate('subjects')}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Your First Subject</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Urgent Tasks Strip */}
      <div className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-purple-400" />
            <h2 className="font-bold text-base text-white tracking-tight">
              Assignments & Upcoming Deadlines
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('assignments')}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            All Tasks ({assignments.length}) <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {assignments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assignments.slice(0, 2).map((asg) => {
              const isDone = asg.status === 'completed' || asg.status === 'submitted';
              return (
                <div
                  key={asg.id}
                  className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start justify-between gap-3 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleAssignmentComplete(asg.id)}
                      aria-label={`Toggle ${asg.title}`}
                      className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-400 text-white'
                          : 'border-white/30 bg-white/5 hover:border-white/50'
                      }`}
                    >
                      {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-purple-300">{asg.subjectCode}</span>
                        <span className="text-white/30">·</span>
                        <span className="text-rose-300 font-semibold capitalize">
                          {asg.priority}
                        </span>
                      </div>
                      <h4
                        className={`text-xs font-semibold text-white mt-1 truncate ${
                          isDone ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {asg.title}
                      </h4>
                      <div className="text-[11px] text-slate-400 mt-1 tabular-nums">
                        Due: {asg.dueDate} ({asg.dueTime}) · {asg.completionPercent}% complete
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleAssignmentComplete(asg.id)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors shrink-0 cursor-pointer"
                  >
                    {isDone ? 'Undo' : 'Complete'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-white/10 rounded-xl">
            No assignments added yet. Open Assignments to add coursework deadlines.
          </div>
        )}
      </div>
    </div>
  );
};

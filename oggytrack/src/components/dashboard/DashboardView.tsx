import React from 'react';
import {
  UserProfile,
  Subject,
  TimetableEntry,
  AttendanceRecord,
  Assignment,
  Holiday,
  AppSettings,
  DayOfWeek,
  NotebookWorkspaceState,
} from '../../types/oggytrack';
import { calculateAttendance, predictAttendance } from '../../utils/academicCalculations';
import { computeNotebookSummary, getActiveBoard } from '../../utils/notebookKanban';
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
import { StatsCard } from '../common/StatsCard';
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
  Check,
  Palmtree,
  NotebookPen,
} from 'lucide-react';

interface DashboardViewProps {
  user: UserProfile;
  settings: AppSettings;
  subjects: Subject[];
  timetable: TimetableEntry[];
  attendance: AttendanceRecord[];
  assignments: Assignment[];
  holidays: Holiday[];
  notebookWorkspace?: NotebookWorkspaceState;
  onNavigate: (page: string) => void;
  onMarkAttendance: (
    subjectId: string,
    status: 'present' | 'absent' | 'cancelled',
    timetableEntryId?: string
  ) => void;
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
  notebookWorkspace,
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

  const nextOrCurrentClass =
    todayClasses.find((cls) => cls.endTime >= currentTimeHHMM) || null;

  const getTodayClassAttendance = (subjectId: string, timetableEntryId?: string) => {
    return attendance.find(
      (r) =>
        r.subjectId === subjectId &&
        r.date === currentDateStr &&
        (timetableEntryId ? r.timetableEntryId === timetableEntryId : true)
    )?.status;
  };

  // Pending & urgent assignments
  const pendingAssignments = assignments.filter(
    (a) => a.status !== 'completed' && a.status !== 'submitted'
  );
  const completedCount = assignments.length - pendingAssignments.length;
  const completionPct =
    assignments.length > 0 ? Math.round((completedCount / assignments.length) * 100) : 100;

  // Next upcoming or currently active holiday
  const upcomingHolidays = holidays
    .filter((h) => h.endDate >= currentDateStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const nextHoliday = upcomingHolidays[0] || null;
  const nextHolidayDiff = nextHoliday
    ? getDaysDifference(currentDateStr, nextHoliday.startDate)
    : null;
  const nextHolidaySubtext = !nextHoliday
    ? 'Scan or add breaks'
    : currentDateStr >= nextHoliday.startDate && currentDateStr <= nextHoliday.endDate
    ? 'Ongoing today'
    : nextHolidayDiff === 1
    ? 'Starts tomorrow'
    : `In ${nextHolidayDiff} days · ${formatReadableISO(nextHoliday.startDate, false)}`;

  const attendanceChangeText =
    overallStats.conducted === 0
      ? `Target ${user.targetAttendance}%`
      : overallPrediction.canSafeMiss > 0
      ? `+${overallPrediction.canSafeMiss} safe skips · ${overallStats.attended}/${overallStats.conducted}`
      : overallStats.isBelowTarget
      ? `Need ${overallPrediction.mustAttendConsecutive} classes · Target ${user.targetAttendance}%`
      : `Target ${user.targetAttendance}% met`;

  const scheduleChangeText = nextOrCurrentClass
    ? `${nextOrCurrentClass.startTime <= currentTimeHHMM ? 'Ongoing' : 'Next'} · ${nextOrCurrentClass.code} (${nextOrCurrentClass.startTime})`
    : todayClasses.length > 0
    ? `${todayClasses.length} completed today`
    : `${currentDay} · Open timetable`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Welcome & Live Date/Time Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Welcome back, {user.name.split(' ')[0]}
            </h1>
            <span className="text-sm text-accent-400 font-medium">· {user.semester}</span>
          </div>
          <p className="text-sm text-white/60 mt-1 tabular-nums">
            {formatFullDate(now)} · {formatLiveClock(now, settings.timeFormat, true)} ·{' '}
            {user.degree} · {user.institution}
          </p>
        </div>

        {/* Quick Action Ribbon */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('todo')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <NotebookPen className="w-3.5 h-3.5 text-amber-300" />
            <span>To-Do Notebook</span>
          </button>

          <button
            type="button"
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-accent-400" />
            <span>Import File</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddClassModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink shadow-lg shadow-accent-950/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {/* 4 Glass StatsCards matching the uploaded code theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Attendance"
          value={`${overallStats.percentage}%`}
          changeText={attendanceChangeText}
          trend={overallStats.conducted > 0 && overallStats.isBelowTarget ? 'down' : 'up'}
          icon={TrendingUp}
          gradient="from-accent-500 to-accent-secondary"
          onClick={() => onNavigate('attendance')}
        />

        <StatsCard
          title="Today's Schedule"
          value={`${todayClasses.length} ${todayClasses.length === 1 ? 'Class' : 'Classes'}`}
          changeText={scheduleChangeText}
          icon={CalendarIcon}
          gradient="from-sky-500 to-blue-600"
          onClick={() => onNavigate('timetable')}
        />

        <StatsCard
          title="Active Tasks"
          value={`${pendingAssignments.length} Pending`}
          change={completionPct}
          changeText={
            assignments.length > 0
              ? `${completionPct}% completed (${completedCount}/${assignments.length})`
              : '0 urgent deadlines'
          }
          icon={FileCheck}
          gradient="from-teal-500 to-cyan-600"
          onClick={() => onNavigate('assignments')}
        />

        <StatsCard
          title="Next Campus Break"
          value={nextHoliday ? nextHoliday.title : 'None Yet'}
          changeText={nextHolidaySubtext}
          icon={Palmtree}
          gradient="from-amber-500 to-orange-600"
          onClick={() => onNavigate('holidays')}
        />
      </div>

      {/* Main Grid: Today's Classes Timeline (7 Cols) + Subject Health Monitor (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Today's Class Timeline */}
        <section className="lg:col-span-7 glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div>
              <p className="text-sm text-white/60">Daily Schedule</p>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {currentDay}'s Classes & Sessions
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('timetable')}
              className="text-xs font-semibold text-accent-400 hover:text-accent-300 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Full Schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todayClasses.length > 0 ? (
            <div className="divide-y divide-white/[0.08]">
              {todayClasses.map((cls) => {
                const mark = getTodayClassAttendance(cls.subjectId, cls.id);
                const isHighlighted = nextOrCurrentClass?.id === cls.id;
                const isOngoing =
                  cls.startTime <= currentTimeHHMM && cls.endTime >= currentTimeHHMM;

                return (
                  <div
                    key={cls.id}
                    className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                        <span
                          className="font-mono font-bold text-white"
                          style={{ color: cls.color || '#10b981' }}
                        >
                          {cls.code}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{cls.type}</span>
                        {isHighlighted && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-400 font-semibold">
                              {isOngoing ? 'Ongoing Now' : 'Next Session'}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white mt-1">{cls.subjectName}</h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-white/60">
                        <span className="flex items-center gap-1 font-mono tabular-nums text-white/85">
                          <Clock className="w-3.5 h-3.5 text-white/50" />
                          {cls.startTime} - {cls.endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-white/50" />
                          {cls.room}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-white/50" />
                          {cls.faculty}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => onMarkAttendance(cls.subjectId, 'present', cls.id)}
                        aria-pressed={mark === 'present'}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          mark === 'present'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                            : 'bg-emerald-500/12 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                        }`}
                        title="Mark Present for this class"
                      >
                        {mark === 'present' && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span>Present</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onMarkAttendance(cls.subjectId, 'absent', cls.id)}
                        aria-pressed={mark === 'absent'}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          mark === 'absent'
                            ? 'bg-rose-500 text-white border-rose-400 font-bold'
                            : 'bg-rose-500/12 hover:bg-rose-500/20 border-rose-500/30 text-rose-300'
                        }`}
                        title="Mark Absent for this class"
                      >
                        <span>{mark === 'absent' ? 'Marked Absent' : 'Absent'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-white/60">
                No classes scheduled for {currentDay} ({formatReadableISO(currentDateStr, false)}).
              </p>
              <button
                type="button"
                onClick={() => onNavigate('timetable')}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white transition-colors cursor-pointer"
              >
                Open Weekly Timetable
              </button>
            </div>
          )}
        </section>

        {/* Right Column: Subject Attendance Monitor */}
        <section className="lg:col-span-5 glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div>
              <p className="text-sm text-white/60">Eligibility Monitor</p>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Subject Attendance Health
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-xs font-semibold text-accent-400 hover:text-accent-300 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Simulate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {subjects.length > 0 ? (
            <div className="divide-y divide-white/[0.08]">
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
                    className="w-full text-left py-3.5 first:pt-1 last:pb-1 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="font-mono font-bold text-xs shrink-0"
                          style={{ color: sub.color }}
                        >
                          {sub.code}
                        </span>
                        <span className="text-white/30" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-xs text-white/85 font-medium truncate group-hover:text-white">
                          {sub.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold tabular-nums text-white">
                          {stats.percentage}%
                        </span>
                        {stats.conducted === 0 ? (
                          <span className="text-[11px] text-white/50">No logs</span>
                        ) : stats.isBelowTarget ? (
                          <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> Low
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-400">Safe</span>
                        )}
                      </div>
                    </div>

                    <div className="w-full bg-white/[0.08] h-1.5 rounded-full my-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, stats.percentage)}%`,
                          backgroundColor: stats.isBelowTarget ? '#f59e0b' : sub.color,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-white/60">
                      <span className="truncate">{pred.explanation}</span>
                      <span className="tabular-nums text-white/80 shrink-0 ml-2">
                        {att}/{stats.conducted}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-white/60">No subjects configured yet.</p>
              <button
                type="button"
                onClick={() => onNavigate('subjects')}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Your First Subject</span>
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Assignments & Upcoming Deadlines Glass Panel */}
      <section className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div>
            <p className="text-sm text-white/60">Coursework Queue</p>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Assignments & Upcoming Deadlines
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('assignments')}
            className="text-xs font-semibold text-accent-400 hover:text-accent-300 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>All Tasks ({assignments.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {assignments.length > 0 ? (
          <div className="divide-y divide-white/[0.08]">
            {assignments.slice(0, 3).map((asg) => {
              const isDone = asg.status === 'completed' || asg.status === 'submitted';
              return (
                <div
                  key={asg.id}
                  className="py-3.5 first:pt-1 last:pb-1 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleAssignmentComplete(asg.id)}
                      aria-label={`Toggle ${asg.title}`}
                      className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : 'border-white/30 bg-white/[0.04] hover:border-emerald-400'
                      }`}
                    >
                      {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                        <span className="font-mono font-bold text-emerald-400">
                          {asg.subjectCode}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-semibold capitalize ${
                            asg.priority === 'urgent'
                              ? 'text-rose-400'
                              : asg.priority === 'high'
                              ? 'text-amber-400'
                              : 'text-white/70'
                          }`}
                        >
                          {asg.priority} priority
                        </span>
                      </div>
                      <h4
                        className={`text-sm font-semibold text-white mt-0.5 truncate ${
                          isDone ? 'line-through text-white/40' : ''
                        }`}
                      >
                        {asg.title}
                      </h4>
                      <div className="text-xs text-white/60 mt-1 tabular-nums">
                        Due {asg.dueDate} ({asg.dueTime}) · {asg.completionPercent}% complete
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleAssignmentComplete(asg.id)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isDone ? 'Undo' : 'Complete'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-white/60">
            No assignments added yet. Open Assignments to add coursework deadlines.
          </div>
        )}
      </section>

      {/* Notebook Kanban To-Do Preview Strip */}
      {notebookWorkspace && (() => {
        const nbSummary = computeNotebookSummary(notebookWorkspace.data, currentDateStr);
        const activeBoard = getActiveBoard(notebookWorkspace.data);
        const previewNotes = [
          ...activeBoard.columns.doing,
          ...activeBoard.columns.todo,
        ].slice(0, 3);

        return (
          <section className="glass-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <p className="text-sm text-white/60">
                  Notebook Kanban · {activeBoard.name} ({nbSummary.totalBoards} pages)
                </p>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Sticky Notes & Daily To-Do Board
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('todo')}
                className="text-xs font-semibold text-accent-400 hover:text-accent-300 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Open Notebook ({nbSummary.totalOpenCount} open)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {previewNotes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {previewNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => onNavigate('todo')}
                    className="text-left p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <span
                        className={`font-semibold capitalize ${
                          note.priority === 'high'
                            ? 'text-rose-400'
                            : note.priority === 'med'
                            ? 'text-amber-300'
                            : 'text-emerald-400'
                        }`}
                      >
                        {note.priority === 'med' ? 'Medium' : note.priority}
                      </span>
                      {note.subjectCode && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-bold text-accent-400">
                            {note.subjectCode}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-white truncate">
                      {note.title}
                    </div>
                    <div className="text-xs text-white/55 truncate">
                      {note.note || 'Open in Notebook Kanban'}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-white/60">
                All sticky notes on "{activeBoard.name}" are completed. Open To-Do Notebook to jot down new tasks.
              </div>
            )}
          </section>
        );
      })()}
    </div>
  );
};

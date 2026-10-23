import React from 'react';
import { Subject, AttendanceRecord, Assignment, TimetableEntry, UserProfile } from '../../types/oggytrack';
import { calculateAttendance } from '../../utils/academicCalculations';
import { exportAttendanceCSV } from '../../utils/csvExport';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  FileCheck, 
  Download, 
  Sparkles,
  AlertTriangle,
  Award,
  Layers
} from 'lucide-react';

interface AnalyticsViewProps {
  user: UserProfile;
  subjects: Subject[];
  attendance: AttendanceRecord[];
  assignments: Assignment[];
  timetable: TimetableEntry[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  user,
  subjects,
  attendance,
  assignments,
  timetable,
}) => {
  // Overall attendance
  const totalAttended = attendance.filter((r) => r.status === 'present').length;
  const totalMissed = attendance.filter((r) => r.status === 'absent').length;
  const overallStats = calculateAttendance(totalAttended, totalMissed, user.targetAttendance);

  // Assignment statistics
  const completedAssignments = assignments.filter((a) => a.status === 'completed' || a.status === 'submitted').length;
  const assignmentRate = assignments.length > 0 ? Math.round((completedAssignments / assignments.length) * 100) : 0;

  // Calculate total scheduled hours per week
  const calculateDurationHours = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return Math.max(0.5, (eh * 60 + em - (sh * 60 + sm)) / 60);
  };

  const totalWeeklyHours = timetable.reduce((acc, t) => acc + calculateDurationHours(t.startTime, t.endTime), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Academic Analytics & Reports
            </h1>
            <span className="text-xs font-semibold text-purple-300">
              · {user.semester || 'Current Term'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Weekly class distribution, attendance health trends, and assignment performance
          </p>
        </div>

        <button
          onClick={() => exportAttendanceCSV(subjects, attendance)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-purple-400" />
          <span>Export Analytics CSV</span>
        </button>
      </div>

      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Overall Attendance</span>
            <span className="text-emerald-400 font-bold text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20">Target {user.targetAttendance}%</span>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 tabular-nums">
            {overallStats.percentage}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {overallStats.attended} of {overallStats.conducted} classes attended
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Assignment Completion</span>
            <span className="text-purple-300 font-bold text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20">{completedAssignments}/{assignments.length} done</span>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 tabular-nums">
            {assignmentRate}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {assignments.length - completedAssignments} pending submissions
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Weekly Class Load</span>
            <span className="text-cyan-300 font-bold text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20">{timetable.length} sessions</span>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 tabular-nums">
            {totalWeeklyHours.toFixed(1)} hrs
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Scheduled across 5 weekdays
          </div>
        </div>
      </div>

      {/* Subject Attendance Breakdown Chart */}
      <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-white">
            Subject-Wise Attendance Distribution
          </h2>
          <span className="text-xs text-purple-400 font-medium">Target Line: {user.targetAttendance}%</span>
        </div>

        <div className="space-y-3 pt-2">
          {subjects.map((sub) => {
            const subRecs = attendance.filter((r) => r.subjectId === sub.id);
            const a = subRecs.filter((r) => r.status === 'present').length;
            const m = subRecs.filter((r) => r.status === 'absent').length;
            const stats = calculateAttendance(a, m, sub.targetAttendance);

            return (
              <div key={sub.id} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white w-16">{sub.code}</span>
                    <span className="text-slate-300">{sub.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold tabular-nums text-white">{stats.percentage}%</span>
                    <span className="text-slate-500 font-mono text-[11px]">({a}/{a + m})</span>
                  </div>
                </div>

                <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden relative">
                  {/* 75% target indicator mark */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-10"
                    style={{ left: `${sub.targetAttendance}%` }}
                    title={`Target: ${sub.targetAttendance}%`}
                  />
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, stats.percentage)}%`,
                      backgroundColor: stats.isBelowTarget ? '#f59e0b' : sub.color,
                    }}
                  />
                </div>
              </div>
            );
          })}

          {subjects.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-white/10 rounded-xl">
              No subjects added yet. Add subjects in the Subjects directory to track attendance distribution.
            </div>
          )}
        </div>
      </div>

      {/* Weekly Hours Breakdown */}
      <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
        <h2 className="font-bold text-base text-white">
          Weekly Schedule Time Distribution
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d) => {
            const dayClasses = timetable.filter((t) => t.day === d);
            const dayHours = dayClasses.reduce((acc, t) => acc + calculateDurationHours(t.startTime, t.endTime), 0);

            return (
              <div key={d} className="p-4 rounded-xl bg-white/5 border border-white/10 text-center space-y-1">
                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider block">{d}</span>
                <div className="text-xl font-bold text-white tabular-nums">{dayHours.toFixed(1)} hrs</div>
                <div className="text-[10px] text-purple-300 font-mono">{dayClasses.length} classes</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

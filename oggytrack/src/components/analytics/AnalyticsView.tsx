import React from 'react';
import { Subject, AttendanceRecord, Assignment, TimetableEntry, UserProfile } from '../../types/oggytrack';
import { calculateAttendance } from '../../utils/academicCalculations';
import { exportAttendanceCSV } from '../../utils/csvExport';
import { StatsCard } from '../common/StatsCard';
import {
  TrendingUp,
  Clock,
  FileCheck,
  Download,
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
  const totalAttended = attendance.filter((r) => r.status === 'present').length;
  const totalMissed = attendance.filter((r) => r.status === 'absent').length;
  const overallStats = calculateAttendance(totalAttended, totalMissed, user.targetAttendance);

  const completedAssignments = assignments.filter(
    (a) => a.status === 'completed' || a.status === 'submitted'
  ).length;
  const assignmentRate =
    assignments.length > 0 ? Math.round((completedAssignments / assignments.length) * 100) : 0;

  const calculateDurationHours = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return Math.max(0.5, (eh * 60 + em - (sh * 60 + sm)) / 60);
  };

  const totalWeeklyHours = timetable.reduce(
    (acc, t) => acc + calculateDurationHours(t.startTime, t.endTime),
    0
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Academic Analytics & Reports
            </h1>
            <span className="text-sm text-accent-400 font-medium">
              · {user.semester || 'Current Term'}
            </span>
          </div>
          <p className="text-sm text-white/60 mt-1">
            Weekly class distribution, attendance health trends, and coursework completion
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportAttendanceCSV(subjects, attendance)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white transition-colors self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-accent-400" />
          <span>Export Analytics CSV</span>
        </button>
      </div>

      {/* 3 Metric Summary Glass StatsCards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Overall Attendance"
          value={`${overallStats.percentage}%`}
          changeText={`${overallStats.attended}/${overallStats.conducted} attended · Target ${user.targetAttendance}%`}
          trend={overallStats.conducted > 0 && overallStats.isBelowTarget ? 'down' : 'up'}
          icon={TrendingUp}
          gradient="from-accent-500 to-accent-secondary"
        />

        <StatsCard
          title="Assignment Completion"
          value={`${assignmentRate}%`}
          changeText={`${completedAssignments}/${assignments.length} done`}
          icon={FileCheck}
          gradient="from-teal-500 to-cyan-600"
        />

        <StatsCard
          title="Weekly Class Load"
          value={`${totalWeeklyHours.toFixed(1)} hrs`}
          changeText={`${timetable.length} recurring sessions`}
          icon={Clock}
          gradient="from-sky-500 to-blue-600"
        />
      </div>

      {/* Subject Attendance Breakdown Chart */}
      <section className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div>
            <p className="text-sm text-white/60">Course Eligibility</p>
            <h2 className="font-bold text-lg text-white">
              Subject-Wise Attendance Distribution
            </h2>
          </div>
          <span className="text-xs text-accent-400 font-semibold tabular-nums">
            Target Line: {user.targetAttendance}%
          </span>
        </div>

        <div className="space-y-4 pt-1">
          {subjects.map((sub) => {
            const subRecs = attendance.filter((r) => r.subjectId === sub.id);
            const a = subRecs.filter((r) => r.status === 'present').length;
            const m = subRecs.filter((r) => r.status === 'absent').length;
            const stats = calculateAttendance(a, m, sub.targetAttendance);

            return (
              <div key={sub.id} className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="font-mono font-bold shrink-0"
                      style={{ color: sub.color }}
                    >
                      {sub.code}
                    </span>
                    <span className="text-white/30" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-white/85 truncate">{sub.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold tabular-nums text-white">
                      {stats.percentage}%
                    </span>
                    <span className="text-white/50 font-mono tabular-nums text-[11px]">
                      ({a}/{a + m})
                    </span>
                  </div>
                </div>

                <div className="w-full bg-white/[0.08] h-2.5 rounded-full overflow-hidden relative">
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-10"
                    style={{ left: `${sub.targetAttendance}%` }}
                    title={`Target: ${sub.targetAttendance}%`}
                  />
                  <div
                    className="h-full rounded-full transition-all duration-500"
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
            <div className="py-8 text-center text-sm text-white/60">
              No subjects added yet. Add subjects in the Subjects directory to track attendance distribution.
            </div>
          )}
        </div>
      </section>

      {/* Weekly Hours Breakdown */}
      <section className="glass-card p-6 rounded-2xl space-y-4">
        <div className="pb-3 border-b border-white/[0.08]">
          <p className="text-sm text-white/60">Schedule Load</p>
          <h2 className="font-bold text-lg text-white">Weekly Schedule Time Distribution</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d) => {
            const dayClasses = timetable.filter((t) => t.day === d);
            const dayHours = dayClasses.reduce(
              (acc, t) => acc + calculateDurationHours(t.startTime, t.endTime),
              0
            );

            return (
              <div
                key={d}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-center space-y-1"
              >
                <span className="text-white/60 font-medium text-xs block">{d}</span>
                <div className="text-xl font-bold text-white tabular-nums">
                  {dayHours.toFixed(1)} hrs
                </div>
                <div className="text-xs text-accent-400 font-mono tabular-nums">
                  {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

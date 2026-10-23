import React, { useState } from 'react';
import { Subject, AttendanceRecord, AppSettings, UserProfile } from '../../types/oggytrack';
import { calculateAttendance, predictAttendance, projectAttendance } from '../../utils/academicCalculations';
import { exportAttendanceCSV } from '../../utils/csvExport';
import { 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Calculator, 
  Download, 
  RotateCcw, 
  Filter, 
  Sparkles,
  Sliders,
  Calendar,
  Check
} from 'lucide-react';

interface AttendanceCenterProps {
  user: UserProfile;
  subjects: Subject[];
  attendance: AttendanceRecord[];
  settings: AppSettings;
  onMarkAttendance: (subjectId: string, status: 'present' | 'absent' | 'cancelled') => void;
  onResetSubjectAttendance: (subjectId: string) => void;
}

export const AttendanceCenter: React.FC<AttendanceCenterProps> = ({
  user,
  subjects,
  attendance,
  settings,
  onMarkAttendance,
  onResetSubjectAttendance,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[2]?.id || subjects[0]?.id || '');
  const [simFutureAttend, setSimFutureAttend] = useState<number>(3);
  const [simFutureMiss, setSimFutureMiss] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'warning' | 'safe'>('all');

  // Overall statistics
  const totalAttended = attendance.filter((r) => r.status === 'present').length;
  const totalMissed = attendance.filter((r) => r.status === 'absent').length;
  const overallStats = calculateAttendance(totalAttended, totalMissed, user.targetAttendance);

  const selectedSub = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const selectedRecords = selectedSub ? attendance.filter((r) => r.subjectId === selectedSub.id) : [];
  const selectedAttended = selectedRecords.filter((r) => r.status === 'present').length;
  const selectedMissed = selectedRecords.filter((r) => r.status === 'absent').length;
  const selectedStats = selectedSub ? calculateAttendance(selectedAttended, selectedMissed, selectedSub.targetAttendance) : overallStats;
  const selectedPred = selectedSub ? predictAttendance(selectedAttended, selectedMissed, selectedSub.targetAttendance) : { canSafeMiss: 0, mustAttendConsecutive: 0, isTargetReachable: true, explanation: '' };

  const projectedValue = projectAttendance(
    selectedAttended,
    selectedMissed,
    simFutureAttend,
    simFutureMiss
  );

  const filteredSubjects = subjects.filter((s) => {
    const sRecords = attendance.filter((r) => r.subjectId === s.id);
    const att = sRecords.filter((r) => r.status === 'present').length;
    const mis = sRecords.filter((r) => r.status === 'absent').length;
    const stats = calculateAttendance(att, mis, s.targetAttendance);

    if (activeFilter === 'warning') return stats.isBelowTarget;
    if (activeFilter === 'safe') return stats.conducted > 0 && !stats.isBelowTarget;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Attendance & Eligibility Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Subject-wise attendance, safe bunk predictions, and future projection simulator
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportAttendanceCSV(subjects, attendance)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>Download CSV Report</span>
          </button>
        </div>
      </div>

      {/* Top Banner KPI Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          {/* Main Percentage Ring */}
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-6">
            <span className="text-xs text-slate-400 font-medium">Total Academic Attendance</span>
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="text-4xl font-extrabold text-white tracking-tight tabular-nums bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
                {overallStats.percentage}%
              </span>
              <span
                className={`text-xs font-semibold ${
                  overallStats.conducted === 0
                    ? 'text-slate-400'
                    : overallStats.isBelowTarget
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}
              >
                {overallStats.conducted === 0
                  ? 'No Classes Yet'
                  : overallStats.isBelowTarget
                  ? 'Below Target'
                  : 'Eligible'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
              {overallStats.attended} attended · {overallStats.missed} missed · {overallStats.conducted} total
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-slate-400 text-[11px]">Conducted Classes</span>
              <div className="text-xl font-bold text-white tabular-nums mt-0.5">
                {overallStats.conducted}
              </div>
              <div className="text-[10px] text-slate-400">Excludes cancelled sessions</div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-emerald-300 text-[11px]">Attended Sessions</span>
              <div className="text-xl font-bold text-emerald-400 tabular-nums mt-0.5">
                {overallStats.attended}
              </div>
              <div className="text-[10px] text-emerald-300/70">Marked present</div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-amber-300 text-[11px]">Subjects Below Target</span>
              <div className="text-xl font-bold text-amber-400 tabular-nums mt-0.5">
                {subjects.filter((s) => {
                  const sRec = attendance.filter((r) => r.subjectId === s.id);
                  const a = sRec.filter((r) => r.status === 'present').length;
                  const m = sRec.filter((r) => r.status === 'absent').length;
                  return calculateAttendance(a, m, s.targetAttendance).isBelowTarget;
                }).length} Warnings
              </div>
              <div className="text-[10px] text-amber-300/70">Action required</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Subject List (7 Cols) & Simulator (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Subject Attendance Cards */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white">Subject Breakdown</span>
              <span className="text-xs text-slate-400">({filteredSubjects.length} subjects)</span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
              {[
                { id: 'all', label: 'All' },
                { id: 'warning', label: 'Below Target' },
                { id: 'safe', label: 'Safe' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id as any)}
                  className={`px-3 py-1 font-semibold rounded-lg transition-colors ${
                    activeFilter === f.id
                      ? 'bg-purple-600/80 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredSubjects.map((sub) => {
              const subRecords = attendance.filter((r) => r.subjectId === sub.id);
              const att = subRecords.filter((r) => r.status === 'present').length;
              const miss = subRecords.filter((r) => r.status === 'absent').length;
              const canc = subRecords.filter((r) => r.status === 'cancelled').length;
              const stats = calculateAttendance(att, miss, sub.targetAttendance);
              const pred = predictAttendance(att, miss, sub.targetAttendance);
              const isSelected = sub.id === selectedSubjectId;

              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`interactive-card p-4 rounded-2xl bg-slate-900/60 backdrop-blur-xl border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
                    isSelected
                      ? 'border-purple-500 shadow-xl shadow-purple-950/50 ring-1 ring-purple-500/40'
                      : 'border-white/10 hover:border-white/20 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-2.5 h-12 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: sub.color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-white">{sub.code}</span>
                          <span className="text-white/30">·</span>
                          <span className="text-xs font-semibold text-slate-200">{sub.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {att} Attended · {miss} Missed · {canc} Cancelled (excluded from calculation)
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className="text-xl font-bold tabular-nums"
                        style={{ color: stats.isBelowTarget ? '#f59e0b' : sub.color }}
                      >
                        {stats.percentage}%
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        stats.isBelowTarget
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        Target: {sub.targetAttendance}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/10 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, stats.percentage)}%`,
                        backgroundColor: stats.isBelowTarget ? '#f59e0b' : sub.color,
                      }}
                    />
                  </div>

                  {/* Prediction Explanation & Live Adjust Buttons */}
                  <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-purple-300 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{pred.explanation}</span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onMarkAttendance(sub.id, 'present')}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transform hover:scale-105 active:scale-90 transition-all duration-150 shadow-xs"
                      >
                        + Present
                      </button>
                      <button
                        onClick={() => onMarkAttendance(sub.id, 'absent')}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 transform hover:scale-105 active:scale-90 transition-all duration-150 shadow-xs"
                      >
                        + Absent
                      </button>
                      <button
                        onClick={() => onResetSubjectAttendance(sub.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transform hover:rotate-180 active:scale-90 transition-all duration-300"
                        title="Reset this subject's records to seed"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredSubjects.length === 0 && (
              <div className="p-8 text-center rounded-2xl bg-white/5 border border-dashed border-white/10 text-xs text-slate-400">
                {subjects.length === 0
                  ? 'No subjects added yet. Add courses in the Subjects directory to begin recording attendance.'
                  : 'No subjects match the selected attendance filter.'}
              </div>
            )}
          </div>
        </div>

        {/* Right: Future Attendance Simulator */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl sticky top-20 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-white">
                  Future Attendance Simulator
                </h3>
              </div>
              <span className="font-mono font-bold text-xs text-purple-300 px-2 py-0.5 rounded bg-purple-500/20">
                {selectedSub?.code || 'Overall'}
              </span>
            </div>

            <div>
              <div className="text-xs font-semibold text-white">
                Selected Subject: {selectedSub?.name || 'All Courses'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Current: <strong className="text-white tabular-nums">{selectedStats.percentage}%</strong> ({selectedAttended}/{selectedStats.conducted} classes)
              </div>
            </div>

            {/* Slider 1: Future Classes to Attend */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">If I attend next classes:</span>
                <span className="font-mono font-bold text-emerald-400">{simFutureAttend} classes</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                value={simFutureAttend}
                onChange={(e) => setSimFutureAttend(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Slider 2: Future Classes to Miss */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">If I miss next classes:</span>
                <span className="font-mono font-bold text-rose-400">{simFutureMiss} classes</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={simFutureMiss}
                onChange={(e) => setSimFutureMiss(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            {/* Projected Output Card */}
            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 text-center">
              <div className="text-xs text-purple-300 font-medium">
                Projected New Attendance Percentage
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight tabular-nums my-1">
                {projectedValue}%
              </div>
              <div className="text-xs font-medium">
                {projectedValue >= (selectedSub?.targetAttendance || 75) ? (
                  <span className="text-emerald-400 flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Safe & Above Target ({selectedSub?.targetAttendance || 75}%)
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Below Target Threshold ({selectedSub?.targetAttendance || 75}%)
                  </span>
                )}
              </div>
            </div>

            <div className="text-[11px] text-slate-400 p-3 rounded-xl bg-white/5 border border-white/10 leading-relaxed">
              Formula: ({selectedAttended} + {simFutureAttend}) / ({selectedStats.conducted} + {simFutureAttend + simFutureMiss}) × 100
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

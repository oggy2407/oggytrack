import React, { useState } from 'react';
import { DesignConfig, SubjectItem } from '../../types/design';
import { MOCK_SUBJECTS } from '../../utils/mockAcademicData';
import { calculateAttendance, predictAttendance, projectAttendance } from '../../utils/academicCalculations';
import { 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  Sparkles, 
  Calculator, 
  Plus, 
  RotateCcw,
  Sliders
} from 'lucide-react';

interface PreviewAttendanceProps {
  config: DesignConfig;
}

export const PreviewAttendance: React.FC<PreviewAttendanceProps> = ({ config }) => {
  const [subjects, setSubjects] = useState<SubjectItem[]>(MOCK_SUBJECTS);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(MOCK_SUBJECTS[2].id); // CS310 which is below threshold
  const [futureAttend, setFutureAttend] = useState<number>(3);
  const [futureMiss, setFutureMiss] = useState<number>(0);

  // Overall attendance calculations
  const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
  const totalMissed = subjects.reduce((sum, s) => sum + s.missed, 0);
  const overallStats = calculateAttendance(totalAttended, totalMissed, 75);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const selectedStats = calculateAttendance(selectedSubject.attended, selectedSubject.missed, selectedSubject.targetAttendance);
  const selectedPred = predictAttendance(selectedSubject.attended, selectedSubject.missed, selectedSubject.targetAttendance);
  const projectedValue = projectAttendance(
    selectedSubject.attended,
    selectedSubject.missed,
    futureAttend,
    futureMiss
  );

  const markQuick = (subjectId: string, type: 'present' | 'absent') => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id === subjectId) {
          return {
            ...s,
            attended: type === 'present' ? s.attended + 1 : s.attended,
            missed: type === 'absent' ? s.missed + 1 : s.missed,
          };
        }
        return s;
      })
    );
  };

  const resetSubject = (subjectId: string) => {
    const original = MOCK_SUBJECTS.find((s) => s.id === subjectId);
    if (!original) return;
    setSubjects((prev) => prev.map((s) => (s.id === subjectId ? { ...original } : s)));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Attendance & Eligibility Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time percentage tracking, safe bunk calculator & consecutive recovery forecasts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
            Target Threshold: <strong className="text-slate-900 dark:text-slate-100">75%</strong>
          </div>
        </div>
      </div>

      {/* Top Banner KPI Card */}
      <div className={`p-4 sm:p-5 border bg-white dark:bg-slate-900 ${config.borderRadius} border-slate-200 dark:border-slate-800 shadow-xs`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 items-center">
          {/* Overall Percentage */}
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pb-3 md:pb-0 md:pr-4">
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Academic Attendance</span>
            <div className="flex flex-wrap items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold tracking-tight tabular-nums" style={{ color: config.accentColor }}>
                {overallStats.percentage}%
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                Eligible for Exams
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {overallStats.attended} attended · {overallStats.missed} missed · {overallStats.conducted} conducted
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">Classes Conducted</span>
              <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                {overallStats.conducted}
              </div>
              <div className="text-[10px] text-slate-400">Across 5 subjects</div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400">Attended Classes</span>
              <div className="text-lg font-bold tabular-nums text-emerald-800 dark:text-emerald-300 mt-0.5">
                {overallStats.attended}
              </div>
              <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Marked present</div>
            </div>

            <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
              <span className="text-[11px] text-amber-700 dark:text-amber-400">Subject Below Target</span>
              <div className="text-lg font-bold text-amber-800 dark:text-amber-300 mt-0.5">
                1 Warning
              </div>
              <div className="text-[10px] text-amber-600/70 dark:text-amber-400/70">CS310 (72.2%)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Subject Cards & Prediction Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Subject List (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base text-slate-900 dark:text-slate-100">
              Subject Attendance Details
            </h2>
            <span className="text-xs text-slate-400">Click a subject to run simulation</span>
          </div>

          <div className="space-y-3">
            {subjects.map((sub) => {
              const stats = calculateAttendance(sub.attended, sub.missed, sub.targetAttendance);
              const pred = predictAttendance(sub.attended, sub.missed, sub.targetAttendance);
              const isSelected = sub.id === selectedSubjectId;

              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`p-4 border transition-all cursor-pointer bg-white dark:bg-slate-900 ${config.borderRadius} ${
                    isSelected
                      ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-2.5 h-12 rounded-full shrink-0"
                        style={{ backgroundColor: sub.color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs">{sub.code}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {sub.name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {sub.attended} Attended / {sub.attended + sub.missed} Conducted ({sub.cancelled} Cancelled excluded)
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold tabular-nums" style={{ color: stats.isBelowTarget ? '#d97706' : sub.color }}>
                        {stats.percentage}%
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        stats.isBelowTarget
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {stats.isBelowTarget ? 'Below Target' : 'On Track'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, stats.percentage)}%`,
                        backgroundColor: stats.isBelowTarget ? '#d97706' : sub.color,
                      }}
                    />
                  </div>

                  {/* Prediction strip & Quick Actions */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-medium">{pred.explanation}</span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => markQuick(sub.id, 'present')}
                        className="px-2 py-1 text-[11px] font-medium rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 hover:bg-emerald-100"
                      >
                        + Present
                      </button>
                      <button
                        onClick={() => markQuick(sub.id, 'absent')}
                        className="px-2 py-1 text-[11px] font-medium rounded border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 hover:bg-rose-100"
                      >
                        + Absent
                      </button>
                      <button
                        onClick={() => resetSubject(sub.id)}
                        className="p-1 text-slate-400 hover:text-slate-600"
                        title="Reset"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Predictive Simulator (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`p-5 border bg-white dark:bg-slate-900 ${config.borderRadius} border-slate-200 dark:border-slate-800 shadow-xs sticky top-4`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Future Attendance Simulator
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                {selectedSubject.code}
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Selected: {selectedSubject.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Current: <strong className="tabular-nums">{selectedStats.percentage}%</strong> ({selectedStats.attended}/{selectedStats.conducted} classes)
                </div>
              </div>

              {/* Slider 1: Future Classes to Attend */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">If I attend next classes:</span>
                  <span className="font-bold font-mono text-emerald-600">{futureAttend} classes</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={futureAttend}
                  onChange={(e) => setFutureAttend(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Slider 2: Future Classes to Miss */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">If I miss next classes:</span>
                  <span className="font-bold font-mono text-rose-600">{futureMiss} classes</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={futureMiss}
                  onChange={(e) => setFutureMiss(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>

              {/* Projected Result Box */}
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/30 text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Projected Attendance Percentage
                </div>
                <div className="text-3xl font-extrabold tabular-nums my-1" style={{ color: config.accentColor }}>
                  {projectedValue}%
                </div>
                <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {projectedValue >= selectedSubject.targetAttendance ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ✓ Above target ({selectedSubject.targetAttendance}%)
                    </span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400">
                      ⚠️ Still below target ({selectedSubject.targetAttendance}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Explanation formula */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 p-2.5 rounded bg-slate-50 dark:bg-slate-800/40">
                Formula: ({selectedSubject.attended} + {futureAttend}) / ({selectedStats.conducted} + {futureAttend + futureMiss}) × 100
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

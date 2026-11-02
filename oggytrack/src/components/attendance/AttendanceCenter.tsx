import React, { useState, useEffect } from 'react';
import {
  AppSettings,
  AttendanceRecord,
  Holiday,
  Subject,
  TimetableEntry,
  UserProfile,
} from '../../types/oggytrack';
import {
  calculateAttendance,
  predictAttendance,
  projectAttendance,
} from '../../utils/academicCalculations';
import {
  addDaysISO,
  formatDateISO,
  formatReadableISO,
  getDayOfWeekFromISO,
} from '../../utils/dateUtils';
import { exportAttendanceCSV } from '../../utils/csvExport';
import { ModalShell } from '../common/ModalShell';
import { StatsCard } from '../common/StatsCard';
import {
  AlertTriangle,
  Calculator,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  History,
  Plus,
  RotateCcw,
  Trash2,
  UploadCloud,
} from 'lucide-react';

interface AttendanceCenterProps {
  user: UserProfile;
  subjects: Subject[];
  timetable: TimetableEntry[];
  holidays: Holiday[];
  attendance: AttendanceRecord[];
  settings: AppSettings;
  onMarkDateAttendance: (
    subjectId: string,
    status: 'present' | 'absent' | 'cancelled',
    dateISO: string,
    timetableEntryId?: string
  ) => void;
  onAppendAttendance: (
    subjectId: string,
    status: 'present' | 'absent' | 'cancelled',
    dateISO: string,
    note?: string
  ) => void;
  onUpdateAttendanceRecord: (
    recordId: string,
    status: 'present' | 'absent' | 'cancelled'
  ) => void;
  onDeleteAttendanceRecord: (recordId: string) => void;
  onBackfillAttendance: (
    entries: Array<{
      subjectId: string;
      attended: number;
      missed: number;
      cancelled: number;
    }>,
    mode: 'replace' | 'append',
    endDateISO: string
  ) => void;
  onResetSubjectAttendance: (subjectId: string) => void;
  onOpenImportModal: () => void;
}

export const AttendanceCenter: React.FC<AttendanceCenterProps> = ({
  user,
  subjects,
  timetable,
  holidays,
  attendance,
  onMarkDateAttendance,
  onAppendAttendance,
  onUpdateAttendanceRecord,
  onDeleteAttendanceRecord,
  onBackfillAttendance,
  onResetSubjectAttendance,
  onOpenImportModal,
}) => {
  const todayISO = formatDateISO(new Date());
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [selectedLogDate, setSelectedLogDate] = useState<string>(todayISO);
  const [extraSessionSubjectId, setExtraSessionSubjectId] = useState<string>(subjects[0]?.id || '');
  const [simFutureAttend, setSimFutureAttend] = useState<number>(3);
  const [simFutureMiss, setSimFutureMiss] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'warning' | 'safe'>('all');

  // Past Totals Backfill Modal State
  const [showBackfillModal, setShowBackfillModal] = useState<boolean>(false);
  const [backfillMode, setBackfillMode] = useState<'replace' | 'append'>('replace');
  const [backfillEndDate, setBackfillEndDate] = useState<string>(() => addDaysISO(todayISO, -1));
  const [backfillDraft, setBackfillDraft] = useState<
    Record<string, { attended: number; missed: number; cancelled: number }>
  >({});

  useEffect(() => {
    if (!selectedSubjectId && subjects[0]) {
      setSelectedSubjectId(subjects[0].id);
    }
    if (!extraSessionSubjectId && subjects[0]) {
      setExtraSessionSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId, extraSessionSubjectId]);

  const openBackfillModal = (focusSubjectId?: string) => {
    const initial: Record<string, { attended: number; missed: number; cancelled: number }> = {};
    subjects.forEach((s) => {
      if (focusSubjectId && s.id !== focusSubjectId) {
        initial[s.id] = { attended: 0, missed: 0, cancelled: 0 };
        return;
      }
      const recs = attendance.filter((r) => r.subjectId === s.id);
      initial[s.id] = {
        attended: recs.filter((r) => r.status === 'present').length,
        missed: recs.filter((r) => r.status === 'absent').length,
        cancelled: recs.filter((r) => r.status === 'cancelled').length,
      };
    });
    setBackfillMode(focusSubjectId ? 'replace' : 'replace');
    setBackfillDraft(initial);
    setShowBackfillModal(true);
  };

  const handleSaveBackfill = (e: React.FormEvent) => {
    e.preventDefault();
    const list = Object.entries(backfillDraft)
      .map(([subjectId, counts]) => ({
        subjectId,
        attended: Math.max(0, Number(counts.attended) || 0),
        missed: Math.max(0, Number(counts.missed) || 0),
        cancelled: Math.max(0, Number(counts.cancelled) || 0),
      }))
      .filter((item) => item.attended + item.missed + item.cancelled > 0 || backfillMode === 'replace');

    onBackfillAttendance(list, backfillMode, backfillEndDate || todayISO);
    setShowBackfillModal(false);
  };

  // Overall statistics
  const totalAttended = attendance.filter((r) => r.status === 'present').length;
  const totalMissed = attendance.filter((r) => r.status === 'absent').length;
  const overallStats = calculateAttendance(totalAttended, totalMissed, user.targetAttendance);

  const selectedSub = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const selectedRecords = selectedSub
    ? attendance
        .filter((r) => r.subjectId === selectedSub.id)
        .sort((a, b) => b.date.localeCompare(a.date) || b.timestamp.localeCompare(a.timestamp))
    : [];
  const selectedAttended = selectedRecords.filter((r) => r.status === 'present').length;
  const selectedMissed = selectedRecords.filter((r) => r.status === 'absent').length;
  const selectedStats = selectedSub
    ? calculateAttendance(selectedAttended, selectedMissed, selectedSub.targetAttendance)
    : overallStats;

  const projectedValue = projectAttendance(
    selectedAttended,
    selectedMissed,
    simFutureAttend,
    simFutureMiss
  );

  // Selected Date Schedule & Records
  const selectedLogWeekday = getDayOfWeekFromISO(selectedLogDate);
  const dateClasses = timetable
    .filter((t) => t.day === selectedLogWeekday)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const holidayOnSelectedDate = holidays.find(
    (h) => selectedLogDate >= h.startDate && selectedLogDate <= h.endDate
  );

  const getSlotStatusForDate = (subjectId: string, timetableEntryId: string) => {
    return attendance.find(
      (r) =>
        r.date === selectedLogDate &&
        r.subjectId === subjectId &&
        r.timetableEntryId === timetableEntryId
    )?.status;
  };

  const handleMarkAllDateClassesPresent = () => {
    dateClasses.forEach((cls) => {
      const current = getSlotStatusForDate(cls.subjectId, cls.id);
      if (current !== 'present') {
        onMarkDateAttendance(cls.subjectId, 'present', selectedLogDate, cls.id);
      }
    });
  };

  const filteredSubjects = subjects.filter((s) => {
    const sRecords = attendance.filter((r) => r.subjectId === s.id);
    const att = sRecords.filter((r) => r.status === 'present').length;
    const mis = sRecords.filter((r) => r.status === 'absent').length;
    const stats = calculateAttendance(att, mis, s.targetAttendance);

    if (activeFilter === 'warning') return stats.isBelowTarget;
    if (activeFilter === 'safe') return stats.conducted > 0 && !stats.isBelowTarget;
    return true;
  });

  const warningSubjectsCount = subjects.filter((s) => {
    const sRec = attendance.filter((r) => r.subjectId === s.id);
    const a = sRec.filter((r) => r.status === 'present').length;
    const m = sRec.filter((r) => r.status === 'absent').length;
    return calculateAttendance(a, m, s.targetAttendance).isBelowTarget;
  }).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Attendance & Eligibility Center
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Record today or past dates, backfill semester totals, and simulate safe skips
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-accent-400" />
            <span>Import File</span>
          </button>

          <button
            type="button"
            onClick={() => openBackfillModal()}
            disabled={subjects.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink shadow-lg shadow-accent-950/35 transition-colors disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>Backfill Past Totals</span>
          </button>

          <button
            type="button"
            onClick={() => exportAttendanceCSV(subjects, attendance)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-accent-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top 4 StatsCard KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Attendance"
          value={`${overallStats.percentage}%`}
          changeText={
            overallStats.conducted === 0
              ? 'No logs yet'
              : overallStats.isBelowTarget
              ? `Below ${user.targetAttendance}% target`
              : `Target ${user.targetAttendance}% met`
          }
          trend={overallStats.isBelowTarget ? 'down' : 'up'}
          icon={ClipboardCheck}
          gradient="from-emerald-500 to-teal-600"
        />
        <StatsCard
          title="Conducted Classes"
          value={overallStats.conducted}
          changeText="Excludes cancelled"
          trend="up"
          icon={Calendar}
          gradient="from-sky-500 to-blue-600"
        />
        <StatsCard
          title="Attended Sessions"
          value={overallStats.attended}
          changeText={`${overallStats.missed} missed overall`}
          trend="up"
          icon={Check}
          gradient="from-teal-500 to-cyan-600"
        />
        <StatsCard
          title="Courses Below Target"
          value={warningSubjectsCount}
          changeText={warningSubjectsCount === 0 ? 'All courses eligible' : 'Needs recovery sessions'}
          trend={warningSubjectsCount > 0 ? 'down' : 'up'}
          icon={AlertTriangle}
          gradient={
            warningSubjectsCount > 0
              ? 'from-amber-500 to-orange-600'
              : 'from-emerald-500 to-teal-600'
          }
        />
      </div>

      {/* Record Attendance by Any Date (Past or Today) */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="w-4 h-4 text-accent-400 shrink-0" />
              <h2 className="font-bold text-base text-white">
                Record Attendance by Date (Past or Today)
              </h2>
              {selectedLogDate < todayISO && (
                <span className="text-xs font-medium text-accent-400">
                  · Past date
                </span>
              )}
            </div>
            <p className="text-xs text-white/60 mt-0.5">
              Pick any past date to mark scheduled classes or log extra sessions for {formatReadableISO(selectedLogDate)}
            </p>
          </div>

          {/* Date Picker Controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedLogDate(addDaysISO(selectedLogDate, -1))}
              aria-label="Previous day"
              className="p-2 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="date"
              aria-label="Attendance log date"
              value={selectedLogDate}
              onChange={(e) => e.target.value && setSelectedLogDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono tabular-nums rounded-xl glass-input"
            />

            <button
              type="button"
              onClick={() => setSelectedLogDate(addDaysISO(selectedLogDate, 1))}
              aria-label="Next day"
              className="p-2 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {selectedLogDate !== todayISO && (
              <button
                type="button"
                onClick={() => setSelectedLogDate(todayISO)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-accent-500/40 bg-accent-500/15 hover:bg-accent-500/25 text-accent-300 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {holidayOnSelectedDate && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between">
            <span>
              Holiday on {formatReadableISO(selectedLogDate, false)}: <strong>{holidayOnSelectedDate.title}</strong>
              {holidayOnSelectedDate.cancelsClasses ? ' (Scheduled classes suspended)' : ''}
            </span>
          </div>
        )}

        {/* Scheduled Classes on Selected Date */}
        {dateClasses.length > 0 ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/80 font-semibold">
                {selectedLogWeekday} Classes ({dateClasses.length})
              </span>
              <button
                type="button"
                onClick={handleMarkAllDateClassesPresent}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                Mark All Present for {formatReadableISO(selectedLogDate, false)}
              </button>
            </div>

            <div className="divide-y divide-white/[0.08]">
              {dateClasses.map((cls) => {
                const status = getSlotStatusForDate(cls.subjectId, cls.id);
                return (
                  <div
                    key={cls.id}
                    className="py-3 first:pt-1 last:pb-1 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono font-bold"
                          style={{ color: cls.color || '#34d399' }}
                        >
                          {cls.code}
                        </span>
                        <span className="text-white/30" aria-hidden="true">·</span>
                        <span className="text-white/90 font-medium truncate">{cls.subjectName}</span>
                      </div>
                      <div className="text-[11px] text-white/60 font-mono tabular-nums mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-white/40" />
                        <span>
                          {cls.startTime} - {cls.endTime} · {cls.room}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onMarkDateAttendance(cls.subjectId, 'present', selectedLogDate, cls.id)
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          status === 'present'
                            ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                        }`}
                      >
                        {status === 'present' && <Check className="w-3 h-3 shrink-0" />}
                        <span>Present</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onMarkDateAttendance(cls.subjectId, 'absent', selectedLogDate, cls.id)
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          status === 'absent'
                            ? 'bg-rose-500 text-white border-rose-400'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                        }`}
                      >
                        <span>{status === 'absent' ? 'Marked Absent' : 'Absent'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onMarkDateAttendance(cls.subjectId, 'cancelled', selectedLogDate, cls.id)
                        }
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          status === 'cancelled'
                            ? 'bg-slate-600 text-white border-slate-400'
                            : 'bg-white/[0.04] text-white/70 border-white/[0.1] hover:bg-white/[0.08]'
                        }`}
                      >
                        {status === 'cancelled' ? 'Cancelled' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-xs text-white/60 py-2">
            No recurring timetable slots are scheduled on {selectedLogWeekday}s. You can still log any subject session for {formatReadableISO(selectedLogDate, false)} below.
          </div>
        )}

        {/* Log Extra / Custom Session on Selected Date */}
        {subjects.length > 0 && (
          <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <span className="text-white/60 font-medium shrink-0 tabular-nums">
                Log session on {selectedLogDate}:
              </span>
              <select
                aria-label="Select subject for date log"
                value={extraSessionSubjectId}
                onChange={(e) => setExtraSessionSubjectId(e.target.value)}
                className="px-3 py-1.5 rounded-xl glass-input text-xs min-w-[180px]"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#0d1320] text-white">
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  extraSessionSubjectId &&
                  onAppendAttendance(
                    extraSessionSubjectId,
                    'present',
                    selectedLogDate,
                    `Logged for ${selectedLogDate}`
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Present</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  extraSessionSubjectId &&
                  onAppendAttendance(
                    extraSessionSubjectId,
                    'absent',
                    selectedLogDate,
                    `Logged for ${selectedLogDate}`
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Absent</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  extraSessionSubjectId &&
                  onAppendAttendance(
                    extraSessionSubjectId,
                    'cancelled',
                    selectedLogDate,
                    `Logged for ${selectedLogDate}`
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] text-white/80 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                + Cancelled
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Subject List (7 Cols) & Simulator + History Log (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Subject Attendance Cards */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-base text-white">Subject Breakdown</span>
              <span className="text-xs text-white/60 tabular-nums">· {filteredSubjects.length} subjects</span>
            </div>

            <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
              {[
                { id: 'all', label: 'All' },
                { id: 'warning', label: 'Below Target' },
                { id: 'safe', label: 'Safe' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id as 'all' | 'warning' | 'safe')}
                  className={`px-3 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeFilter === f.id
                      ? 'bg-accent-500 text-accent-ink font-bold shadow-xs'
                      : 'text-white/60 hover:text-white'
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
              const isSelected = sub.id === selectedSub?.id;

              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`glass-card interactive-card p-5 rounded-2xl cursor-pointer ${
                    isSelected
                      ? 'border-accent-500/50 bg-accent-500/[0.05]'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono font-bold text-xs"
                          style={{ color: sub.color || '#34d399' }}
                        >
                          {sub.code}
                        </span>
                        <span className="text-white/30" aria-hidden="true">·</span>
                        <span className="text-sm font-semibold text-white truncate">{sub.name}</span>
                      </div>
                      <div className="text-xs text-white/60 mt-1 tabular-nums">
                        {att} attended · {miss} missed · {canc} cancelled
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className="text-2xl font-bold tabular-nums tracking-tight"
                        style={{ color: stats.isBelowTarget ? '#f59e0b' : '#34d399' }}
                      >
                        {stats.percentage}%
                      </div>
                      <span
                        className={`text-xs tabular-nums ${
                          stats.isBelowTarget ? 'text-amber-300' : 'text-white/60'
                        }`}
                      >
                        Target {sub.targetAttendance}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/[0.08] h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, stats.percentage)}%`,
                        backgroundColor: stats.isBelowTarget ? '#f59e0b' : sub.color,
                      }}
                    />
                  </div>

                  {/* Prediction Explanation & Live Adjust Buttons */}
                  <div className="mt-3 pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div
                      className={`font-medium ${
                        stats.isBelowTarget ? 'text-amber-300' : 'text-emerald-400'
                      }`}
                    >
                      {pred.explanation}
                    </div>

                    <div
                      className="flex flex-wrap items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onAppendAttendance(sub.id, 'present', selectedLogDate)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        title={`Add a Present session on ${selectedLogDate}`}
                      >
                        + Present
                      </button>
                      <button
                        type="button"
                        onClick={() => onAppendAttendance(sub.id, 'absent', selectedLogDate)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        title={`Add an Absent session on ${selectedLogDate}`}
                      >
                        + Absent
                      </button>
                      <button
                        type="button"
                        onClick={() => openBackfillModal(sub.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.1] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        title="Set past attended & missed totals for this subject"
                      >
                        Set Totals
                      </button>
                      <button
                        type="button"
                        onClick={() => onResetSubjectAttendance(sub.id)}
                        aria-label={`Reset attendance for ${sub.code}`}
                        className="p-1.5 rounded-lg text-white/50 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Clear all attendance records for this subject"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredSubjects.length === 0 && (
              <div className="p-8 text-center rounded-2xl glass-card text-xs text-white/60">
                {subjects.length === 0
                  ? 'No subjects added yet. Import your timetable/attendance file or add courses in Subjects.'
                  : 'No subjects match the selected attendance filter.'}
              </div>
            )}
          </div>
        </div>

        {/* Right: Future Attendance Simulator + Dated History Log */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-6 rounded-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-accent-400" />
                <h3 className="font-bold text-sm text-white">Future Attendance Simulator</h3>
              </div>
              <span
                className="font-mono font-bold text-xs text-accent-400"
                style={selectedSub?.color ? { color: selectedSub.color } : undefined}
              >
                {selectedSub?.code || 'Overall'}
              </span>
            </div>

            <div>
              <div className="text-xs font-semibold text-white">
                Selected Subject: {selectedSub?.name || 'All Courses'}
              </div>
              <div className="text-xs text-white/60 mt-0.5 tabular-nums">
                Current: <strong className="text-white">{selectedStats.percentage}%</strong> (
                {selectedAttended}/{selectedStats.conducted} classes)
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">If I attend next classes:</span>
                <span className="font-mono tabular-nums font-bold text-emerald-400">{simFutureAttend} classes</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                aria-label="Future classes to attend"
                value={simFutureAttend}
                onChange={(e) => setSimFutureAttend(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">If I miss next classes:</span>
                <span className="font-mono tabular-nums font-bold text-rose-400">{simFutureMiss} classes</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                aria-label="Future classes to miss"
                value={simFutureMiss}
                onChange={(e) => setSimFutureMiss(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/25 text-center">
              <div className="text-xs text-white/70 font-medium">
                Projected New Attendance Percentage
              </div>
              <div className="text-3xl font-bold text-white tracking-tight tabular-nums my-1">
                {projectedValue}%
              </div>
              <div className="text-xs font-medium">
                {projectedValue >= (selectedSub?.targetAttendance || 75) ? (
                  <span className="text-emerald-400 flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Safe & Above Target (
                    {selectedSub?.targetAttendance || 75}%)
                  </span>
                ) : (
                  <span className="text-amber-300 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Below Target Threshold (
                    {selectedSub?.targetAttendance || 75}%)
                  </span>
                )}
              </div>
            </div>

            <div className="text-[11px] text-white/60 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] leading-relaxed tabular-nums">
              Formula: ({selectedAttended} + {simFutureAttend}) / ({selectedStats.conducted} +{' '}
              {simFutureAttend + simFutureMiss}) × 100
            </div>
          </div>

          {/* Dated Attendance History Log for Selected Subject */}
          {selectedSub && (
            <div className="glass-card p-6 rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-accent-400" />
                  <h3 className="font-bold text-sm text-white">
                    {selectedSub.code} Session History
                  </h3>
                </div>
                <span className="text-xs font-mono text-white/60 tabular-nums">
                  {selectedRecords.length} logs
                </span>
              </div>

              {selectedRecords.length === 0 ? (
                <div className="py-6 text-center text-xs text-white/60">
                  No sessions recorded for {selectedSub.code} yet. Use the date picker above,{' '}
                  <strong className="text-white">Set Totals</strong>, or <strong className="text-white">+ Present / + Absent</strong>.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.08] pr-1 text-xs">
                  {selectedRecords.slice(0, 50).map((rec) => (
                    <div
                      key={rec.id}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-mono font-semibold text-white tabular-nums">
                          {formatReadableISO(rec.date)}
                        </div>
                        {rec.note && (
                          <div className="text-[11px] text-white/60 truncate">{rec.note}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          aria-label={`Change status for ${rec.date}`}
                          value={rec.status}
                          onChange={(e) =>
                            onUpdateAttendanceRecord(
                              rec.id,
                              e.target.value as 'present' | 'absent' | 'cancelled'
                            )
                          }
                          className={`px-2 py-1 rounded-lg border text-[11px] font-semibold bg-[#0d1320] cursor-pointer ${
                            rec.status === 'present'
                              ? 'border-emerald-500/40 text-emerald-300'
                              : rec.status === 'absent'
                              ? 'border-rose-500/40 text-rose-300'
                              : 'border-white/20 text-white/70'
                          }`}
                        >
                          <option value="present" className="bg-[#0d1320]">Present</option>
                          <option value="absent" className="bg-[#0d1320]">Absent</option>
                          <option value="cancelled" className="bg-[#0d1320]">Cancelled</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => onDeleteAttendanceRecord(rec.id)}
                          aria-label={`Delete attendance record on ${rec.date}`}
                          className="p-1.5 rounded-lg text-white/50 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Backfill Past Attendance Totals Modal */}
      {showBackfillModal && (
        <ModalShell
          title="Backfill Past Semester Attendance"
          subtitle="Enter how many classes you already attended or missed earlier this semester"
          onClose={() => setShowBackfillModal(false)}
          maxWidthClass="max-w-2xl"
        >
          <form onSubmit={handleSaveBackfill} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <div>
                <label className="block text-white/60 font-medium mb-1">Update Mode</label>
                <select
                  value={backfillMode}
                  onChange={(e) => setBackfillMode(e.target.value as 'replace' | 'append')}
                  className="w-full px-3 py-2 rounded-xl glass-input"
                >
                  <option value="replace" className="bg-[#0d1320]">Set exact totals (replace subject history)</option>
                  <option value="append" className="bg-[#0d1320]">Add on top of existing subject history</option>
                </select>
              </div>

              <div>
                <label className="block text-white/60 font-medium mb-1">
                  Backfill Up Through Date
                </label>
                <input
                  type="date"
                  value={backfillEndDate}
                  onChange={(e) => setBackfillEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {subjects.map((sub) => {
                const draft = backfillDraft[sub.id] || { attended: 0, missed: 0, cancelled: 0 };
                const total = draft.attended + draft.missed;
                const pct = total > 0 ? ((draft.attended / total) * 100).toFixed(1) : '0.0';

                return (
                  <div
                    key={sub.id}
                    className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: sub.color }}
                        />
                        <span className="font-mono">{sub.code}</span>
                        <span className="truncate text-white/80">{sub.name}</span>
                      </div>
                      <div className="text-[11px] text-white/60 mt-0.5 tabular-nums">
                        Resulting attendance: <strong className="text-white">{pct}%</strong> ({draft.attended}/{total})
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div>
                        <label className="block text-[10px] text-emerald-400 mb-0.5">
                          Attended
                        </label>
                        <input
                          type="number"
                          min="0"
                          aria-label={`Past attended classes for ${sub.code}`}
                          value={draft.attended}
                          onChange={(e) =>
                            setBackfillDraft((prev) => ({
                              ...prev,
                              [sub.id]: {
                                ...draft,
                                attended: Math.max(0, Number(e.target.value) || 0),
                              },
                            }))
                          }
                          className="w-20 px-2.5 py-1.5 rounded-lg glass-input font-mono tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-rose-300 mb-0.5">
                          Missed
                        </label>
                        <input
                          type="number"
                          min="0"
                          aria-label={`Past missed classes for ${sub.code}`}
                          value={draft.missed}
                          onChange={(e) =>
                            setBackfillDraft((prev) => ({
                              ...prev,
                              [sub.id]: {
                                ...draft,
                                missed: Math.max(0, Number(e.target.value) || 0),
                              },
                            }))
                          }
                          className="w-20 px-2.5 py-1.5 rounded-lg glass-input font-mono tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-white/60 mb-0.5">
                          Cancelled
                        </label>
                        <input
                          type="number"
                          min="0"
                          aria-label={`Past cancelled classes for ${sub.code}`}
                          value={draft.cancelled}
                          onChange={(e) =>
                            setBackfillDraft((prev) => ({
                              ...prev,
                              [sub.id]: {
                                ...draft,
                                cancelled: Math.max(0, Number(e.target.value) || 0),
                              },
                            }))
                          }
                          className="w-20 px-2.5 py-1.5 rounded-lg glass-input font-mono tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowBackfillModal(false)}
                className="px-4 py-2 rounded-xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink font-bold shadow-lg shadow-accent-950/35 cursor-pointer"
              >
                Save Past Attendance Records
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
};

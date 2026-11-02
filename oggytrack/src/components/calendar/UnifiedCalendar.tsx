import React, { useState, useEffect } from 'react';
import {
  TimetableEntry,
  Assignment,
  Holiday,
  AttendanceRecord,
  Subject,
  SubjectExam,
} from '../../types/oggytrack';
import { generateICSFile } from '../../utils/icsExport';
import { calculateExamPercentage, summarizeDateAttendance } from '../../utils/academicCalculations';
import {
  addDaysISO,
  formatDateISO,
  formatLiveClock,
  formatMonthYear,
  formatReadableISO,
  getMonthCalendarGrid,
  parseISODateParts,
  useLiveClock,
} from '../../utils/dateUtils';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Plus,
  ScanLine,
  Trash2,
} from 'lucide-react';

interface UnifiedCalendarProps {
  subjects?: Subject[];
  timetable: TimetableEntry[];
  assignments: Assignment[];
  holidays: Holiday[];
  exams?: SubjectExam[];
  attendance?: AttendanceRecord[];
  onMarkDateAttendance?: (
    subjectId: string,
    status: 'present' | 'absent' | 'cancelled',
    dateISO: string,
    timetableEntryId?: string
  ) => void;
  onAppendAttendance?: (
    subjectId: string,
    status: 'present' | 'absent' | 'cancelled',
    dateISO: string,
    note?: string
  ) => void;
  onUpdateAttendanceRecord?: (
    recordId: string,
    status: 'present' | 'absent' | 'cancelled'
  ) => void;
  onDeleteAttendanceRecord?: (recordId: string) => void;
  onOpenScanHolidays?: () => void;
  onOpenExams?: (subjectId?: string) => void;
  timeFormat?: '12h' | '24h';
}

export const UnifiedCalendar: React.FC<UnifiedCalendarProps> = ({
  subjects = [],
  timetable,
  assignments,
  holidays,
  exams = [],
  attendance = [],
  onMarkDateAttendance,
  onAppendAttendance,
  onUpdateAttendanceRecord,
  onDeleteAttendanceRecord,
  onOpenScanHolidays,
  onOpenExams,
  timeFormat = '12h',
}) => {
  const now = useLiveClock(1000);
  const todayISO = formatDateISO(now);

  const [viewYear, setViewYear] = useState<number>(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateISO(new Date()));
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'class' | 'exam' | 'assignment' | 'holiday'
  >('all');
  const [extraSubjectId, setExtraSubjectId] = useState<string>(() => subjects[0]?.id || '');

  useEffect(() => {
    setSelectedDate((prev) => prev || todayISO);
  }, [todayISO]);

  useEffect(() => {
    if (!extraSubjectId && subjects[0]) {
      setExtraSubjectId(subjects[0].id);
    } else if (extraSubjectId && subjects.length > 0 && !subjects.some((s) => s.id === extraSubjectId)) {
      setExtraSubjectId(subjects[0].id);
    }
  }, [subjects, extraSubjectId]);

  const calendarGrid = getMonthCalendarGrid(viewYear, viewMonth);
  const monthYearLabel = formatMonthYear(viewYear, viewMonth);

  const selectDateAndSyncMonth = (nextDateISO: string) => {
    if (!nextDateISO) return;
    setSelectedDate(nextDateISO);
    const { year, monthIndex } = parseISODateParts(nextDateISO);
    if (year !== viewYear || monthIndex !== viewMonth) {
      setViewYear(year);
      setViewMonth(monthIndex);
    }
  };

  const handlePrevMonth = () => {
    const prev = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(prev.getFullYear());
    setViewMonth(prev.getMonth());
  };

  const handleNextMonth = () => {
    const next = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleJumpToday = () => {
    const current = new Date();
    setViewYear(current.getFullYear());
    setViewMonth(current.getMonth());
    setSelectedDate(formatDateISO(current));
  };

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`;
  const monthRecords = attendance.filter((r) => r.date.startsWith(monthPrefix));
  const monthPresentCount = monthRecords.filter((r) => r.status === 'present').length;
  const monthAbsentCount = monthRecords.filter((r) => r.status === 'absent').length;

  const selectedSummary = summarizeDateAttendance(selectedDate, timetable, attendance, holidays);

  const selectedDayHolidays = holidays.filter(
    (h) => selectedDate >= h.startDate && selectedDate <= h.endDate
  );
  const selectedDayAssignments = assignments.filter((a) => a.dueDate === selectedDate);
  const selectedDayExams = exams.filter((e) => e.examDate === selectedDate);

  const handleMarkAllScheduledPresent = () => {
    if (!onMarkDateAttendance) return;
    selectedSummary.scheduledClasses.forEach(({ entry, status }) => {
      if (status !== 'present') {
        onMarkDateAttendance(entry.subjectId, 'present', selectedDate, entry.id);
      }
    });
  };

  const getCellPreviewItems = (dateStr: string) => {
    const daySummary = summarizeDateAttendance(dateStr, timetable, attendance, holidays);
    const items: Array<{
      id: string;
      label: string;
      tone: 'emerald' | 'rose' | 'amber' | 'muted';
      customColor?: string;
    }> = [];

    if (categoryFilter === 'all' || categoryFilter === 'holiday') {
      holidays
        .filter((h) => dateStr >= h.startDate && dateStr <= h.endDate)
        .forEach((h) => {
          items.push({
            id: `hol_${h.id}_${dateStr}`,
            label: `Hol · ${h.title}`,
            tone: 'amber',
          });
        });
    }

    if (categoryFilter === 'all' || categoryFilter === 'class') {
      daySummary.scheduledClasses.forEach(({ entry, status }) => {
        const statusSuffix =
          status === 'present'
            ? ' · P'
            : status === 'absent'
            ? ' · A'
            : status === 'cancelled'
            ? ' · C'
            : '';
        items.push({
          id: `tt_${entry.id}_${dateStr}`,
          label: `${entry.code}${statusSuffix}`,
          tone:
            status === 'present'
              ? 'emerald'
              : status === 'absent'
              ? 'rose'
              : 'muted',
          customColor:
            !status && !daySummary.suspendingHoliday ? entry.color : undefined,
        });
      });

      if (daySummary.extraRecords.length > 0) {
        items.push({
          id: `extra_${dateStr}`,
          label: `+${daySummary.extraRecords.length} logged`,
          tone: 'emerald',
        });
      }
    }

    if (categoryFilter === 'all' || categoryFilter === 'exam') {
      exams
        .filter((e) => e.examDate === dateStr)
        .forEach((e) => {
          const scoreTag =
            e.marksObtained !== null && e.marksObtained !== undefined
              ? ` · ${e.marksObtained}/${e.maxMarks}`
              : '';
          const subColor = e.color || subjects.find((s) => s.id === e.subjectId)?.color;
          items.push({
            id: `exam_${e.id}`,
            label: `Exam · ${e.subjectCode}${scoreTag}`,
            tone: 'amber',
            customColor: subColor,
          });
        });
    }

    if (categoryFilter === 'all' || categoryFilter === 'assignment') {
      assignments
        .filter((a) => a.dueDate === dateStr)
        .forEach((a) => {
          items.push({
            id: `asg_${a.id}`,
            label: `Due · ${a.subjectCode}`,
            tone: 'rose',
          });
        });
    }

    return { daySummary, items };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Unified Academic Calendar
            </h1>
            <span className="text-sm font-medium text-accent-400 tabular-nums">
              · {monthYearLabel}
            </span>
          </div>
          <p className="text-sm text-white/60 mt-1 tabular-nums">
            Select any date to mark attendance · {formatReadableISO(todayISO)} ·{' '}
            {formatLiveClock(now, timeFormat, true)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
            {[
              { id: 'all', label: 'All' },
              { id: 'class', label: 'Classes' },
              { id: 'exam', label: 'Exams' },
              { id: 'assignment', label: 'Assignments' },
              { id: 'holiday', label: 'Holidays' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() =>
                  setCategoryFilter(
                    f.id as 'all' | 'class' | 'exam' | 'assignment' | 'holiday'
                  )
                }
                className={`px-3 py-1.5 font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === f.id
                    ? 'bg-accent-500 text-accent-ink'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {onOpenScanHolidays && (
            <button
              type="button"
              onClick={onOpenScanHolidays}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-accent-500/35 bg-accent-500/12 hover:bg-accent-500/20 text-accent-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ScanLine className="w-3.5 h-3.5 text-accent-400 shrink-0" />
              <span>Scan Holidays</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => generateICSFile(timetable, assignments, holidays, exams)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink shadow-lg shadow-accent-950/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Export standard .ics file for Google Calendar / Apple Calendar"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Export ICS</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Month Calendar (7 Cols) & Selected Date Attendance Inspector (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 xl:col-span-8 glass-card p-6 rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <CalendarDays className="w-5 h-5 text-accent-400 shrink-0" />
              <h2 className="font-bold text-base text-white">{monthYearLabel}</h2>
              <span className="text-xs text-white/55 tabular-nums">
                · {monthPresentCount} Present · {monthAbsentCount} Absent this month
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleJumpToday}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-white/[0.1] text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-white/60 pb-2 border-b border-white/[0.08]">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 pt-2">
            {calendarGrid.map((dateStr, idx) => {
              if (!dateStr) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[76px] sm:min-h-[88px] rounded-xl p-1 bg-transparent"
                  />
                );
              }

              const dayNum = parseInt(dateStr.split('-')[2], 10);
              const { daySummary, items } = getCellPreviewItems(dateStr);
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayISO;

              return (
                <button
                  type="button"
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  aria-pressed={isSelected}
                  aria-label={`Select ${formatReadableISO(dateStr)}`}
                  className={`min-h-[76px] sm:min-h-[88px] p-2 rounded-xl border text-left cursor-pointer transition-colors flex flex-col justify-between ${
                    isSelected
                      ? 'border-accent-400 bg-accent-500/14 ring-1 ring-accent-400/40'
                      : isToday
                      ? 'border-accent-500/35 bg-accent-500/[0.06] hover:border-accent-400/60'
                      : 'border-white/[0.07] hover:border-white/[0.18] bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        isToday
                          ? 'w-5 h-5 rounded-md bg-accent-500 text-accent-ink flex items-center justify-center font-bold'
                          : 'text-white/85'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {daySummary.totalLoggedCount > 0 ? (
                      <span className="text-[10px] font-mono tabular-nums font-semibold flex items-center gap-0.5 truncate">
                        {daySummary.presentCount > 0 && (
                          <span className="text-emerald-400">{daySummary.presentCount}P</span>
                        )}
                        {daySummary.presentCount > 0 && daySummary.absentCount > 0 && (
                          <span className="text-white/35" aria-hidden="true">
                            ·
                          </span>
                        )}
                        {daySummary.absentCount > 0 && (
                          <span className="text-rose-400">{daySummary.absentCount}A</span>
                        )}
                        {(daySummary.presentCount > 0 || daySummary.absentCount > 0) &&
                          daySummary.cancelledCount > 0 && (
                            <span className="text-white/35" aria-hidden="true">
                              ·
                            </span>
                          )}
                        {daySummary.cancelledCount > 0 && (
                          <span className="text-white/55">{daySummary.cancelledCount}C</span>
                        )}
                      </span>
                    ) : items.length > 0 ? (
                      <span className="text-[10px] text-white/45 font-mono tabular-nums">
                        {items.length}
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-0.5 overflow-hidden w-full mt-1">
                    {items.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        style={item.customColor ? { color: item.customColor } : undefined}
                        className={`text-[10px] leading-tight truncate font-medium ${
                          item.customColor
                            ? ''
                            : item.tone === 'emerald'
                            ? 'text-emerald-300'
                            : item.tone === 'rose'
                            ? 'text-rose-300'
                            : item.tone === 'amber'
                            ? 'text-amber-300'
                            : 'text-white/65'
                        }`}
                      >
                        {item.label}
                      </div>
                    ))}
                    {items.length > 2 && (
                      <span className="text-[9px] text-white/45 block tabular-nums">
                        +{items.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Attendance & Schedule Panel */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="glass-card p-6 rounded-2xl space-y-5">
            {/* Selected Date Header + Day Stepper */}
            <div className="space-y-3 pb-4 border-b border-white/[0.08]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-white/60">
                    <span>Attendance & Schedule</span>
                    <span aria-hidden="true">·</span>
                    <span className={selectedDate === todayISO ? 'text-emerald-400 font-semibold' : ''}>
                      {selectedDate === todayISO
                        ? 'Today'
                        : selectedDate < todayISO
                        ? 'Past Date'
                        : 'Upcoming'}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-white mt-0.5">
                    {formatReadableISO(selectedDate)}
                  </h3>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => selectDateAndSyncMonth(addDaysISO(selectedDate, -1))}
                    aria-label="Previous calendar day"
                    className="p-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => selectDateAndSyncMonth(addDaysISO(selectedDate, 1))}
                    aria-label="Next calendar day"
                    className="p-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5 text-white/65 tabular-nums">
                  <span className="text-emerald-400 font-semibold">
                    {selectedSummary.presentCount} Present
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-rose-400 font-semibold">
                    {selectedSummary.absentCount} Absent
                  </span>
                  {selectedSummary.cancelledCount > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-white/60">
                        {selectedSummary.cancelledCount} Cancelled
                      </span>
                    </>
                  )}
                  {selectedSummary.scheduledClasses.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {selectedSummary.scheduledMarkedCount}/
                        {selectedSummary.scheduledClasses.length} Marked
                      </span>
                    </>
                  )}
                </div>

                <input
                  type="date"
                  aria-label="Jump to calendar date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && selectDateAndSyncMonth(e.target.value)}
                  className="px-2.5 py-1 text-xs font-mono tabular-nums rounded-lg glass-input"
                />
              </div>

              {selectedSummary.suspendingHoliday && (
                <p className="text-xs text-amber-300/90 pt-1">
                  Holiday active: <strong className="font-semibold">{selectedSummary.suspendingHoliday.title}</strong> — scheduled classes suspended (manual override still available).
                </p>
              )}
            </div>

            {/* Scheduled Classes Attendance Marking */}
            {(categoryFilter === 'all' || categoryFilter === 'class') && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-white/85">
                    {selectedSummary.dayOfWeek} Classes ({selectedSummary.scheduledClasses.length})
                  </span>

                  {selectedSummary.scheduledClasses.length > 0 && onMarkDateAttendance && (
                    <button
                      type="button"
                      onClick={handleMarkAllScheduledPresent}
                      disabled={selectedSummary.allScheduledMarkedPresent}
                      className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedSummary.allScheduledMarkedPresent
                          ? 'text-emerald-400/70 cursor-default'
                          : 'text-emerald-400 hover:text-emerald-300'
                      }`}
                    >
                      {selectedSummary.allScheduledMarkedPresent && (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>
                        {selectedSummary.allScheduledMarkedPresent
                          ? 'All Marked Present'
                          : 'Mark All Present'}
                      </span>
                    </button>
                  )}
                </div>

                {selectedSummary.scheduledClasses.length > 0 ? (
                  <div className="divide-y divide-white/[0.08]">
                    {selectedSummary.scheduledClasses.map(({ entry: cls, status }) => (
                      <div key={cls.id} className="py-3 first:pt-1 last:pb-1 space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="font-mono font-bold shrink-0"
                                style={{ color: cls.color || '#34d399' }}
                              >
                                {cls.code}
                              </span>
                              <span className="text-white/30" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-white font-semibold truncate">
                                {cls.subjectName}
                              </span>
                            </div>
                            <div className="text-[11px] text-white/55 font-mono tabular-nums mt-0.5 flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-white/40 shrink-0" />
                              <span>
                                {cls.startTime} - {cls.endTime} · {cls.room}
                              </span>
                            </div>
                          </div>
                        </div>

                        {onMarkDateAttendance && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              aria-pressed={status === 'present'}
                              aria-label={`Mark ${cls.code} present on ${selectedDate}`}
                              onClick={() =>
                                onMarkDateAttendance(cls.subjectId, 'present', selectedDate, cls.id)
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                status === 'present'
                                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                                  : 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/22'
                              }`}
                            >
                              {status === 'present' && <Check className="w-3 h-3 shrink-0" />}
                              <span>Present</span>
                            </button>

                            <button
                              type="button"
                              aria-pressed={status === 'absent'}
                              aria-label={`Mark ${cls.code} absent on ${selectedDate}`}
                              onClick={() =>
                                onMarkDateAttendance(cls.subjectId, 'absent', selectedDate, cls.id)
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                status === 'absent'
                                  ? 'bg-rose-500 text-white border-rose-400 font-bold'
                                  : 'bg-rose-500/12 text-rose-300 border-rose-500/30 hover:bg-rose-500/22'
                              }`}
                            >
                              <span>{status === 'absent' ? 'Marked Absent' : 'Absent'}</span>
                            </button>

                            <button
                              type="button"
                              aria-pressed={status === 'cancelled'}
                              aria-label={`Mark ${cls.code} cancelled on ${selectedDate}`}
                              onClick={() =>
                                onMarkDateAttendance(
                                  cls.subjectId,
                                  'cancelled',
                                  selectedDate,
                                  cls.id
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                status === 'cancelled'
                                  ? 'bg-slate-600 text-white border-slate-400'
                                  : 'bg-white/[0.04] text-white/70 border-white/[0.1] hover:bg-white/[0.08]'
                              }`}
                            >
                              {status === 'cancelled' ? 'Cancelled' : 'Cancel'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/55 py-1">
                    No recurring timetable classes on {selectedSummary.dayOfWeek}s. Use extra session logging below to mark any course on this date.
                  </p>
                )}
              </div>
            )}

            {/* Extra / Custom Logged Sessions on Selected Date */}
            {(categoryFilter === 'all' || categoryFilter === 'class') &&
              selectedSummary.extraRecords.length > 0 && (
                <div className="pt-4 border-t border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/85">
                      Extra Logged Sessions ({selectedSummary.extraRecords.length})
                    </span>
                  </div>

                  <div className="divide-y divide-white/[0.08]">
                    {selectedSummary.extraRecords.map((rec) => {
                      const sub = subjects.find((s) => s.id === rec.subjectId);
                      const codeLabel = sub?.code || 'Course';
                      return (
                        <div key={rec.id} className="py-2.5 first:pt-1 last:pb-1 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex items-center gap-1.5">
                              <span
                                className="font-mono font-bold shrink-0"
                                style={{ color: sub?.color || '#34d399' }}
                              >
                                {codeLabel}
                              </span>
                              <span className="text-white/30" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-white/90 font-medium truncate">
                                {sub?.name || 'Recorded Session'}
                              </span>
                            </div>

                            {onDeleteAttendanceRecord && (
                              <button
                                type="button"
                                onClick={() => onDeleteAttendanceRecord(rec.id)}
                                aria-label={`Remove logged session for ${codeLabel}`}
                                className="p-1 rounded-lg text-white/45 hover:text-rose-400 hover:bg-white/[0.06] transition-colors shrink-0 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {onUpdateAttendanceRecord && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                aria-pressed={rec.status === 'present'}
                                onClick={() => onUpdateAttendanceRecord(rec.id, 'present')}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                  rec.status === 'present'
                                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                                    : 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/22'
                                }`}
                              >
                                {rec.status === 'present' && <Check className="w-3 h-3 shrink-0" />}
                                <span>Present</span>
                              </button>
                              <button
                                type="button"
                                aria-pressed={rec.status === 'absent'}
                                onClick={() => onUpdateAttendanceRecord(rec.id, 'absent')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                  rec.status === 'absent'
                                    ? 'bg-rose-500 text-white border-rose-400 font-bold'
                                    : 'bg-rose-500/12 text-rose-300 border-rose-500/30 hover:bg-rose-500/22'
                                }`}
                              >
                                {rec.status === 'absent' ? 'Marked Absent' : 'Absent'}
                              </button>
                              <button
                                type="button"
                                aria-pressed={rec.status === 'cancelled'}
                                onClick={() => onUpdateAttendanceRecord(rec.id, 'cancelled')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                  rec.status === 'cancelled'
                                    ? 'bg-slate-600 text-white border-slate-400'
                                    : 'bg-white/[0.04] text-white/70 border-white/[0.1] hover:bg-white/[0.08]'
                                }`}
                              >
                                {rec.status === 'cancelled' ? 'Cancelled' : 'Cancel'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Log Extra Session on Any Selected Date */}
            {(categoryFilter === 'all' || categoryFilter === 'class') && onAppendAttendance && (
              <div className="pt-4 border-t border-white/[0.08] space-y-2.5 text-xs">
                <label
                  htmlFor="calendar-extra-subject"
                  className="block font-semibold text-white/85"
                >
                  Log Extra Session on {formatReadableISO(selectedDate, false)}
                </label>

                {subjects.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      id="calendar-extra-subject"
                      value={extraSubjectId}
                      onChange={(e) => setExtraSubjectId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#0d1320] text-white">
                          {s.code} — {s.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          extraSubjectId &&
                          onAppendAttendance(
                            extraSubjectId,
                            'present',
                            selectedDate,
                            `Logged from Calendar (${selectedDate})`
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/18 hover:bg-emerald-500/28 border border-emerald-500/35 text-emerald-300 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span>Log Present</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          extraSubjectId &&
                          onAppendAttendance(
                            extraSubjectId,
                            'absent',
                            selectedDate,
                            `Logged from Calendar (${selectedDate})`
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/18 hover:bg-rose-500/28 border border-rose-500/35 text-rose-300 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span>Log Absent</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          extraSubjectId &&
                          onAppendAttendance(
                            extraSubjectId,
                            'cancelled',
                            selectedDate,
                            `Logged from Calendar (${selectedDate})`
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] text-white/75 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        + Cancelled
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/50">
                    Add or import subjects first to log extra attendance sessions on any date.
                  </p>
                )}
              </div>
            )}

            {/* Exams, Deadlines & Holidays on Selected Date */}
            {((categoryFilter === 'all' || categoryFilter === 'exam') &&
              selectedDayExams.length > 0) ||
            ((categoryFilter === 'all' || categoryFilter === 'assignment') &&
              selectedDayAssignments.length > 0) ||
            ((categoryFilter === 'all' || categoryFilter === 'holiday') &&
              selectedDayHolidays.length > 0) ? (
              <div className="pt-4 border-t border-white/[0.08] space-y-2 text-xs">
                <span className="font-semibold text-white/85 block">
                  Exams, Deadlines & Campus Breaks
                </span>
                <div className="divide-y divide-white/[0.08]">
                  {(categoryFilter === 'all' || categoryFilter === 'exam') &&
                    selectedDayExams.map((ex) => {
                      const isGraded =
                        ex.marksObtained !== null && ex.marksObtained !== undefined;
                      const pct = isGraded
                        ? calculateExamPercentage(ex.marksObtained!, ex.maxMarks)
                        : null;
                      return (
                        <div key={ex.id} className="py-2.5 first:pt-1 last:pb-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-emerald-400 font-semibold">
                              {ex.subjectCode} · {ex.title}
                            </span>
                            <span className="font-mono tabular-nums text-[11px] text-white/85 font-semibold shrink-0">
                              {isGraded
                                ? `${ex.marksObtained}/${ex.maxMarks} (${pct}%)`
                                : `Max ${ex.maxMarks}`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[11px] text-white/55">
                            <span>
                              {ex.category}
                              {ex.startTime ? ` · ${ex.startTime}` : ''}
                              {ex.room ? ` · ${ex.room}` : ''}
                            </span>
                            {onOpenExams && (
                              <button
                                type="button"
                                onClick={() => onOpenExams(ex.subjectId)}
                                className="text-emerald-400 hover:text-emerald-300 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                {isGraded ? 'Edit Marks' : 'Enter Marks'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {(categoryFilter === 'all' || categoryFilter === 'holiday') &&
                    selectedDayHolidays.map((h) => (
                      <div key={h.id} className="py-2 first:pt-1 last:pb-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-amber-400 font-semibold">{h.title}</span>
                          <span className="text-[11px] text-white/55">{h.type}</span>
                        </div>
                        <p className="text-[11px] text-white/55">
                          {h.description ||
                            (h.cancelsClasses ? 'Scheduled classes suspended' : 'Campus observance')}
                        </p>
                      </div>
                    ))}

                  {(categoryFilter === 'all' || categoryFilter === 'assignment') &&
                    selectedDayAssignments.map((a) => (
                      <div key={a.id} className="py-2 first:pt-1 last:pb-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-rose-400 font-semibold">
                            {a.subjectCode} · {a.title}
                          </span>
                          <span className="font-mono tabular-nums text-[11px] text-white/60">
                            Due {a.dueTime}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/55 capitalize">
                          Priority: {a.priority} · Status: {a.status.replace('_', ' ')}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { TimetableEntry, Assignment, Holiday } from '../../types/oggytrack';
import { generateICSFile } from '../../utils/icsExport';
import {
  formatDateISO,
  formatLiveClock,
  formatMonthYear,
  formatReadableISO,
  getDayOfWeekFromISO,
  getMonthCalendarGrid,
  useLiveClock,
} from '../../utils/dateUtils';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Clock
} from 'lucide-react';

interface UnifiedCalendarProps {
  timetable: TimetableEntry[];
  assignments: Assignment[];
  holidays: Holiday[];
  timeFormat?: '12h' | '24h';
}

export const UnifiedCalendar: React.FC<UnifiedCalendarProps> = ({
  timetable,
  assignments,
  holidays,
  timeFormat = '12h',
}) => {
  const now = useLiveClock(1000);
  const todayISO = formatDateISO(now);

  const [viewYear, setViewYear] = useState<number>(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateISO(new Date()));
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'class' | 'assignment' | 'holiday'>('all');

  // If the date rolls over past midnight while the student was viewing yesterday, keep todayISO fresh
  useEffect(() => {
    setSelectedDate((prev) => prev || todayISO);
  }, [todayISO]);

  const calendarGrid = getMonthCalendarGrid(viewYear, viewMonth);
  const monthYearLabel = formatMonthYear(viewYear, viewMonth);

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

  const getEventsForDay = (dateStr: string) => {
    const list: { id: string; title: string; category: 'class' | 'assignment' | 'holiday'; time?: string; color?: string; details?: string }[] = [];
    const dow = getDayOfWeekFromISO(dateStr);

    const activeHolidaySuspend = holidays.some(
      (h) => h.cancelsClasses && dateStr >= h.startDate && dateStr <= h.endDate
    );

    // Holidays
    if (categoryFilter === 'all' || categoryFilter === 'holiday') {
      holidays
        .filter((h) => dateStr >= h.startDate && dateStr <= h.endDate)
        .forEach((h) => {
          list.push({
            id: `hol_${h.id}_${dateStr}`,
            title: `Holiday: ${h.title}`,
            category: 'holiday',
            color: '#f59e0b',
            details: h.description || (h.cancelsClasses ? 'Scheduled classes suspended' : h.type),
          });
        });
    }

    // Classes on this day
    if (categoryFilter === 'all' || categoryFilter === 'class') {
      timetable
        .filter((t) => t.day === dow)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .forEach((t) => {
          list.push({
            id: `tt_${t.id}_${dateStr}`,
            title: `${t.code} ${t.subjectName}${activeHolidaySuspend ? ' (Holiday)' : ''}`,
            category: 'class',
            time: `${t.startTime} - ${t.endTime}`,
            color: activeHolidaySuspend ? '#64748b' : t.color,
            details: `${t.room} · ${t.faculty}`,
          });
        });
    }

    // Assignments due on this date
    if (categoryFilter === 'all' || categoryFilter === 'assignment') {
      assignments
        .filter((a) => a.dueDate === dateStr)
        .forEach((a) => {
          list.push({
            id: `asg_${a.id}`,
            title: `Deadline: ${a.subjectCode} - ${a.title}`,
            category: 'assignment',
            time: `Due ${a.dueTime}`,
            color: '#f43f5e',
            details: `Priority: ${a.priority}`,
          });
        });
    }

    return list;
  };

  const selectedDayEvents = getEventsForDay(selectedDate);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Unified Academic Calendar
            </h1>
            <span className="text-xs font-semibold text-purple-300 tabular-nums">
              · {monthYearLabel}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 tabular-nums">
            Live local time: {formatReadableISO(todayISO)} · {formatLiveClock(now, timeFormat, true)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
            {[
              { id: 'all', label: 'All' },
              { id: 'class', label: 'Classes' },
              { id: 'assignment', label: 'Assignments' },
              { id: 'holiday', label: 'Holidays' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCategoryFilter(f.id as 'all' | 'class' | 'assignment' | 'holiday')}
                className={`px-3 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  categoryFilter === f.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Export to ICS */}
          <button
            type="button"
            onClick={() => generateICSFile(timetable, assignments, holidays)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition-all whitespace-nowrap cursor-pointer"
            title="Export standard .ics file for Google Calendar / Apple Calendar"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export ICS</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Month Calendar (8 Cols) & Day Inspector (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Month Grid */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-purple-400" />
              <h2 className="font-bold text-base text-white">
                {monthYearLabel}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleJumpToday}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 pb-2 border-b border-white/10">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1.5 pt-2">
            {calendarGrid.map((dateStr, idx) => {
              if (!dateStr) {
                return <div key={`empty-${idx}`} className="h-16 sm:h-20 rounded-xl p-1 bg-transparent" />;
              }

              const dayNum = parseInt(dateStr.split('-')[2], 10);
              const dayEvents = getEventsForDay(dateStr);
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayISO;

              return (
                <button
                  type="button"
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  aria-label={`Select ${formatReadableISO(dateStr)}`}
                  className={`h-16 sm:h-20 p-1.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-purple-500 bg-purple-950/40 ring-1 ring-purple-500/50 shadow-md'
                      : isToday
                      ? 'border-purple-400/40 bg-purple-950/20 hover:border-purple-400/60'
                      : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold'
                          : 'text-slate-200'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-purple-300 font-mono tabular-nums font-bold">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 overflow-hidden w-full">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-[9px] px-1 py-0.5 rounded truncate font-medium text-white"
                        style={{ backgroundColor: `${ev.color || '#a855f7'}33` }}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-slate-400 pl-1 block">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Inspector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl sticky top-20">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div>
                <span className="text-xs text-purple-400 font-semibold">
                  Day Schedule
                </span>
                <h3 className="font-bold text-sm text-white mt-0.5">
                  {formatReadableISO(selectedDate)}
                  {selectedDate === todayISO ? ' (Today)' : ''}
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono tabular-nums shrink-0">
                {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>

            <div className="space-y-2.5 mt-4 max-h-[400px] overflow-y-auto pr-1">
              {selectedDayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-semibold capitalize ${
                        ev.category === 'assignment'
                          ? 'text-rose-300'
                          : ev.category === 'holiday'
                          ? 'text-amber-300'
                          : 'text-purple-300'
                      }`}
                    >
                      {ev.category}
                    </span>
                    {ev.time && (
                      <span className="font-mono tabular-nums text-slate-400 text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {ev.time}
                      </span>
                    )}
                  </div>

                  <div className="font-semibold text-white mt-1">
                    {ev.title}
                  </div>

                  {ev.details && (
                    <div className="text-[11px] text-slate-400">
                      {ev.details}
                    </div>
                  )}
                </div>
              ))}

              {selectedDayEvents.length === 0 && (
                <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl">
                  No classes, deadlines, or holidays scheduled on {formatReadableISO(selectedDate, false)}.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

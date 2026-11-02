import React, { useState } from 'react';
import { DesignConfig, AcademicEvent } from '../../types/design';
import { MOCK_CALENDAR_EVENTS, MOCK_HOLIDAYS } from '../../utils/mockAcademicData';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  Clock, 
  Tag, 
  Plus, 
  CheckCircle2,
  CalendarDays
} from 'lucide-react';

interface PreviewCalendarProps {
  config: DesignConfig;
}

export const PreviewCalendar: React.FC<PreviewCalendarProps> = ({ config }) => {
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-21');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'class' | 'exam' | 'assignment' | 'holiday'>('all');
  const [events, setEvents] = useState<AcademicEvent[]>(MOCK_CALENDAR_EVENTS);

  // Month grid for October 2026 (starts on Thursday Oct 1, 31 days)
  const daysInMonth = 31;
  const startDayOfWeek = 4; // 0=Sun, 1=Mon, ..., 4=Thu

  const calendarDays = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    calendarDays.push(`2026-10-${dayStr}`);
  }

  const selectedDateEvents = events.filter((e) => e.date === selectedDate);

  const getEventsForDay = (dateStr: string) => {
    return events.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      return e.date === dateStr;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Unified Academic Calendar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Synchronized classes, assignment deadlines, holidays, and examination schedules
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/60 text-xs">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'class', label: 'Classes' },
            { id: 'assignment', label: 'Deadlines' },
            { id: 'holiday', label: 'Holidays' },
            { id: 'exam', label: 'Exams' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id as any)}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                categoryFilter === c.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Calendar Month Grid (8 Cols) + Selected Day Inspector (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Month Calendar (8 Cols) */}
        <div className={`lg:col-span-8 p-5 border bg-white dark:bg-slate-900 ${config.borderRadius} border-slate-200 dark:border-slate-800 shadow-xs`}>
          {/* Calendar Month Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">
                October 2026
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 pt-2">
            {calendarDays.map((dateStr, idx) => {
              if (!dateStr) {
                return <div key={`empty-${idx}`} className="h-16 sm:h-20 rounded p-1 bg-transparent" />;
              }

              const dayNum = parseInt(dateStr.split('-')[2], 10);
              const dayEvents = getEventsForDay(dateStr);
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === '2026-10-21';

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`h-16 sm:h-20 p-1.5 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold tabular-nums ${
                      isToday
                        ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Event indicators */}
                  <div className="space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className={`text-[9px] px-1 py-0.5 rounded truncate font-medium ${
                          ev.category === 'holiday'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : ev.category === 'assignment'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : ev.category === 'exam'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-slate-400 pl-1">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Day Inspector (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className={`p-5 border bg-white dark:bg-slate-900 ${config.borderRadius} border-slate-200 dark:border-slate-800 shadow-xs sticky top-4`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-xs text-slate-400 font-mono">Schedule Inspector</span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {selectedDate === '2026-10-21' ? 'Wednesday, Oct 21 (Today)' : selectedDate}
                </h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300">
                {selectedDateEvents.length} Events
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {selectedDateEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      ev.category === 'assignment'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    }`}>
                      {ev.category}
                    </span>
                    {ev.time && (
                      <span className="font-mono text-slate-500 text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {ev.time}
                      </span>
                    )}
                  </div>

                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {ev.title}
                  </div>

                  {ev.subjectCode && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      Subject: {ev.subjectCode}
                    </div>
                  )}
                </div>
              ))}

              {selectedDateEvents.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  No classes or events scheduled on this date.
                </div>
              )}

              {/* Holiday Notice & Conflict detection banner */}
              <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Conflict Detection Active</span>
                </div>
                <p className="text-[11px] mt-1 text-amber-700/90 dark:text-amber-300/90">
                  When university holidays overlap with scheduled classes, oggytrack prompts whether to cancel, retain, or reschedule sessions without silent data loss.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

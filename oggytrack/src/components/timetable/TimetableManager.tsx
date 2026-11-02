import React, { useState } from 'react';
import { 
  TimetableEntry, 
  Subject, 
  DayOfWeek, 
  ClassType, 
  AppSettings 
} from '../../types/oggytrack';
import { isTimeOverlap } from '../../utils/timetableParser';
import { getDayOfWeekFromDate, useLiveClock } from '../../utils/dateUtils';
import { ColorSwatchPicker } from '../common/ColorSwatchPicker';
import { ModalShell } from '../common/ModalShell';
import { 
  Clock, 
  MapPin, 
  User, 
  Plus, 
  UploadCloud, 
  Edit3, 
  Trash2, 
  Copy, 
  AlertTriangle
} from 'lucide-react';

interface TimetableManagerProps {
  userId?: string;
  timetable: TimetableEntry[];
  subjects: Subject[];
  settings: AppSettings;
  onSaveEntry: (entry: TimetableEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onOpenImportModal: () => void;
}

export const TimetableManager: React.FC<TimetableManagerProps> = ({
  userId = 'usr_student',
  timetable,
  subjects,
  onSaveEntry,
  onDeleteEntry,
  onOpenImportModal,
}) => {
  const allDays: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hasSaturday = timetable.some((t) => t.day === 'Saturday');
  const hasSunday = timetable.some((t) => t.day === 'Sunday');
  const days: DayOfWeek[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    ...(hasSaturday ? (['Saturday'] as DayOfWeek[]) : []),
    ...(hasSunday ? (['Sunday'] as DayOfWeek[]) : []),
  ];
  const now = useLiveClock(30000);
  const currentWeekday = getDayOfWeekFromDate(now);
  const initialDay: DayOfWeek = days.includes(currentWeekday) ? currentWeekday : 'Monday';

  const [activeView, setActiveView] = useState<'week' | 'day' | 'agenda'>('week');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(initialDay);
  const [selectedClass, setSelectedClass] = useState<TimetableEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<Partial<TimetableEntry> | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const filteredTimetable = timetable.filter((entry) => {
    if (subjectFilter !== 'all' && entry.subjectId !== subjectFilter) return false;
    return true;
  });

  const handleOpenAdd = () => {
    const defaultSub = subjects[0] || { id: `sub_${Date.now()}`, name: '', code: '', color: '#10b981', faculty: '', room: '', userId };
    setEditingEntry({
      id: `tt_${Date.now()}`,
      userId: defaultSub.userId || userId,
      subjectId: defaultSub.id,
      subjectName: defaultSub.name,
      code: defaultSub.code,
      day: selectedDay,
      startTime: '09:30',
      endTime: '10:45',
      room: defaultSub.room || 'Room 101',
      faculty: defaultSub.faculty || 'Professor',
      type: 'Lecture',
      color: defaultSub.color,
      recurrence: 'weekly',
    });
    setConflictWarning(null);
  };

  const handleSubjectChange = (subId: string) => {
    const sub = subjects.find((s) => s.id === subId);
    if (!sub || !editingEntry) return;
    setEditingEntry({
      ...editingEntry,
      subjectId: sub.id,
      subjectName: sub.name,
      code: sub.code,
      color: sub.color,
      faculty: sub.faculty || editingEntry.faculty,
      room: sub.room || editingEntry.room,
    });
  };

  const handleTimeChange = (start: string, end: string, day: DayOfWeek) => {
    if (!editingEntry) return;
    setEditingEntry({
      ...editingEntry,
      startTime: start,
      endTime: end,
      day,
    });

    // Check for conflict
    const conflict = timetable.find((ex) => 
      ex.id !== editingEntry.id && 
      ex.day === day && 
      isTimeOverlap(ex.startTime, ex.endTime, start, end)
    );

    if (conflict) {
      setConflictWarning(`⚠️ Overlaps with ${conflict.code} (${conflict.startTime}-${conflict.endTime}) in ${conflict.room}.`);
    } else {
      setConflictWarning(null);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || !editingEntry.code || !editingEntry.subjectName) return;

    onSaveEntry(editingEntry as TimetableEntry);
    setEditingEntry(null);
    setSelectedClass(null);
  };

  const handleDuplicate = (entry: TimetableEntry) => {
    const duplicated: TimetableEntry = {
      ...entry,
      id: `tt_${Date.now()}`,
      day: entry.day === 'Monday' ? 'Wednesday' : entry.day === 'Wednesday' ? 'Friday' : 'Monday',
    };
    onSaveEntry(duplicated);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Academic Timetable
            </h1>
            <span className="text-sm text-white/60 tabular-nums">
              · {filteredTimetable.length} {filteredTimetable.length === 1 ? 'session' : 'sessions'}
            </span>
          </div>
          <p className="text-sm text-white/60 mt-1">
            Weekly class schedule, classroom locations, and conflict detection
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
            {(['week', 'day', 'agenda'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`px-3 py-1.5 font-semibold capitalize rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === view
                    ? 'bg-accent-500 text-accent-ink font-bold shadow-xs'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {view}
              </button>
            ))}
          </div>

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            aria-label="Filter timetable by subject"
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl glass-input cursor-pointer"
          >
            <option value="all" className="bg-[#0d1320] text-white">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#0d1320] text-white">
                {s.code} - {s.name}
              </option>
            ))}
          </select>

          {/* Import Timetable */}
          <button
            type="button"
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-accent-400" />
            <span>Import</span>
          </button>

          {/* Add Class */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink shadow-lg shadow-accent-950/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {/* Week Day Selector (if in day view) */}
      {activeView === 'day' && (
        <div className="flex items-center gap-2 overflow-x-auto p-2 rounded-2xl glass-card">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDay(d)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedDay === d
                  ? 'bg-accent-500 text-accent-ink font-bold'
                  : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {d} {d === currentWeekday && '· Today'}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      {activeView === 'week' ? (
        <div className="glass-card p-6 rounded-2xl overflow-x-auto">
          <div
            className={`min-w-[850px] grid gap-3 ${
              days.length === 7 ? 'grid-cols-7' : days.length === 6 ? 'grid-cols-6' : 'grid-cols-5'
            }`}
          >
            {days.map((day) => {
              const dayClasses = filteredTimetable
                .filter((c) => c.day === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              const isToday = day === currentWeekday;

              return (
                <div
                  key={day}
                  className={`rounded-xl p-3.5 flex flex-col min-h-[460px] border transition-colors ${
                    isToday
                      ? 'bg-emerald-500/[0.05] border-emerald-500/30'
                      : 'bg-white/[0.02] border-white/[0.06]'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/[0.08]">
                    <span className="font-bold text-xs text-white">{day}</span>
                    {isToday ? (
                      <span className="text-xs font-semibold text-emerald-400">
                        Today
                      </span>
                    ) : (
                      <span className="text-[11px] text-white/50 font-mono tabular-nums">
                        {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                      </span>
                    )}
                  </div>

                  {/* Classes List */}
                  <div className="space-y-2.5 flex-1">
                    {dayClasses.map((cls) => (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => setSelectedClass(cls)}
                        className="w-full p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-emerald-400/40 transition-colors cursor-pointer group text-left"
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cls.color || '#10b981' }}
                            />
                            <span
                              className="font-mono font-bold text-xs truncate"
                              style={{ color: cls.color || '#10b981' }}
                            >
                              {cls.code}
                            </span>
                          </div>
                          <span className="text-[11px] text-white/60 shrink-0">
                            {cls.type}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">
                          {cls.subjectName}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-white/60 font-mono tabular-nums mt-1.5">
                          <Clock className="w-3 h-3 text-white/40 shrink-0" />
                          <span>{cls.startTime} - {cls.endTime}</span>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-white/50 mt-1 truncate">
                          <MapPin className="w-3 h-3 text-white/40 shrink-0" />
                          <span className="truncate">{cls.room}</span>
                        </div>
                      </button>
                    ))}

                    {dayClasses.length === 0 && (
                      <div className="h-full flex items-center justify-center p-4 text-center text-xs text-white/50">
                        No scheduled classes
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeView === 'day' ? (
        <div className="glass-card p-6 rounded-2xl divide-y divide-white/[0.08]">
          {filteredTimetable
            .filter((c) => c.day === selectedDay)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((cls) => (
              <div
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cls.color || '#10b981' }}
                    />
                    <span className="font-mono font-bold text-white">{cls.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>{cls.type}</span>
                  </div>
                  <h3 className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                    {cls.subjectName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                    <span className="font-mono tabular-nums text-white/80">
                      {cls.startTime} - {cls.endTime}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{cls.room}</span>
                    <span aria-hidden="true">·</span>
                    <span>{cls.faculty}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingEntry({ ...cls });
                    }}
                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-white/70 hover:text-white cursor-pointer"
                    title="Edit class"
                    aria-label={`Edit ${cls.code}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteEntry(cls.id);
                    }}
                    className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 cursor-pointer"
                    title="Delete class"
                    aria-label={`Delete ${cls.code}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

          {filteredTimetable.filter((c) => c.day === selectedDay).length === 0 && (
            <div className="py-12 text-center text-xs text-white/60">
              No classes scheduled for {selectedDay}.
            </div>
          )}
        </div>
      ) : (
        /* Agenda View */
        <div className="glass-card p-6 rounded-2xl space-y-6">
          {days.map((d) => {
            const dayClasses = filteredTimetable
              .filter((c) => c.day === d)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <div key={d} className="space-y-2">
                <div className="text-sm font-bold text-emerald-400 flex items-center justify-between pb-1.5 border-b border-white/[0.08]">
                  <span>{d}</span>
                  <span className="text-white/60 font-mono tabular-nums text-xs font-normal">
                    {dayClasses.length} {dayClasses.length === 1 ? 'session' : 'sessions'}
                  </span>
                </div>

                <div className="divide-y divide-white/[0.06]">
                  {dayClasses.map((cls) => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClass(cls)}
                      className="w-full py-2.5 flex items-center justify-between text-xs hover:text-emerald-300 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono tabular-nums font-semibold text-white/70 w-28">
                          {cls.startTime} - {cls.endTime}
                        </span>
                        <span className="font-mono font-bold text-white">{cls.code}</span>
                        <span className="text-white/80">{cls.subjectName}</span>
                      </div>
                      <div className="text-white/60">{cls.room}</div>
                    </button>
                  ))}

                  {dayClasses.length === 0 && (
                    <div className="text-xs text-white/50 py-2">No scheduled classes</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Class Details Modal */}
      {selectedClass && !editingEntry && (
        <ModalShell
          title={selectedClass.subjectName}
          subtitle={`${selectedClass.code} · ${selectedClass.type}`}
          onClose={() => setSelectedClass(null)}
          maxWidthClass="max-w-md"
        >
          <div className="space-y-4">
            <div className="space-y-2.5 text-xs text-white/80">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Every {selectedClass.day} from <strong className="text-white tabular-nums">{selectedClass.startTime}</strong> to <strong className="text-white tabular-nums">{selectedClass.endTime}</strong></span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Classroom: <strong className="text-white">{selectedClass.room}</strong></span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <User className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instructor: <strong className="text-white">{selectedClass.faculty}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => handleDuplicate(selectedClass)}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingEntry({ ...selectedClass })}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEntry(selectedClass.id);
                  setSelectedClass(null);
                }}
                className="p-2.5 text-xs font-medium rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                aria-label="Delete class"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Add / Edit Class Modal */}
      {editingEntry && (
        <ModalShell
          title={timetable.some((c) => c.id === editingEntry.id) ? 'Edit Class Session' : 'Add New Class Session'}
          subtitle="Schedule a recurring lecture, lab, or tutorial slot."
          onClose={() => setEditingEntry(null)}
          maxWidthClass="max-w-lg"
        >
          <form onSubmit={handleSaveForm} className="space-y-4">
            {conflictWarning && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{conflictWarning}</span>
              </div>
            )}

            {subjects.length > 0 ? (
              <div>
                <label htmlFor="tt-subject-select" className="block text-xs font-medium text-white/60 mb-1.5">
                  Select Subject
                </label>
                <select
                  id="tt-subject-select"
                  value={editingEntry.subjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#0d1320] text-white">
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-1">
                  <label htmlFor="tt-custom-code" className="block text-xs font-medium text-white/60 mb-1.5">
                    Course Code
                  </label>
                  <input
                    id="tt-custom-code"
                    type="text"
                    required
                    placeholder="CS301"
                    value={editingEntry.code || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input font-mono uppercase"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="tt-custom-name" className="block text-xs font-medium text-white/60 mb-1.5">
                    Subject Name
                  </label>
                  <input
                    id="tt-custom-name"
                    type="text"
                    required
                    placeholder="Algorithms & Complexity"
                    value={editingEntry.subjectName || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, subjectName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="tt-day-select" className="block text-xs font-medium text-white/60 mb-1.5">
                  Day of Week
                </label>
                <select
                  id="tt-day-select"
                  value={editingEntry.day}
                  onChange={(e) => handleTimeChange(editingEntry.startTime || '09:30', editingEntry.endTime || '10:45', e.target.value as DayOfWeek)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input"
                >
                  {allDays.map((d) => (
                    <option key={d} value={d} className="bg-[#0d1320] text-white">{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="tt-type-select" className="block text-xs font-medium text-white/60 mb-1.5">
                  Class Type
                </label>
                <select
                  id="tt-type-select"
                  value={editingEntry.type}
                  onChange={(e) => setEditingEntry({ ...editingEntry, type: e.target.value as ClassType })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input"
                >
                  {(['Lecture', 'Lab', 'Tutorial', 'Seminar', 'Workshop', 'Custom'] as ClassType[]).map((t) => (
                    <option key={t} value={t} className="bg-[#0d1320] text-white">{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="tt-start-time" className="block text-xs font-medium text-white/60 mb-1.5">
                  Start Time
                </label>
                <input
                  id="tt-start-time"
                  type="time"
                  required
                  value={editingEntry.startTime || '09:30'}
                  onChange={(e) => handleTimeChange(e.target.value, editingEntry.endTime || '10:45', editingEntry.day || selectedDay)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="tt-end-time" className="block text-xs font-medium text-white/60 mb-1.5">
                  End Time
                </label>
                <input
                  id="tt-end-time"
                  type="time"
                  required
                  value={editingEntry.endTime || '10:45'}
                  onChange={(e) => handleTimeChange(editingEntry.startTime || '09:30', e.target.value, editingEntry.day || selectedDay)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="tt-room-input" className="block text-xs font-medium text-white/60 mb-1.5">
                  Classroom / Location
                </label>
                <input
                  id="tt-room-input"
                  type="text"
                  required
                  value={editingEntry.room || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, room: e.target.value })}
                  placeholder="e.g. Hall B, Turing Wing"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input"
                />
              </div>

              <div>
                <label htmlFor="tt-faculty-input" className="block text-xs font-medium text-white/60 mb-1.5">
                  Instructor / Professor
                </label>
                <input
                  id="tt-faculty-input"
                  type="text"
                  required
                  value={editingEntry.faculty || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, faculty: e.target.value })}
                  placeholder="e.g. Dr. Evelyn Vance"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input"
                />
              </div>
            </div>

            <ColorSwatchPicker
              value={editingEntry.color || '#10b981'}
              onChange={(color) => setEditingEntry({ ...editingEntry, color })}
              label="Session Color Tag"
              compact
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink shadow-lg shadow-accent-950/30 transition-colors cursor-pointer"
              >
                Save Schedule Entry
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
};

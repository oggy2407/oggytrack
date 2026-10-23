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
  const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
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
    const defaultSub = subjects[0] || { id: `sub_${Date.now()}`, name: '', code: '', color: '#a855f7', faculty: '', room: '', userId };
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Academic Timetable
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {filteredTimetable.length} Sessions
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Weekly class schedule, classroom locations, and conflict detection
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
            {(['week', 'day', 'agenda'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-3 py-1 font-semibold capitalize rounded-lg transition-colors ${
                  activeView === view
                    ? 'bg-purple-600/80 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {view}
              </button>
            ))}
          </div>

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-white/5 border border-white/10 text-slate-200 focus:outline-hidden"
          >
            <option value="all" className="bg-slate-900">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900">
                {s.code} - {s.name}
              </option>
            ))}
          </select>

          {/* Import Timetable */}
          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Import</span>
          </button>

          {/* Add Class */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white shadow-lg shadow-purple-600/20 border border-purple-400/40 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {/* Week Day Selector (if in day view) */}
      {activeView === 'day' && (
        <div className="flex items-center gap-2 overflow-x-auto p-2 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDay(d)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                selectedDay === d
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {d} {d === currentWeekday && '· Today'}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      {activeView === 'week' ? (
        <div className="p-4 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-x-auto">
          <div className="min-w-[850px] grid grid-cols-5 gap-3">
            {days.map((day) => {
              const dayClasses = filteredTimetable
                .filter((c) => c.day === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              const isToday = day === currentWeekday;

              return (
                <div
                  key={day}
                  className={`rounded-xl p-3 flex flex-col min-h-[460px] border transition-colors ${
                    isToday
                      ? 'bg-purple-950/20 border-purple-500/30'
                      : 'bg-white/[0.02] border-white/5'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
                    <span className="font-bold text-xs text-white">{day}</span>
                    {isToday ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Today
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                      </span>
                    )}
                  </div>

                  {/* Classes List */}
                  <div className="space-y-2.5 flex-1">
                    {dayClasses.map((cls) => (
                      <div
                        key={cls.id}
                        onClick={() => setSelectedClass(cls)}
                        className="p-3 rounded-xl bg-slate-900/90 border border-white/10 hover:border-purple-400/50 transition-all cursor-pointer group shadow-sm hover:shadow-purple-950/40 relative overflow-hidden text-left"
                      >
                        <div
                          className="absolute top-0 left-0 bottom-0 w-1 rounded-l-xl"
                          style={{ backgroundColor: cls.color || '#a855f7' }}
                        />

                        <div className="pl-1.5">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-mono font-bold text-xs" style={{ color: cls.color || '#a855f7' }}>
                              {cls.code}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                              {cls.type}
                            </span>
                          </div>

                          <div className="text-xs font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                            {cls.subjectName}
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono mt-1.5">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{cls.startTime} - {cls.endTime}</span>
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 truncate">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{cls.room}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {dayClasses.length === 0 && (
                      <div className="h-full flex items-center justify-center p-4 text-center text-xs text-slate-500">
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
        <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 space-y-3">
          {filteredTimetable
            .filter((c) => c.day === selectedDay)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((cls) => (
              <div
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className="w-3 h-12 rounded-full shrink-0"
                    style={{ backgroundColor: cls.color || '#a855f7' }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-white">{cls.code}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300">
                        {cls.type}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-white mt-0.5">{cls.subjectName}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
                      <span className="font-mono text-slate-200">{cls.startTime} - {cls.endTime}</span>
                      <span>{cls.room}</span>
                      <span>{cls.faculty}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingEntry({ ...cls });
                    }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                    title="Edit class"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteEntry(cls.id);
                    }}
                    className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                    title="Delete class"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

          {filteredTimetable.filter((c) => c.day === selectedDay).length === 0 && (
            <div className="py-12 text-center text-xs text-slate-500">
              No classes scheduled for {selectedDay}.
            </div>
          )}
        </div>
      ) : (
        /* Agenda View */
        <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 space-y-6">
          {days.map((d) => {
            const dayClasses = filteredTimetable.filter((c) => c.day === d);
            return (
              <div key={d} className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center justify-between pb-1 border-b border-white/10">
                  <span>{d}</span>
                  <span className="text-slate-500 font-mono text-[11px]">{dayClasses.length} sessions</span>
                </div>

                <div className="space-y-1.5">
                  {dayClasses.map((cls) => (
                    <div
                      key={cls.id}
                      onClick={() => setSelectedClass(cls)}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs hover:border-purple-400/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-slate-300 w-24">
                          {cls.startTime} - {cls.endTime}
                        </span>
                        <span className="font-mono font-bold text-white">{cls.code}</span>
                        <span className="text-slate-300">{cls.subjectName}</span>
                      </div>
                      <div className="text-slate-400">{cls.room}</div>
                    </div>
                  ))}

                  {dayClasses.length === 0 && (
                    <div className="text-xs text-slate-500 py-2">No scheduled classes</div>
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
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Every {selectedClass.day} from <strong>{selectedClass.startTime}</strong> to <strong>{selectedClass.endTime}</strong></span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                <MapPin className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Classroom: <strong>{selectedClass.room}</strong></span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                <User className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Instructor: <strong>{selectedClass.faculty}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => handleDuplicate(selectedClass)}
                className="flex-1 py-2.5 text-xs font-medium rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingEntry({ ...selectedClass })}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-1.5 cursor-pointer"
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
                <label htmlFor="tt-subject-select" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Select Subject
                </label>
                <select
                  id="tt-subject-select"
                  value={editingEntry.subjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-hidden focus:border-purple-400"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-1">
                  <label htmlFor="tt-custom-code" className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Course Code
                  </label>
                  <input
                    id="tt-custom-code"
                    type="text"
                    required
                    placeholder="CS301"
                    value={editingEntry.code || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white font-mono uppercase focus:outline-hidden focus:border-purple-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="tt-custom-name" className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Subject Name
                  </label>
                  <input
                    id="tt-custom-name"
                    type="text"
                    required
                    placeholder="Algorithms & Complexity"
                    value={editingEntry.subjectName || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, subjectName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white focus:outline-hidden focus:border-purple-400"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="tt-day-select" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Day of Week
                </label>
                <select
                  id="tt-day-select"
                  value={editingEntry.day}
                  onChange={(e) => handleTimeChange(editingEntry.startTime || '09:30', editingEntry.endTime || '10:45', e.target.value as DayOfWeek)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-hidden focus:border-purple-400"
                >
                  {days.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="tt-type-select" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Class Type
                </label>
                <select
                  id="tt-type-select"
                  value={editingEntry.type}
                  onChange={(e) => setEditingEntry({ ...editingEntry, type: e.target.value as ClassType })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-hidden focus:border-purple-400"
                >
                  {(['Lecture', 'Lab', 'Tutorial', 'Seminar', 'Workshop', 'Custom'] as ClassType[]).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="tt-start-time" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Start Time
                </label>
                <input
                  id="tt-start-time"
                  type="time"
                  required
                  value={editingEntry.startTime || '09:30'}
                  onChange={(e) => handleTimeChange(e.target.value, editingEntry.endTime || '10:45', editingEntry.day || selectedDay)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white tabular-nums focus:outline-hidden focus:border-purple-400"
                />
              </div>

              <div>
                <label htmlFor="tt-end-time" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  End Time
                </label>
                <input
                  id="tt-end-time"
                  type="time"
                  required
                  value={editingEntry.endTime || '10:45'}
                  onChange={(e) => handleTimeChange(editingEntry.startTime || '09:30', e.target.value, editingEntry.day || selectedDay)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white tabular-nums focus:outline-hidden focus:border-purple-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="tt-room-input" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Classroom / Location
                </label>
                <input
                  id="tt-room-input"
                  type="text"
                  required
                  value={editingEntry.room || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, room: e.target.value })}
                  placeholder="e.g. Hall B, Turing Wing"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white focus:outline-hidden focus:border-purple-400"
                />
              </div>

              <div>
                <label htmlFor="tt-faculty-input" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Instructor / Professor
                </label>
                <input
                  id="tt-faculty-input"
                  type="text"
                  required
                  value={editingEntry.faculty || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, faculty: e.target.value })}
                  placeholder="e.g. Dr. Evelyn Vance"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white focus:outline-hidden focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-colors cursor-pointer"
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

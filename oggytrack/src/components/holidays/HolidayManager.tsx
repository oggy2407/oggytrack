import React, { useState } from 'react';
import { Holiday, TimetableEntry, HolidayType } from '../../types/oggytrack';
import { formatDateISO, formatReadableISO, getDaysDifference, useLiveClock } from '../../utils/dateUtils';
import { ModalShell } from '../common/ModalShell';
import { 
  Palmtree, 
  Plus, 
  AlertTriangle, 
  Trash2, 
  Edit3
} from 'lucide-react';

interface HolidayManagerProps {
  userId?: string;
  holidays: Holiday[];
  timetable: TimetableEntry[];
  onSaveHoliday: (holiday: Holiday) => void;
  onDeleteHoliday: (id: string) => void;
}

export const HolidayManager: React.FC<HolidayManagerProps> = ({
  userId = 'usr_student',
  holidays,
  onSaveHoliday,
  onDeleteHoliday,
}) => {
  const now = useLiveClock(30000);
  const todayISO = formatDateISO(now);
  const [editingHoliday, setEditingHoliday] = useState<Partial<Holiday> | null>(null);

  const handleOpenAdd = () => {
    const liveToday = formatDateISO(new Date());
    setEditingHoliday({
      id: `hol_${Date.now()}`,
      userId,
      title: '',
      startDate: liveToday,
      endDate: liveToday,
      type: 'National',
      description: '',
      cancelsClasses: true,
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday || !editingHoliday.title?.trim()) return;
    const start = editingHoliday.startDate || todayISO;
    const end = editingHoliday.endDate && editingHoliday.endDate >= start ? editingHoliday.endDate : start;
    onSaveHoliday({
      ...(editingHoliday as Holiday),
      title: editingHoliday.title.trim(),
      startDate: start,
      endDate: end,
    });
    setEditingHoliday(null);
  };

  const sortedHolidays = [...holidays].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const isEditingExisting = editingHoliday ? holidays.some((h) => h.id === editingHoliday.id) : false;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Academic Holidays & Recess
            </h1>
            <span className="text-xs text-slate-400 tabular-nums">
              · {holidays.length} {holidays.length === 1 ? 'Event' : 'Events'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage national holidays, institutional breaks, and class schedule suspension
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition-all self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Holiday</span>
        </button>
      </div>

      {/* Conflict Policy Notification Banner */}
      <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200/90 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-white">Schedule Conflict Policy:</strong> When holidays overlap with regular class days, oggytrack never deletes your classes silently. Choose whether each holiday suspends attendance marking or retains optional review sessions.
        </div>
      </div>

      {/* Holidays Grid or Empty State */}
      {sortedHolidays.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedHolidays.map((hol) => {
            const diffDays = getDaysDifference(todayISO, hol.startDate);
            const timingLabel =
              todayISO >= hol.startDate && todayISO <= hol.endDate
                ? 'Ongoing Today'
                : diffDays === 1
                ? 'Tomorrow'
                : diffDays > 1
                ? `In ${diffDays} days`
                : 'Past';

            return (
              <div
                key={hol.id}
                className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 hover:border-purple-500/40 transition-all flex flex-col justify-between shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-purple-300">
                      {hol.type} · {timingLabel}
                    </span>
                    <span className="text-slate-400 font-mono tabular-nums text-[11px]">
                      {hol.startDate === hol.endDate
                        ? formatReadableISO(hol.startDate, false)
                        : `${hol.startDate} → ${hol.endDate}`}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-white mt-1">
                    {hol.title}
                  </h3>

                  {hol.description && (
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {hol.description}
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Classes Suspended</span>
                    <span className={hol.cancelsClasses ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                      {hol.cancelsClasses ? 'Yes (Attendance Protected)' : 'Optional Session'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingHoliday({ ...hol })}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    aria-label={`Edit ${hol.title}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteHoliday(hol.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    aria-label={`Delete ${hol.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-10 text-center rounded-2xl bg-slate-900/50 border border-dashed border-white/15 space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mx-auto">
            <Palmtree className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Holidays Added Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Add upcoming campus breaks, festival holidays, or exam study leaves so they appear on your calendar and dashboard countdown.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Holiday</span>
          </button>
        </div>
      )}

      {/* Add / Edit Holiday Modal rendered via Portal so it is never clipped */}
      {editingHoliday && (
        <ModalShell
          title={isEditingExisting ? 'Edit Academic Holiday' : 'Add Academic Holiday'}
          subtitle="Enter the holiday name, dates, and class suspension rule below."
          onClose={() => setEditingHoliday(null)}
          maxWidthClass="max-w-md"
        >
          <form onSubmit={handleSaveForm} className="space-y-4">
            <div>
              <label htmlFor="holiday-title-input" className="block text-xs font-semibold text-slate-200 mb-1.5">
                Holiday / Recess Name
              </label>
              <input
                id="holiday-title-input"
                type="text"
                required
                autoFocus
                placeholder="e.g. Diwali Break or Mid-Semester Recess"
                value={editingHoliday.title || ''}
                onChange={(e) => setEditingHoliday({ ...editingHoliday, title: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="holiday-start-date" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Start Date
                </label>
                <input
                  id="holiday-start-date"
                  type="date"
                  required
                  value={editingHoliday.startDate || todayISO}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    const nextEnd =
                      editingHoliday.endDate && editingHoliday.endDate >= nextStart
                        ? editingHoliday.endDate
                        : nextStart;
                    setEditingHoliday({ ...editingHoliday, startDate: nextStart, endDate: nextEnd });
                  }}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white tabular-nums focus:outline-hidden focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                />
              </div>

              <div>
                <label htmlFor="holiday-end-date" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  End Date
                </label>
                <input
                  id="holiday-end-date"
                  type="date"
                  required
                  min={editingHoliday.startDate || todayISO}
                  value={editingHoliday.endDate || editingHoliday.startDate || todayISO}
                  onChange={(e) => setEditingHoliday({ ...editingHoliday, endDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white tabular-nums focus:outline-hidden focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="holiday-category-select" className="block text-xs font-semibold text-slate-200 mb-1.5">
                Category
              </label>
              <select
                id="holiday-category-select"
                value={editingHoliday.type || 'National'}
                onChange={(e) => setEditingHoliday({ ...editingHoliday, type: e.target.value as HolidayType })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-hidden focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
              >
                <option value="National">National Holiday</option>
                <option value="Institutional">Institutional Break</option>
                <option value="Semester Break">Semester Break</option>
                <option value="Exam Preparation">Exam Preparation Study Leave</option>
                <option value="Personal">Personal Day Off</option>
              </select>
            </div>

            <div>
              <label htmlFor="holiday-notes-input" className="block text-xs font-semibold text-slate-200 mb-1.5">
                Description / Notes <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <textarea
                id="holiday-notes-input"
                rows={2}
                value={editingHoliday.description || ''}
                onChange={(e) => setEditingHoliday({ ...editingHoliday, description: e.target.value })}
                placeholder="Details or university circular note..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
              />
            </div>

            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white/5 border border-white/10">
              <input
                type="checkbox"
                id="cancelsClassesCheck"
                checked={Boolean(editingHoliday.cancelsClasses)}
                onChange={(e) => setEditingHoliday({ ...editingHoliday, cancelsClasses: e.target.checked })}
                className="mt-0.5 w-4 h-4 accent-purple-600 rounded cursor-pointer shrink-0"
              />
              <label htmlFor="cancelsClassesCheck" className="text-xs text-slate-200 leading-relaxed cursor-pointer">
                Automatically suspend scheduled classes during this holiday
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingHoliday(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-colors cursor-pointer"
              >
                {isEditingExisting ? 'Update Holiday' : 'Save Holiday'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
};

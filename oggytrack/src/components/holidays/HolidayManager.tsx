import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Holiday, TimetableEntry, HolidayType } from '../../types/oggytrack';
import { formatDateISO, formatReadableISO, getDaysDifference, useLiveClock } from '../../utils/dateUtils';
import { ModalShell } from '../common/ModalShell';
import {
  Palmtree,
  Plus,
  AlertTriangle,
  Trash2,
  Edit3,
  ScanLine,
  ArrowUpRight,
} from 'lucide-react';

interface HolidayManagerProps {
  userId?: string;
  holidays: Holiday[];
  timetable: TimetableEntry[];
  onSaveHoliday: (holiday: Holiday) => void;
  onDeleteHoliday: (id: string) => void;
  onOpenScanModal?: () => void;
}

export const HolidayManager: React.FC<HolidayManagerProps> = ({
  userId = 'usr_student',
  holidays,
  onSaveHoliday,
  onDeleteHoliday,
  onOpenScanModal,
}) => {
  const now = useLiveClock(30000);
  const todayISO = formatDateISO(now);
  const [editingHoliday, setEditingHoliday] = useState<Partial<Holiday> | null>(null);
  const shouldReduceMotion = useReducedMotion();

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
    const end =
      editingHoliday.endDate && editingHoliday.endDate >= start
        ? editingHoliday.endDate
        : start;
    onSaveHoliday({
      ...(editingHoliday as Holiday),
      title: editingHoliday.title.trim(),
      startDate: start,
      endDate: end,
    });
    setEditingHoliday(null);
  };

  const sortedHolidays = [...holidays].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const isEditingExisting = editingHoliday
    ? holidays.some((h) => h.id === editingHoliday.id)
    : false;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Academic Holidays & Recess
            </h1>
            <span className="text-sm text-accent-400 font-medium tabular-nums">
              · {holidays.length} {holidays.length === 1 ? 'Event' : 'Events'}
            </span>
          </div>
          <p className="text-sm text-white/60 mt-1">
            Manage national holidays, institutional breaks, and class schedule suspension
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
          {onOpenScanModal && (
            <button
              type="button"
              onClick={onOpenScanModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-accent-500/35 bg-accent-500/12 hover:bg-accent-500/20 text-accent-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ScanLine className="w-3.5 h-3.5 text-accent-400" />
              <span>Scan Holidays</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink shadow-lg shadow-accent-950/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Holiday</span>
          </button>
        </div>
      </div>

      {/* Conflict Policy Notification Banner */}
      <div className="glass-card p-4 rounded-2xl text-xs text-white/75 flex items-start gap-3">
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
              <motion.div
                key={hol.id}
                whileHover={shouldReduceMotion ? undefined : { y: -5 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card p-6 rounded-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm text-white/60">
                        {hol.type} · {timingLabel}
                      </p>
                      <h3 className="text-xl font-bold text-white leading-snug">
                        {hol.title}
                      </h3>
                      <p className="flex items-center gap-1 text-sm text-accent-400 tabular-nums">
                        <ArrowUpRight size={16} className="shrink-0" />
                        <span>
                          {hol.startDate === hol.endDate
                            ? formatReadableISO(hol.startDate, false)
                            : `${hol.startDate} → ${hol.endDate}`}
                        </span>
                      </p>
                    </div>

                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-black/25">
                      <Palmtree size={20} />
                    </div>
                  </div>

                  {hol.description && (
                    <p className="text-xs text-white/60 mt-3 leading-relaxed">
                      {hol.description}
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-white/60">
                    <span>Classes Suspended</span>
                    <span
                      className={
                        hol.cancelsClasses ? 'text-emerald-400 font-semibold' : 'text-white/60'
                      }
                    >
                      {hol.cancelsClasses ? 'Yes · Attendance Protected' : 'Optional Session'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setEditingHoliday({ ...hol })}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    aria-label={`Edit ${hol.title}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteHoliday(hol.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    aria-label={`Delete ${hol.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card p-10 text-center rounded-2xl space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center mx-auto shadow-lg">
            <Palmtree className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Holidays Added Yet</h3>
            <p className="text-xs text-white/60 max-w-sm mx-auto leading-relaxed">
              Scan an academic holiday circular, PDF, screenshot, or spreadsheet — or add upcoming breaks manually so they protect your attendance and update your calendar.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {onOpenScanModal && (
              <button
                type="button"
                onClick={onOpenScanModal}
                className="px-4 py-2.5 rounded-xl border border-accent-500/35 bg-accent-500/12 hover:bg-accent-500/20 text-accent-300 hover:text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ScanLine className="w-4 h-4 text-accent-400" />
                <span>Scan Holiday List</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink font-bold text-xs shadow-lg shadow-accent-950/40 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Holiday</span>
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Holiday Modal */}
      {editingHoliday && (
        <ModalShell
          title={isEditingExisting ? 'Edit Academic Holiday' : 'Add Academic Holiday'}
          subtitle="Enter the holiday name, dates, and class suspension rule below."
          onClose={() => setEditingHoliday(null)}
          maxWidthClass="max-w-md"
        >
          <form onSubmit={handleSaveForm} className="space-y-4">
            <div>
              <label
                htmlFor="holiday-title-input"
                className="block text-xs font-semibold text-white/80 mb-1.5"
              >
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
                className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl placeholder-white/35"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="holiday-start-date"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
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
                    setEditingHoliday({
                      ...editingHoliday,
                      startDate: nextStart,
                      endDate: nextEnd,
                    });
                  }}
                  className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="holiday-end-date"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  End Date
                </label>
                <input
                  id="holiday-end-date"
                  type="date"
                  required
                  min={editingHoliday.startDate || todayISO}
                  value={editingHoliday.endDate || editingHoliday.startDate || todayISO}
                  onChange={(e) =>
                    setEditingHoliday({ ...editingHoliday, endDate: e.target.value })
                  }
                  className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl tabular-nums"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="holiday-category-select"
                className="block text-xs font-semibold text-white/80 mb-1.5"
              >
                Category
              </label>
              <select
                id="holiday-category-select"
                value={editingHoliday.type || 'National'}
                onChange={(e) =>
                  setEditingHoliday({ ...editingHoliday, type: e.target.value as HolidayType })
                }
                className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#090d16]"
              >
                <option value="National" className="bg-[#090d16]">National Holiday</option>
                <option value="Institutional" className="bg-[#090d16]">Institutional Break</option>
                <option value="Semester Break" className="bg-[#090d16]">Semester Break</option>
                <option value="Exam Preparation" className="bg-[#090d16]">Exam Preparation Study Leave</option>
                <option value="Personal" className="bg-[#090d16]">Personal Day Off</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="holiday-notes-input"
                className="block text-xs font-semibold text-white/80 mb-1.5"
              >
                Description / Notes <span className="text-white/40 font-normal">(optional)</span>
              </label>
              <textarea
                id="holiday-notes-input"
                rows={2}
                value={editingHoliday.description || ''}
                onChange={(e) =>
                  setEditingHoliday({ ...editingHoliday, description: e.target.value })
                }
                placeholder="Details or university circular note..."
                className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl placeholder-white/35"
              />
            </div>

            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <input
                type="checkbox"
                id="cancelsClassesCheck"
                checked={Boolean(editingHoliday.cancelsClasses)}
                onChange={(e) =>
                  setEditingHoliday({ ...editingHoliday, cancelsClasses: e.target.checked })
                }
                className="mt-0.5 w-4 h-4 accent-accent-500 rounded cursor-pointer shrink-0"
              />
              <label
                htmlFor="cancelsClassesCheck"
                className="text-xs text-white/80 leading-relaxed cursor-pointer"
              >
                Automatically suspend scheduled classes during this holiday
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setEditingHoliday(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink transition-colors cursor-pointer"
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

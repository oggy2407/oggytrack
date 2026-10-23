import React, { useState } from 'react';
import { Subject, AttendanceRecord, Assignment, TimetableEntry } from '../../types/oggytrack';
import { calculateAttendance } from '../../utils/academicCalculations';
import { ModalShell } from '../common/ModalShell';
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  User, 
  MapPin
} from 'lucide-react';

interface SubjectManagerProps {
  userId?: string;
  subjects: Subject[];
  attendance: AttendanceRecord[];
  assignments: Assignment[];
  timetable: TimetableEntry[];
  onSaveSubject: (subject: Subject) => void;
  onDeleteSubject: (id: string) => void;
  onArchiveSubject?: (id: string) => void;
}

export const SubjectManager: React.FC<SubjectManagerProps> = ({
  userId = 'usr_student',
  subjects,
  attendance,
  assignments,
  timetable,
  onSaveSubject,
  onDeleteSubject,
}) => {
  const [editingSubject, setEditingSubject] = useState<Partial<Subject> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setConfirmDeleteId(null);
    setEditingSubject({
      id: `sub_${Date.now()}`,
      userId,
      name: '',
      code: '',
      credits: 3,
      faculty: '',
      room: '',
      color: '#8b5cf6',
      targetAttendance: 75,
      createdAt: new Date().toISOString(),
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editingSubject.name || !editingSubject.code) return;
    onSaveSubject(editingSubject as Subject);
    setEditingSubject(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Subject & Course Directory
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {subjects.length} Courses
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Course details, instructor details, credit hours, and target attendance thresholds
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white shadow-lg shadow-purple-600/20 border border-purple-400/40 transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((sub) => {
          const subRecords = attendance.filter((r) => r.subjectId === sub.id);
          const att = subRecords.filter((r) => r.status === 'present').length;
          const miss = subRecords.filter((r) => r.status === 'absent').length;
          const stats = calculateAttendance(att, miss, sub.targetAttendance);
          const activeTasks = assignments.filter((a) => a.subjectId === sub.id && a.status !== 'completed').length;
          const weeklySessions = timetable.filter((t) => t.subjectId === sub.id).length;

          return (
            <div
              key={sub.id}
              className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 hover:border-purple-500/40 transition-all flex flex-col justify-between shadow-xl relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: sub.color }}
              />

              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-mono font-bold text-sm text-white" style={{ color: sub.color }}>
                    {sub.code}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                    {sub.credits} Credits
                  </span>
                </div>

                <h3 className="font-bold text-base text-white">
                  {sub.name}
                </h3>

                <div className="space-y-1.5 text-xs text-slate-400 mt-3">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="text-slate-300 truncate">{sub.faculty || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="truncate">{sub.room || 'General Lecture Hall'}</span>
                  </div>
                </div>

                {/* Performance Mini Bar */}
                <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Attendance</span>
                    <span className="font-bold tabular-nums text-white">
                      {stats.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, stats.percentage)}%`,
                        backgroundColor: stats.isBelowTarget ? '#f59e0b' : sub.color,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{weeklySessions} weekly sessions</span>
                    <span>{activeTasks} pending tasks</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteId(null);
                    setEditingSubject({ ...sub });
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  aria-label={`Edit ${sub.name}`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                {confirmDeleteId === sub.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteSubject(sub.id);
                      setConfirmDeleteId(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(sub.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    aria-label={`Delete ${sub.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {subjects.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-dashed border-white/10 space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Subjects Added Yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Add your university or college courses to begin tracking your attendance, schedule, and assignments.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Subject</span>
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      {editingSubject && (
        <ModalShell
          title={subjects.some((s) => s.id === editingSubject.id) ? 'Edit Subject Details' : 'Add New Subject'}
          subtitle="Configure course code, name, instructor, classroom, and target attendance."
          onClose={() => setEditingSubject(null)}
          maxWidthClass="max-w-md"
        >
          <form onSubmit={handleSaveForm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-1">
                <label htmlFor="sub-code-input" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Course Code
                </label>
                <input
                  id="sub-code-input"
                  type="text"
                  required
                  autoFocus
                  placeholder="CS301"
                  value={editingSubject.code || ''}
                  onChange={(e) => setEditingSubject({ ...editingSubject, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white font-mono uppercase focus:outline-hidden focus:border-purple-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="sub-name-input" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Subject Name
                </label>
                <input
                  id="sub-name-input"
                  type="text"
                  required
                  placeholder="Algorithms & Complexity"
                  value={editingSubject.name || ''}
                  onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white focus:outline-hidden focus:border-purple-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="sub-credits-input" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Credits
                </label>
                <input
                  id="sub-credits-input"
                  type="number"
                  min="1"
                  max="10"
                  value={editingSubject.credits ?? 3}
                  onChange={(e) => setEditingSubject({ ...editingSubject, credits: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white tabular-nums focus:outline-hidden focus:border-purple-400"
                />
              </div>

              <div>
                <label htmlFor="sub-target-input" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Target Attendance %
                </label>
                <input
                  id="sub-target-input"
                  type="number"
                  min="50"
                  max="100"
                  value={editingSubject.targetAttendance ?? 75}
                  onChange={(e) => setEditingSubject({ ...editingSubject, targetAttendance: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white tabular-nums focus:outline-hidden focus:border-purple-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="sub-faculty-input" className="block text-xs font-semibold text-slate-200 mb-1.5">
                Instructor / Professor
              </label>
              <input
                id="sub-faculty-input"
                type="text"
                placeholder="e.g. Dr. Evelyn Vance"
                value={editingSubject.faculty || ''}
                onChange={(e) => setEditingSubject({ ...editingSubject, faculty: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white focus:outline-hidden focus:border-purple-400"
              />
            </div>

            <div>
              <label htmlFor="sub-room-input" className="block text-xs font-semibold text-slate-200 mb-1.5">
                Default Classroom / Room
              </label>
              <input
                id="sub-room-input"
                type="text"
                placeholder="e.g. Hall B - Turing Wing"
                value={editingSubject.room || ''}
                onChange={(e) => setEditingSubject({ ...editingSubject, room: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white focus:outline-hidden focus:border-purple-400"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-200 mb-1.5">
                Color Tag
              </span>
              <div className="flex items-center gap-2">
                {['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#3b82f6'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Select color ${c}`}
                    onClick={() => setEditingSubject({ ...editingSubject, color: c })}
                    className={`w-7 h-7 rounded-lg border transition-all cursor-pointer ${
                      editingSubject.color === c ? 'border-white scale-110 shadow-md' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              {subjects.some((s) => s.id === editingSubject.id) && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteSubject(editingSubject.id!);
                    setEditingSubject(null);
                  }}
                  className="mr-auto px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  Delete Subject
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditingSubject(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-white/15 bg-white/5 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                Save Subject
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Subject,
  AttendanceRecord,
  Assignment,
  TimetableEntry,
  SubjectExam,
} from '../../types/oggytrack';
import { calculateAttendance, summarizeSubjectExams } from '../../utils/academicCalculations';
import { pickNextSubjectColor } from '../../utils/colorPalette';
import { formatDateISO, formatReadableISO } from '../../utils/dateUtils';
import { ColorSwatchPicker } from '../common/ColorSwatchPicker';
import { ModalShell } from '../common/ModalShell';
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  User,
  MapPin,
  ArrowUpRight,
  GraduationCap,
} from 'lucide-react';

interface SubjectManagerProps {
  userId?: string;
  subjects: Subject[];
  attendance: AttendanceRecord[];
  assignments: Assignment[];
  timetable: TimetableEntry[];
  exams?: SubjectExam[];
  onSaveSubject: (subject: Subject) => void;
  onDeleteSubject: (id: string) => void;
  onOpenSubjectExams?: (subjectId: string, openAddModal?: boolean) => void;
  onArchiveSubject?: (id: string) => void;
}

export const SubjectManager: React.FC<SubjectManagerProps> = ({
  userId = 'usr_student',
  subjects,
  attendance,
  assignments,
  timetable,
  exams = [],
  onSaveSubject,
  onDeleteSubject,
  onOpenSubjectExams,
}) => {
  const [editingSubject, setEditingSubject] = useState<Partial<Subject> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const todayISO = formatDateISO(new Date());

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
      color: pickNextSubjectColor(subjects.map((s) => s.color)),
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Subject & Course Directory
            </h1>
            <span className="text-sm text-accent-400 font-medium tabular-nums">
              · {subjects.length} {subjects.length === 1 ? 'Course' : 'Courses'}
            </span>
          </div>
          <p className="text-sm text-white/60 mt-1">
            Course details, instructor assignments, credit hours, and target attendance thresholds
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink shadow-lg shadow-accent-950/40 transition-colors self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
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
          const activeTasks = assignments.filter(
            (a) => a.subjectId === sub.id && a.status !== 'completed'
          ).length;
          const weeklySessions = timetable.filter((t) => t.subjectId === sub.id).length;
          const subExams = exams.filter((e) => e.subjectId === sub.id);
          const examSummary = summarizeSubjectExams(subExams, todayISO);
          const examEffectivePct = examSummary.weightedPercentage ?? examSummary.averagePercentage;

          return (
            <motion.div
              key={sub.id}
              whileHover={shouldReduceMotion ? undefined : { y: -5 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card p-6 rounded-2xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm text-white/60 font-mono">
                      <span className="font-bold" style={{ color: sub.color }}>
                        {sub.code}
                      </span>{' '}
                      · {sub.credits} Credits
                    </p>
                    <h3 className="text-lg font-bold text-white leading-snug">
                      {sub.name}
                    </h3>
                    <p className="flex items-center gap-1 text-sm text-emerald-400 tabular-nums">
                      <ArrowUpRight size={16} className="shrink-0" />
                      <span>
                        {stats.percentage}% attendance (Target {sub.targetAttendance}%)
                      </span>
                    </p>
                  </div>

                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-black/25"
                    style={{
                      background: `linear-gradient(135deg, ${sub.color}, rgba(15, 23, 42, 0.9))`,
                    }}
                  >
                    <BookOpen size={20} />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-white/60 mt-4">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-white/80 truncate">{sub.faculty || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{sub.room || 'General Lecture Hall'}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-2">
                  <div className="w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, stats.percentage)}%`,
                        backgroundColor: stats.isBelowTarget ? '#f59e0b' : sub.color,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/60 tabular-nums">
                    <span>{weeklySessions} weekly sessions</span>
                    <span>{activeTasks} pending tasks</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/70 tabular-nums pt-1">
                    <span className="inline-flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        {examSummary.totalExams} {examSummary.totalExams === 1 ? 'exam' : 'exams'}
                      </span>
                    </span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {examEffectivePct !== null
                        ? `${examEffectivePct}% avg (${examSummary.totalObtained}/${examSummary.totalMax})`
                        : examSummary.nextExam
                        ? `Next: ${formatReadableISO(examSummary.nextExam.examDate, false)}`
                        : 'No marks yet'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-white/[0.08]">
                {onOpenSubjectExams ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenSubjectExams(sub.id, false)}
                      aria-label={`View exams and marks for ${sub.code}`}
                      className="px-2.5 py-1.5 rounded-xl bg-accent-500/12 hover:bg-accent-500/22 border border-accent-500/30 text-accent-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                      <span>Exams ({examSummary.totalExams})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenSubjectExams(sub.id, true)}
                      aria-label={`Add exam for ${sub.code}`}
                      className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white/80 hover:text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-accent-400 shrink-0" />
                      <span>Exam</span>
                    </button>
                  </div>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteId(null);
                      setEditingSubject({ ...sub });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    aria-label={`Edit ${sub.name}`}
                  >
                    <Edit3 className="w-3.5 h-3.5 shrink-0" />
                    <span>Edit</span>
                  </button>
                  {confirmDeleteId === sub.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteSubject(sub.id);
                        setConfirmDeleteId(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Confirm Delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(sub.id)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 text-white/60 hover:text-rose-400 text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      aria-label={`Delete ${sub.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {subjects.length === 0 && (
        <div className="glass-card p-12 text-center rounded-2xl space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-secondary text-accent-ink flex items-center justify-center mx-auto shadow-lg">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Subjects Added Yet</h3>
            <p className="text-xs text-white/60 mt-1 max-w-sm mx-auto leading-relaxed">
              Add your university or college courses to begin tracking your attendance, schedule, and assignments.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink font-bold text-xs shadow-lg shadow-accent-950/40 inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Subject</span>
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      {editingSubject && (
        <ModalShell
          title={
            subjects.some((s) => s.id === editingSubject.id)
              ? 'Edit Subject Details'
              : 'Add New Subject'
          }
          subtitle="Configure course code, name, instructor, classroom, and target attendance."
          onClose={() => setEditingSubject(null)}
          maxWidthClass="max-w-md"
        >
          <form onSubmit={handleSaveForm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-1">
                <label
                  htmlFor="sub-code-input"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  Course Code
                </label>
                <input
                  id="sub-code-input"
                  type="text"
                  required
                  autoFocus
                  placeholder="CS301"
                  value={editingSubject.code || ''}
                  onChange={(e) =>
                    setEditingSubject({
                      ...editingSubject,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl font-mono uppercase"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="sub-name-input"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  Subject Name
                </label>
                <input
                  id="sub-name-input"
                  type="text"
                  required
                  placeholder="Algorithms & Complexity"
                  value={editingSubject.name || ''}
                  onChange={(e) =>
                    setEditingSubject({ ...editingSubject, name: e.target.value })
                  }
                  className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="sub-credits-input"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  Credits
                </label>
                <input
                  id="sub-credits-input"
                  type="number"
                  min="1"
                  max="10"
                  value={editingSubject.credits ?? 3}
                  onChange={(e) =>
                    setEditingSubject({
                      ...editingSubject,
                      credits: Number(e.target.value),
                    })
                  }
                  className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="sub-target-input"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  Target Attendance %
                </label>
                <input
                  id="sub-target-input"
                  type="number"
                  min="50"
                  max="100"
                  value={editingSubject.targetAttendance ?? 75}
                  onChange={(e) =>
                    setEditingSubject({
                      ...editingSubject,
                      targetAttendance: Number(e.target.value),
                    })
                  }
                  className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl tabular-nums"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="sub-faculty-input"
                className="block text-xs font-semibold text-white/80 mb-1.5"
              >
                Instructor / Professor
              </label>
              <input
                id="sub-faculty-input"
                type="text"
                placeholder="e.g. Dr. Evelyn Vance"
                value={editingSubject.faculty || ''}
                onChange={(e) =>
                  setEditingSubject({ ...editingSubject, faculty: e.target.value })
                }
                className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl"
              />
            </div>

            <div>
              <label
                htmlFor="sub-room-input"
                className="block text-xs font-semibold text-white/80 mb-1.5"
              >
                Default Classroom / Room
              </label>
              <input
                id="sub-room-input"
                type="text"
                placeholder="e.g. Hall B - Turing Wing"
                value={editingSubject.room || ''}
                onChange={(e) =>
                  setEditingSubject({ ...editingSubject, room: e.target.value })
                }
                className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl"
              />
            </div>

            <ColorSwatchPicker
              value={editingSubject.color || '#10b981'}
              onChange={(color) => setEditingSubject({ ...editingSubject, color })}
              label="Course Color Tag"
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
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
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink transition-colors cursor-pointer"
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

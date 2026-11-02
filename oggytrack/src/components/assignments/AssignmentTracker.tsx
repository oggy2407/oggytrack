import React, { useState } from 'react';
import { Assignment, Subject, AssignmentPriority } from '../../types/oggytrack';
import { exportAssignmentsCSV } from '../../utils/csvExport';
import { addDaysISO, formatDateISO, useLiveClock } from '../../utils/dateUtils';
import { ModalShell } from '../common/ModalShell';
import { StatsCard } from '../common/StatsCard';
import {
  Plus,
  Search,
  Check,
  Clock,
  Download,
  Edit3,
  Trash2,
  FileCheck,
  AlertTriangle,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface AssignmentTrackerProps {
  userId?: string;
  assignments: Assignment[];
  subjects: Subject[];
  onSaveAssignment: (assignment: Assignment) => void;
  onDeleteAssignment: (id: string) => void;
  onToggleComplete: (id: string) => void;
}

export const AssignmentTracker: React.FC<AssignmentTrackerProps> = ({
  userId = 'usr_student',
  assignments,
  subjects,
  onSaveAssignment,
  onDeleteAssignment,
  onToggleComplete,
}) => {
  const now = useLiveClock(30000);
  const currentDateStr = formatDateISO(now);

  const [filter, setFilter] = useState<'all' | 'pending' | 'due_today' | 'completed' | 'urgent'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAssignment, setEditingAssignment] = useState<Partial<Assignment> | null>(null);

  const filtered = assignments.filter((a) => {
    if (filter === 'pending' && (a.status === 'completed' || a.status === 'submitted')) return false;
    if (filter === 'due_today' && a.dueDate !== currentDateStr) return false;
    if (filter === 'completed' && a.status !== 'completed' && a.status !== 'submitted') return false;
    if (filter === 'urgent' && a.priority !== 'urgent') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.subjectCode.toLowerCase().includes(q) ||
        a.subjectName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    const liveToday = formatDateISO(new Date());
    const defaultSub = subjects[0] || { id: 'sub_general', code: 'GEN101', name: 'General Coursework' };
    setEditingAssignment({
      id: `asg_${Date.now()}`,
      userId,
      subjectId: defaultSub.id,
      subjectCode: defaultSub.code,
      subjectName: defaultSub.name,
      title: '',
      description: '',
      dueDate: addDaysISO(liveToday, 3),
      dueTime: '23:59',
      priority: 'high',
      status: 'not_started',
      type: 'Homework',
      completionPercent: 0,
      createdAt: new Date().toISOString(),
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment || !editingAssignment.title?.trim()) return;
    onSaveAssignment({
      ...(editingAssignment as Assignment),
      title: editingAssignment.title.trim(),
    });
    setEditingAssignment(null);
  };

  const handleSubjectSelect = (subId: string) => {
    const sub = subjects.find((s) => s.id === subId);
    if (!sub || !editingAssignment) return;
    setEditingAssignment({
      ...editingAssignment,
      subjectId: sub.id,
      subjectCode: sub.code,
      subjectName: sub.name,
    });
  };

  const completedCount = assignments.filter(
    (a) => a.status === 'completed' || a.status === 'submitted'
  ).length;
  const pendingCount = assignments.length - completedCount;
  const dueTodayCount = assignments.filter(
    (a) => a.dueDate === currentDateStr && a.status !== 'completed' && a.status !== 'submitted'
  ).length;
  const completionPct =
    assignments.length > 0 ? Math.round((completedCount / assignments.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Assignments & Deliverables
            </h1>
            <span className="text-sm text-accent-400 font-medium tabular-nums">
              · {pendingCount} Pending
            </span>
          </div>
          <p className="text-sm text-white/60 mt-1">
            Track coursework deadlines, problem sets, lab reports, and exam milestones
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => exportAssignmentsCSV(assignments)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-accent-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink shadow-lg shadow-accent-950/40 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Assignment</span>
          </button>
        </div>
      </div>

      {/* 4 StatsCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Tasks"
          value={assignments.length}
          changeText={`${subjects.length} enrolled courses`}
          icon={Layers}
          gradient="from-sky-500 to-blue-600"
        />

        <StatsCard
          title="Due Today"
          value={`${dueTodayCount} Urgent`}
          changeText={dueTodayCount > 0 ? 'Action needed today' : 'Clear for today'}
          trend={dueTodayCount > 0 ? 'down' : 'up'}
          icon={AlertTriangle}
          gradient="from-rose-500 to-pink-600"
        />

        <StatsCard
          title="In Progress"
          value={`${pendingCount} Tasks`}
          changeText="Active queue"
          icon={FileCheck}
          gradient="from-amber-500 to-orange-600"
        />

        <StatsCard
          title="Completed"
          value={`${completedCount} Done`}
          change={completionPct}
          icon={CheckCircle2}
          gradient="from-emerald-500 to-teal-600"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: `All (${assignments.length})` },
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'due_today', label: 'Due Today' },
            { id: 'urgent', label: 'Urgent' },
            { id: 'completed', label: `Completed (${completedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-accent-500 text-accent-ink'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input w-full pl-8 pr-3 py-1.5 text-xs rounded-xl placeholder-white/40"
          />
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-3">
        {filtered.map((asg) => {
          const isDone = asg.status === 'completed' || asg.status === 'submitted';
          const linkedSubColor = subjects.find((s) => s.id === asg.subjectId)?.color;
          return (
            <div
              key={asg.id}
              className={`glass-card p-5 rounded-2xl transition-all ${
                isDone
                  ? 'opacity-65'
                  : asg.priority === 'urgent'
                  ? 'border-rose-500/35'
                  : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => onToggleComplete(asg.id)}
                    aria-label={`Mark ${asg.title} ${isDone ? 'incomplete' : 'complete'}`}
                    className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                        : 'border-white/30 hover:border-emerald-400 bg-white/[0.04]'
                    }`}
                  >
                    {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                      <span
                        className="font-mono font-bold text-accent-400"
                        style={linkedSubColor ? { color: linkedSubColor } : undefined}
                      >
                        {asg.subjectCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{asg.subjectName}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-semibold capitalize ${
                          asg.priority === 'urgent'
                            ? 'text-rose-400'
                            : asg.priority === 'high'
                            ? 'text-amber-400'
                            : 'text-white/70'
                        }`}
                      >
                        {asg.priority} priority
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{asg.type}</span>
                    </div>

                    <h3
                      className={`font-bold text-sm text-white mt-1 ${
                        isDone ? 'line-through text-white/40' : ''
                      }`}
                    >
                      {asg.title}
                    </h3>

                    {asg.description && (
                      <p className="text-xs text-white/60 mt-1 line-clamp-2">
                        {asg.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-white/60 mt-2 font-mono tabular-nums">
                      <span className="flex items-center gap-1 text-white/80">
                        <Clock className="w-3.5 h-3.5 text-white/45" />
                        Due {asg.dueDate} ({asg.dueTime})
                      </span>
                      <span>Progress: {asg.completionPercent}%</span>
                    </div>

                    <div className="w-full sm:w-64 bg-white/[0.08] h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${asg.completionPercent}%`,
                          backgroundColor: isDone ? '#10b981' : '#34d399',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleComplete(asg.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {isDone ? 'Mark Incomplete' : 'Done'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingAssignment({ ...asg })}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white cursor-pointer"
                    title="Edit assignment"
                    aria-label={`Edit ${asg.title}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteAssignment(asg.id)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                    title="Delete assignment"
                    aria-label={`Delete ${asg.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="glass-card p-10 text-center text-sm text-white/60 rounded-2xl">
            No assignments found matching the selected filter.
          </div>
        )}
      </div>

      {/* Add / Edit Assignment Modal */}
      {editingAssignment && (
        <ModalShell
          title={
            assignments.some((a) => a.id === editingAssignment.id)
              ? 'Edit Assignment'
              : 'Add New Assignment'
          }
          subtitle="Specify coursework title, subject, due date, and completion progress."
          onClose={() => setEditingAssignment(null)}
          maxWidthClass="max-w-md"
        >
          <form onSubmit={handleSaveForm} className="space-y-4">
            <div>
              <label
                htmlFor="asg-title-input"
                className="block text-xs font-semibold text-white/80 mb-1.5"
              >
                Assignment Title
              </label>
              <input
                id="asg-title-input"
                type="text"
                required
                autoFocus
                placeholder="e.g. Distributed Consensus Lab"
                value={editingAssignment.title || ''}
                onChange={(e) =>
                  setEditingAssignment({ ...editingAssignment, title: e.target.value })
                }
                className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="asg-subject-select"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  Subject
                </label>
                {subjects.length > 0 ? (
                  <select
                    id="asg-subject-select"
                    value={editingAssignment.subjectId}
                    onChange={(e) => handleSubjectSelect(e.target.value)}
                    className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#090d16]"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#090d16]">
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="asg-subject-select"
                    type="text"
                    placeholder="e.g. CS301"
                    value={editingAssignment.subjectCode || ''}
                    onChange={(e) =>
                      setEditingAssignment({
                        ...editingAssignment,
                        subjectCode: e.target.value.toUpperCase(),
                        subjectName: e.target.value.toUpperCase() || 'General',
                      })
                    }
                    className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl font-mono uppercase"
                  />
                )}
              </div>

              <div>
                <label
                  htmlFor="asg-priority-select"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  Priority
                </label>
                <select
                  id="asg-priority-select"
                  value={editingAssignment.priority || 'high'}
                  onChange={(e) =>
                    setEditingAssignment({
                      ...editingAssignment,
                      priority: e.target.value as AssignmentPriority,
                    })
                  }
                  className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#090d16]"
                >
                  <option value="low" className="bg-[#090d16]">Low</option>
                  <option value="medium" className="bg-[#090d16]">Medium</option>
                  <option value="high" className="bg-[#090d16]">High</option>
                  <option value="urgent" className="bg-[#090d16]">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="asg-date-input"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  Due Date
                </label>
                <input
                  id="asg-date-input"
                  type="date"
                  required
                  value={editingAssignment.dueDate || currentDateStr}
                  onChange={(e) =>
                    setEditingAssignment({ ...editingAssignment, dueDate: e.target.value })
                  }
                  className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="asg-time-input"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  Due Time
                </label>
                <input
                  id="asg-time-input"
                  type="time"
                  required
                  value={editingAssignment.dueTime || '23:59'}
                  onChange={(e) =>
                    setEditingAssignment({ ...editingAssignment, dueTime: e.target.value })
                  }
                  className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl tabular-nums"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="asg-progress-input"
                className="block text-xs font-semibold text-white/80 mb-1.5 tabular-nums"
              >
                Progress ({editingAssignment.completionPercent ?? 0}%)
              </label>
              <input
                id="asg-progress-input"
                type="range"
                min="0"
                max="100"
                value={editingAssignment.completionPercent ?? 0}
                onChange={(e) =>
                  setEditingAssignment({
                    ...editingAssignment,
                    completionPercent: Number(e.target.value),
                  })
                }
                className="w-full accent-accent-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setEditingAssignment(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink transition-colors cursor-pointer"
              >
                Save Assignment
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
};

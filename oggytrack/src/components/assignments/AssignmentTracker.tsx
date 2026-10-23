import React, { useState } from 'react';
import { Assignment, Subject, AssignmentPriority } from '../../types/oggytrack';
import { exportAssignmentsCSV } from '../../utils/csvExport';
import { addDaysISO, formatDateISO, useLiveClock } from '../../utils/dateUtils';
import { ModalShell } from '../common/ModalShell';
import { 
  Plus, 
  Search, 
  Check, 
  Clock, 
  Download, 
  Edit3, 
  Trash2
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

  const completedCount = assignments.filter((a) => a.status === 'completed' || a.status === 'submitted').length;
  const pendingCount = assignments.length - completedCount;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Assignments & Deliverables
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {pendingCount} Pending
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track coursework deadlines, problem sets, lab reports, and exam milestones
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportAssignmentsCSV(assignments)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white shadow-lg shadow-purple-600/20 border border-purple-400/40 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Assignment</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10">
          <span className="text-slate-400 text-xs">Total Tasks</span>
          <div className="text-2xl font-bold text-white tabular-nums mt-1">{assignments.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-950/30 backdrop-blur-xl border border-rose-500/30">
          <span className="text-rose-300 text-xs font-semibold">Due Today</span>
          <div className="text-2xl font-bold text-rose-400 tabular-nums mt-1">
            {assignments.filter((a) => a.dueDate === currentDateStr && a.status !== 'completed').length} Urgent
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-950/30 backdrop-blur-xl border border-amber-500/30">
          <span className="text-amber-300 text-xs font-semibold">In Progress</span>
          <div className="text-2xl font-bold text-amber-400 tabular-nums mt-1">{pendingCount} Tasks</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-950/30 backdrop-blur-xl border border-emerald-500/30">
          <span className="text-emerald-300 text-xs font-semibold">Completed</span>
          <div className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">{completedCount} Done</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: `All (${assignments.length})` },
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'due_today', label: 'Due Today' },
            { id: 'urgent', label: 'Urgent' },
            { id: 'completed', label: `Completed (${completedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-purple-600/80 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-3">
        {filtered.map((asg) => {
          const isDone = asg.status === 'completed' || asg.status === 'submitted';
          return (
            <div
              key={asg.id}
              className={`p-4 rounded-2xl bg-slate-900/60 backdrop-blur-xl border transition-all ${
                isDone
                  ? 'border-white/5 opacity-60 bg-white/[0.02]'
                  : asg.priority === 'urgent'
                  ? 'border-rose-500/40 shadow-lg shadow-rose-950/20'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => onToggleComplete(asg.id)}
                    className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-400 text-white'
                        : 'border-white/30 hover:border-white/60 bg-white/5'
                    }`}
                  >
                    {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-purple-400">
                        {asg.subjectCode}
                      </span>
                      <span className="text-white/30">·</span>
                      <span className="text-xs text-slate-300">{asg.subjectName}</span>
                      <span className="text-white/30">·</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        asg.priority === 'urgent'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : asg.priority === 'high'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-white/10 text-slate-300'
                      }`}>
                        {asg.priority}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                        {asg.type}
                      </span>
                    </div>

                    <h3 className={`font-bold text-sm text-white mt-1 ${isDone ? 'line-through text-slate-500' : ''}`}>
                      {asg.title}
                    </h3>

                    {asg.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {asg.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
                      <span className="flex items-center gap-1 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Due: {asg.dueDate} ({asg.dueTime})
                      </span>
                      <span>Progress: {asg.completionPercent}%</span>
                    </div>

                    {/* Progress Slider */}
                    <div className="w-full sm:w-64 bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${asg.completionPercent}%`,
                          backgroundColor: isDone ? '#10b981' : '#a855f7',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => onToggleComplete(asg.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 transition-colors"
                  >
                    {isDone ? 'Mark Incomplete' : 'Done'}
                  </button>

                  <button
                    onClick={() => setEditingAssignment({ ...asg })}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                    title="Edit assignment"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteAssignment(asg.id)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                    title="Delete assignment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl">
            No assignments found matching the filter.
          </div>
        )}
      </div>

      {/* Add / Edit Assignment Modal */}
      {editingAssignment && (
        <ModalShell
          title={assignments.some((a) => a.id === editingAssignment.id) ? 'Edit Assignment' : 'Add New Assignment'}
          subtitle="Specify coursework title, subject, due date, and completion progress."
          onClose={() => setEditingAssignment(null)}
          maxWidthClass="max-w-md"
        >
          <form onSubmit={handleSaveForm} className="space-y-4">
            <div>
              <label htmlFor="asg-title-input" className="block text-xs font-semibold text-slate-200 mb-1.5">
                Assignment Title
              </label>
              <input
                id="asg-title-input"
                type="text"
                required
                autoFocus
                placeholder="e.g. Distributed Consensus Lab"
                value={editingAssignment.title || ''}
                onChange={(e) => setEditingAssignment({ ...editingAssignment, title: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white focus:outline-hidden focus:border-purple-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="asg-subject-select" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Subject
                </label>
                {subjects.length > 0 ? (
                  <select
                    id="asg-subject-select"
                    value={editingAssignment.subjectId}
                    onChange={(e) => handleSubjectSelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-hidden focus:border-purple-400"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
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
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white font-mono uppercase focus:outline-hidden focus:border-purple-400"
                  />
                )}
              </div>

              <div>
                <label htmlFor="asg-priority-select" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Priority
                </label>
                <select
                  id="asg-priority-select"
                  value={editingAssignment.priority || 'high'}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, priority: e.target.value as AssignmentPriority })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-hidden focus:border-purple-400"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="asg-date-input" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Due Date
                </label>
                <input
                  id="asg-date-input"
                  type="date"
                  required
                  value={editingAssignment.dueDate || currentDateStr}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, dueDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white tabular-nums focus:outline-hidden focus:border-purple-400"
                />
              </div>

              <div>
                <label htmlFor="asg-time-input" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Due Time
                </label>
                <input
                  id="asg-time-input"
                  type="time"
                  required
                  value={editingAssignment.dueTime || '23:59'}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, dueTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white tabular-nums focus:outline-hidden focus:border-purple-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="asg-progress-input" className="block text-xs font-semibold text-slate-200 mb-1.5 tabular-nums">
                Progress ({editingAssignment.completionPercent ?? 0}%)
              </label>
              <input
                id="asg-progress-input"
                type="range"
                min="0"
                max="100"
                value={editingAssignment.completionPercent ?? 0}
                onChange={(e) => setEditingAssignment({ ...editingAssignment, completionPercent: Number(e.target.value) })}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingAssignment(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-white/15 bg-white/5 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-colors cursor-pointer"
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

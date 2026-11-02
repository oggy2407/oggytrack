import React, { useState } from 'react';
import { DesignConfig, AssignmentItem } from '../../types/design';
import { MOCK_ASSIGNMENTS } from '../../utils/mockAcademicData';
import { 
  FileCheck, 
  Check, 
  Clock, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  Sparkles,
  ArrowUpDown,
  X
} from 'lucide-react';

interface PreviewAssignmentsProps {
  config: DesignConfig;
}

export const PreviewAssignments: React.FC<PreviewAssignmentsProps> = ({ config }) => {
  const [assignments, setAssignments] = useState<AssignmentItem[]>(MOCK_ASSIGNMENTS);
  const [filter, setFilter] = useState<'all' | 'pending' | 'due_today' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('CS301');
  const [newDueDate, setNewDueDate] = useState('Tomorrow, 17:00');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');

  const filtered = assignments.filter((a) => {
    if (filter === 'pending' && a.status === 'completed') return false;
    if (filter === 'due_today' && !a.dueDate.toLowerCase().includes('today')) return false;
    if (filter === 'completed' && a.status !== 'completed') return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.subjectCode.toLowerCase().includes(q);
    }
    return true;
  });

  const toggleComplete = (id: string) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const isDone = a.status === 'completed';
          return {
            ...a,
            status: isDone ? 'in_progress' : 'completed',
            completionPercent: isDone ? 50 : 100,
          };
        }
        return a;
      })
    );
  };

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: AssignmentItem = {
      id: `asg-${Date.now()}`,
      title: newTitle.trim(),
      subjectCode: newSubject,
      subjectName: newSubject === 'CS301' ? 'Algorithms' : 'Operating Systems',
      dueDate: newDueDate,
      dueTime: '17:00',
      priority: newPriority,
      status: 'not_started',
      type: 'Homework',
      completionPercent: 0,
    };

    setAssignments([newItem, ...assignments]);
    setNewTitle('');
    setShowAddModal(false);
  };

  const completedCount = assignments.filter((a) => a.status === 'completed').length;
  const pendingCount = assignments.length - completedCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Assignments & Tasks
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Deliverables, homework, lab reports, and deadline tracking
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-white shadow-xs transition-opacity hover:opacity-95"
          style={{ backgroundColor: config.accentColor }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Assignment</span>
        </button>
      </div>

      {/* Top Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-3.5 border bg-white dark:bg-slate-900 ${config.borderRadius} border-slate-200 dark:border-slate-800`}>
          <span className="text-xs text-slate-400">Total Assignments</span>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
            {assignments.length}
          </div>
        </div>

        <div className={`p-3.5 border bg-white dark:bg-slate-900 ${config.borderRadius} border-slate-200 dark:border-slate-800`}>
          <span className="text-xs text-rose-500 font-medium">Due Today</span>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
            1 Urgent
          </div>
        </div>

        <div className={`p-3.5 border bg-white dark:bg-slate-900 ${config.borderRadius} border-slate-200 dark:border-slate-800`}>
          <span className="text-xs text-amber-500 font-medium">Pending Tasks</span>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
            {pendingCount}
          </div>
        </div>

        <div className={`p-3.5 border bg-white dark:bg-slate-900 ${config.borderRadius} border-slate-200 dark:border-slate-800`}>
          <span className="text-xs text-emerald-500 font-medium">Completed</span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
            {completedCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/60 text-xs w-full sm:w-auto">
          {[
            { id: 'all', label: `All (${assignments.length})` },
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'due_today', label: 'Due Today (1)' },
            { id: 'completed', label: `Completed (${completedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`flex-1 sm:flex-none px-3 py-1 font-medium rounded-md transition-colors ${
                filter === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks or subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-3">
        {filtered.map((asg) => {
          const isDone = asg.status === 'completed';
          return (
            <div
              key={asg.id}
              className={`p-4 border bg-white dark:bg-slate-900 transition-all ${config.borderRadius} ${
                isDone
                  ? 'border-slate-200 dark:border-slate-800/60 opacity-70 bg-slate-50/40 dark:bg-slate-900/40'
                  : asg.priority === 'urgent'
                  ? 'border-rose-300 dark:border-rose-900/60 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleComplete(asg.id)}
                    className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                      isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {asg.subjectCode}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {asg.subjectName}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        asg.priority === 'urgent'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : asg.priority === 'high'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {asg.priority}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {asg.type}
                      </span>
                    </div>

                    <h3 className={`font-semibold text-sm mt-1 text-slate-900 dark:text-slate-100 ${
                      isDone ? 'line-through text-slate-400' : ''
                    }`}>
                      {asg.title}
                    </h3>

                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Deadline: <strong className="text-slate-700 dark:text-slate-300">{asg.dueDate}</strong></span>
                      </div>
                      <div>
                        <span>Progress: <strong>{asg.completionPercent}%</strong></span>
                      </div>
                    </div>

                    {/* Progress Slider Bar */}
                    <div className="w-full sm:w-64 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${asg.completionPercent}%`,
                          backgroundColor: isDone ? '#059669' : config.accentColor,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggleComplete(asg.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shrink-0 ${
                    isDone
                      ? 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100'
                      : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  {isDone ? 'Mark Incomplete' : 'Mark Done'}
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
            No assignments match the selected filter.
          </div>
        )}
      </div>

      {/* Add Assignment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleAddAssignment}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-900 dark:text-slate-100 space-y-4"
          >
            <div className="flex items-start justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base">Add New Assignment</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Assignment Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Dynamic Programming Problem Set 3"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  Subject
                </label>
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="CS301">CS301 Algorithms</option>
                  <option value="CS304">CS304 Operating Systems</option>
                  <option value="CS310">CS310 Database Systems</option>
                  <option value="MATH240">MATH240 Linear Algebra</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  Priority
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Due Date & Time
              </label>
              <input
                type="text"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-semibold rounded-lg text-white"
                style={{ backgroundColor: config.accentColor }}
              >
                Save Assignment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

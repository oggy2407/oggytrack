import React, { useState, useEffect } from 'react';
import {
  ExamCategory,
  Subject,
  SubjectExam,
} from '../../types/oggytrack';
import {
  calculateExamPercentage,
  getExamPerformanceStanding,
  summarizeSubjectExams,
  validateExamInput,
} from '../../utils/academicCalculations';
import {
  formatDateISO,
  formatReadableISO,
  getDaysDifference,
  useLiveClock,
} from '../../utils/dateUtils';
import { exportExamsCSV } from '../../utils/csvExport';
import { ColorSwatchPicker } from '../common/ColorSwatchPicker';
import { ModalShell } from '../common/ModalShell';
import { StatsCard } from '../common/StatsCard';
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Download,
  Edit3,
  GraduationCap,
  MapPin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

const EXAM_CATEGORIES: ExamCategory[] = [
  'Quiz',
  'Unit Test',
  'Midterm',
  'Lab Practical',
  'Viva',
  'End-Term',
  'Custom',
];

interface ExamDraft {
  id: string;
  userId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  title: string;
  category: ExamCategory;
  examDate: string;
  startTime: string;
  room: string;
  marksObtainedText: string;
  maxMarksText: string;
  weightageText: string;
  color: string;
  notes: string;
  createdAt: string;
}

interface ExamsManagerProps {
  userId?: string;
  subjects: Subject[];
  exams: SubjectExam[];
  initialSubjectFilter?: string;
  autoOpenAddForSubjectId?: string | null;
  onConsumeAutoOpen?: () => void;
  onSaveExam: (exam: SubjectExam) => void;
  onDeleteExam: (id: string) => void;
  onNavigateSubjects?: () => void;
}

export const ExamsManager: React.FC<ExamsManagerProps> = ({
  userId = 'usr_student',
  subjects,
  exams,
  initialSubjectFilter = 'all',
  autoOpenAddForSubjectId = null,
  onConsumeAutoOpen,
  onSaveExam,
  onDeleteExam,
  onNavigateSubjects,
}) => {
  const now = useLiveClock(30000);
  const todayISO = formatDateISO(now);

  const [subjectFilter, setSubjectFilter] = useState<string>(initialSubjectFilter || 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'graded' | 'pending_marks'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingDraft, setEditingDraft] = useState<ExamDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Quick inline marks entry state for ungraded exam rows
  const [inlineMarksExamId, setInlineMarksExamId] = useState<string | null>(null);
  const [inlineMarksText, setInlineMarksText] = useState<string>('');
  const [inlineMarksError, setInlineMarksError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSubjectFilter) {
      setSubjectFilter(initialSubjectFilter);
    }
  }, [initialSubjectFilter]);

  const buildNewDraft = (targetSubjectId?: string): ExamDraft => {
    const chosenSub =
      subjects.find((s) => s.id === targetSubjectId) ||
      (subjectFilter !== 'all' ? subjects.find((s) => s.id === subjectFilter) : undefined) ||
      subjects[0] || {
      id: 'sub_general',
        code: 'GEN101',
        name: 'General Course',
        room: '',
        color: '#10b981',
      };

    return {
      id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      subjectId: chosenSub.id,
      subjectCode: chosenSub.code,
      subjectName: chosenSub.name,
      title: '',
      category: 'Midterm',
      examDate: todayISO,
      startTime: '09:30',
      room: chosenSub.room || '',
      marksObtainedText: '',
      maxMarksText: '50',
      weightageText: '',
      color: chosenSub.color || '#10b981',
      notes: '',
      createdAt: new Date().toISOString(),
    };
  };

  useEffect(() => {
    if (autoOpenAddForSubjectId && subjects.length > 0) {
      setFormError(null);
      setEditingDraft(buildNewDraft(autoOpenAddForSubjectId));
      onConsumeAutoOpen?.();
    }
  }, [autoOpenAddForSubjectId, subjects.length]);

  const handleOpenAdd = (forSubjectId?: string) => {
    setFormError(null);
    setConfirmDeleteId(null);
    setEditingDraft(buildNewDraft(forSubjectId));
  };

  const handleOpenEdit = (exam: SubjectExam) => {
    setFormError(null);
    setConfirmDeleteId(null);
    const subColor = subjects.find((s) => s.id === exam.subjectId)?.color || '#10b981';
    setEditingDraft({
      id: exam.id,
      userId: exam.userId,
      subjectId: exam.subjectId,
      subjectCode: exam.subjectCode,
      subjectName: exam.subjectName,
      title: exam.title,
      category: exam.category,
      examDate: exam.examDate,
      startTime: exam.startTime || '',
      room: exam.room || '',
      marksObtainedText:
        exam.marksObtained !== null && exam.marksObtained !== undefined
          ? String(exam.marksObtained)
          : '',
      maxMarksText: String(exam.maxMarks),
      weightageText:
        exam.weightage !== null && exam.weightage !== undefined ? String(exam.weightage) : '',
      color: exam.color || subColor,
      notes: exam.notes || '',
      createdAt: exam.createdAt,
    });
  };

  const handleDraftSubjectChange = (subId: string) => {
    if (!editingDraft) return;
    const sub = subjects.find((s) => s.id === subId);
    if (!sub) return;
    setEditingDraft({
      ...editingDraft,
      subjectId: sub.id,
      subjectCode: sub.code,
      subjectName: sub.name,
      color: sub.color || editingDraft.color,
      room: editingDraft.room || sub.room || '',
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDraft) return;

    const maxMarks = Number(editingDraft.maxMarksText);
    const marksObtained =
      editingDraft.marksObtainedText.trim() === ''
        ? null
        : Number(editingDraft.marksObtainedText);
    const weightage =
      editingDraft.weightageText.trim() === '' ? null : Number(editingDraft.weightageText);

    const validationError = validateExamInput({
      title: editingDraft.title,
      examDate: editingDraft.examDate,
      maxMarks,
      marksObtained,
      weightage,
    });

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const examToSave: SubjectExam = {
      id: editingDraft.id,
      userId: editingDraft.userId,
      subjectId: editingDraft.subjectId,
      subjectCode: editingDraft.subjectCode,
      subjectName: editingDraft.subjectName,
      title: editingDraft.title.trim(),
      category: editingDraft.category,
      examDate: editingDraft.examDate,
      startTime: editingDraft.startTime.trim() || undefined,
      room: editingDraft.room.trim() || undefined,
      marksObtained,
      maxMarks,
      weightage,
      color: editingDraft.color || undefined,
      notes: editingDraft.notes.trim() || undefined,
      createdAt: editingDraft.createdAt,
    };

    onSaveExam(examToSave);
    setEditingDraft(null);
    setFormError(null);
  };

  const handleSaveInlineMarks = (exam: SubjectExam) => {
    if (inlineMarksText.trim() === '') {
      setInlineMarksError('Enter marks obtained to save.');
      return;
    }
    const parsedMarks = Number(inlineMarksText);
    const err = validateExamInput({
      title: exam.title,
      examDate: exam.examDate,
      maxMarks: exam.maxMarks,
      marksObtained: parsedMarks,
      weightage: exam.weightage,
    });
    if (err) {
      setInlineMarksError(err);
      return;
    }
    onSaveExam({
      ...exam,
      marksObtained: parsedMarks,
    });
    setInlineMarksExamId(null);
    setInlineMarksText('');
    setInlineMarksError(null);
  };

  const overallSummary = summarizeSubjectExams(exams, todayISO);
  const overallEffectiveScore =
    overallSummary.weightedPercentage ?? overallSummary.averagePercentage;

  const subjectBreakdowns = subjects.map((sub) => {
    const subExams = exams.filter((e) => e.subjectId === sub.id);
    const summary = summarizeSubjectExams(subExams, todayISO);
    const effectivePct = summary.weightedPercentage ?? summary.averagePercentage;
    return {
      subject: sub,
      summary,
      effectivePct,
    };
  });

  const assessedSubjectsCount = subjectBreakdowns.filter((b) => b.summary.totalExams > 0).length;
  const topSubjectBreakdown = [...subjectBreakdowns]
    .filter((b) => b.effectivePct !== null)
    .sort((a, b) => (b.effectivePct ?? 0) - (a.effectivePct ?? 0))[0];

  const filteredExams = exams
    .filter((ex) => {
      if (subjectFilter !== 'all' && ex.subjectId !== subjectFilter) return false;
      const isGraded = ex.marksObtained !== null && ex.marksObtained !== undefined;
      if (statusFilter === 'upcoming' && ex.examDate < todayISO) return false;
      if (statusFilter === 'graded' && !isGraded) return false;
      if (statusFilter === 'pending_marks' && isGraded) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ex.title.toLowerCase().includes(q) ||
          ex.subjectCode.toLowerCase().includes(q) ||
          ex.subjectName.toLowerCase().includes(q) ||
          ex.category.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => a.examDate.localeCompare(b.examDate) || b.createdAt.localeCompare(a.createdAt));

  const getSubjectColor = (subjectId: string) =>
    subjects.find((s) => s.id === subjectId)?.color || '#34d399';

  const getRelativeExamTiming = (examDateISO: string) => {
    const diff = getDaysDifference(todayISO, examDateISO);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff > 1) return `In ${diff} days`;
    if (diff === -1) return 'Yesterday';
    return `${Math.abs(diff)} days ago`;
  };

  // Live modal score preview
  const previewMax = editingDraft ? Number(editingDraft.maxMarksText) : 0;
  const previewObtained =
    editingDraft && editingDraft.marksObtainedText.trim() !== ''
      ? Number(editingDraft.marksObtainedText)
      : null;
  const showScorePreview =
    previewObtained !== null &&
    Number.isFinite(previewObtained) &&
    previewObtained >= 0 &&
    Number.isFinite(previewMax) &&
    previewMax > 0 &&
    previewObtained <= previewMax;
  const previewPct = showScorePreview ? calculateExamPercentage(previewObtained!, previewMax) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Exams & Marks Tracker
            </h1>
            <span className="text-sm text-accent-400 font-medium tabular-nums">
              · {exams.length} {exams.length === 1 ? 'Exam' : 'Exams'}
            </span>
          </div>
          <p className="text-sm text-white/60 mt-1">
            Schedule exam dates across subjects and record marks for quizzes, midterms, practicals, and finals
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {exams.length > 0 && (
            <button
              type="button"
              onClick={() => exportExamsCSV(exams)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-accent-400 shrink-0" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenAdd()}
            disabled={subjects.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink shadow-lg shadow-accent-950/40 transition-colors disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Add Exam</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI StatsCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Overall Exam Score"
          value={overallEffectiveScore !== null ? `${overallEffectiveScore}%` : 'No Marks Yet'}
          changeText={
            overallSummary.gradedCount > 0
              ? `${overallSummary.totalObtained} / ${overallSummary.totalMax} marks · ${overallSummary.standingLabel}`
              : 'Enter exam marks to compute average'
          }
          trend={overallEffectiveScore !== null && overallEffectiveScore < 50 ? 'down' : 'up'}
          icon={Award}
          gradient="from-accent-500 to-accent-secondary"
        />

        <StatsCard
          title="Graded Assessments"
          value={`${overallSummary.gradedCount} / ${overallSummary.totalExams}`}
          changeText={
            overallSummary.pendingMarksCount > 0
              ? `${overallSummary.pendingMarksCount} awaiting marks`
              : overallSummary.totalExams > 0
              ? 'All scheduled exams graded'
              : '0 exams added yet'
          }
          icon={GraduationCap}
          gradient="from-teal-500 to-cyan-600"
        />

        <StatsCard
          title="Upcoming Exam Dates"
          value={overallSummary.upcomingCount}
          changeText={
            overallSummary.nextExam
              ? `Next: ${overallSummary.nextExam.subjectCode} · ${formatReadableISO(
                  overallSummary.nextExam.examDate,
                  false
                )}`
              : 'No upcoming exam dates'
          }
          icon={Calendar}
          gradient="from-sky-500 to-blue-600"
        />

        <StatsCard
          title="Courses Assessed"
          value={`${assessedSubjectsCount} / ${subjects.length}`}
          changeText={
            topSubjectBreakdown
              ? `Highest: ${topSubjectBreakdown.subject.code} (${topSubjectBreakdown.effectivePct}%)`
              : 'Add exams per course below'
          }
          icon={BookOpen}
          gradient="from-amber-500 to-orange-600"
        />
      </div>

      {subjects.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto shadow-lg">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Add Subjects Before Scheduling Exams</h2>
            <p className="text-xs text-white/60 mt-1 max-w-sm mx-auto leading-relaxed">
              Exams and marks are organized by course. Add your semester subjects first to track quizzes, midterms, lab practicals, and end-term scores.
            </p>
          </div>
          {onNavigateSubjects && (
            <button
              type="button"
              onClick={onNavigateSubjects}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/40 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Open Subject Directory</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Subject-Wise Exam Marks Breakdown */}
          <section className="glass-card p-6 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
              <div>
                <p className="text-sm text-white/60">Subject Performance</p>
                <h2 className="font-bold text-lg text-white tracking-tight">
                  Course-Wise Exam Dates & Marks Summary
                </h2>
              </div>
              {subjectFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSubjectFilter('all')}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  Show All Subjects
                </button>
              )}
            </div>

            <div className="divide-y divide-white/[0.08]">
              {subjectBreakdowns.map(({ subject: sub, summary, effectivePct }) => {
                const isSelectedSubject = subjectFilter === sub.id;
                return (
                  <div
                    key={sub.id}
                    className="py-3.5 first:pt-1 last:pb-1 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="font-mono font-bold text-sm shrink-0"
                          style={{ color: sub.color }}
                        >
                          {sub.code}
                        </span>
                        <span className="text-white/30" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-bold text-sm text-white truncate">{sub.name}</span>
                        <span className="text-white/30" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-white/55 tabular-nums">
                          {summary.totalExams} {summary.totalExams === 1 ? 'exam' : 'exams'}
                        </span>
                        {summary.nextExam && (
                          <>
                            <span className="text-white/30" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-emerald-400 tabular-nums">
                              Next: {summary.nextExam.title} (
                              {formatReadableISO(summary.nextExam.examDate, false)})
                            </span>
                          </>
                        )}
                      </div>

                      {summary.gradedCount > 0 && effectivePct !== null ? (
                        <div className="w-full max-w-md bg-white/[0.08] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, effectivePct)}%`,
                              backgroundColor: effectivePct < 50 ? '#f59e0b' : sub.color,
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-white/45">
                          No graded marks recorded yet for {sub.code}.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <div className="text-left lg:text-right font-mono tabular-nums">
                        {effectivePct !== null ? (
                          <>
                            <div className="text-sm font-bold text-white">
                              {effectivePct}%{' '}
                              <span className="text-xs font-normal text-white/60">
                                ({summary.totalObtained}/{summary.totalMax})
                              </span>
                            </div>
                            <div
                              className={`text-[11px] font-sans font-medium ${
                                effectivePct >= 70
                                  ? 'text-emerald-400'
                                  : effectivePct >= 50
                                  ? 'text-amber-300'
                                  : 'text-rose-400'
                              }`}
                            >
                              {summary.standingLabel}
                              {summary.weightedPercentage !== null ? ' · Weighted' : ''}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-white/45 font-sans">No marks yet</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSubjectFilter(isSelectedSubject ? 'all' : sub.id)
                          }
                          aria-pressed={isSelectedSubject}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isSelectedSubject
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                              : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.1] text-white/80 hover:text-white'
                          }`}
                        >
                          {isSelectedSubject ? 'Filtered' : 'Filter'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenAdd(sub.id)}
                          aria-label={`Add exam for ${sub.code}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/12 hover:bg-emerald-500/22 text-emerald-300 hover:text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>Add Exam</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Exam Dates & Marks Ledger */}
          <section className="glass-card p-6 rounded-2xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filter exams by subject"
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="glass-input px-3 py-1.5 rounded-xl text-xs"
                >
                  <option value="all" className="bg-[#0d1320] text-white">
                    All Subjects ({exams.length})
                  </option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#0d1320] text-white">
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>

                <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'upcoming', label: 'Upcoming' },
                    { id: 'graded', label: 'Graded' },
                    { id: 'pending_marks', label: 'Pending Marks' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() =>
                        setStatusFilter(
                          tab.id as 'all' | 'upcoming' | 'graded' | 'pending_marks'
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        statusFilter === tab.id
                          ? 'bg-accent-500 text-accent-ink'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative w-full lg:w-72">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  aria-label="Search exams"
                  placeholder="Search exam title, course, or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="glass-input w-full pl-9 pr-3.5 py-2 text-xs rounded-xl"
                />
              </div>
            </div>

            {filteredExams.length > 0 ? (
              <div className="divide-y divide-white/[0.08]">
                {filteredExams.map((exam) => {
                  const subColor = exam.color || getSubjectColor(exam.subjectId);
                  const isGraded =
                    exam.marksObtained !== null && exam.marksObtained !== undefined;
                  const pct = isGraded
                    ? calculateExamPercentage(exam.marksObtained!, exam.maxMarks)
                    : null;
                  const standing = getExamPerformanceStanding(pct);
                  const isInlineEditing = inlineMarksExamId === exam.id;

                  return (
                    <div
                      key={exam.id}
                      className="py-4 first:pt-1 last:pb-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-white/60">
                          <span
                            className="font-mono font-bold"
                            style={{ color: subColor }}
                          >
                            {exam.subjectCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-white/80 font-medium">{exam.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-white/80">
                            {formatReadableISO(exam.examDate)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`tabular-nums font-medium ${
                              exam.examDate >= todayISO ? 'text-emerald-400' : 'text-white/50'
                            }`}
                          >
                            {getRelativeExamTiming(exam.examDate)}
                          </span>
                          {exam.weightage !== null && exam.weightage !== undefined && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums text-white/55">
                                Weight {exam.weightage}%
                              </span>
                            </>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-white">{exam.title}</h3>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/55">
                          <span className="text-white/70">{exam.subjectName}</span>
                          {exam.startTime && (
                            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                              <Clock className="w-3 h-3 text-white/40 shrink-0" />
                              {exam.startTime}
                            </span>
                          )}
                          {exam.room && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-white/40 shrink-0" />
                              {exam.room}
                            </span>
                          )}
                          {exam.notes && <span className="text-white/50">Note: {exam.notes}</span>}
                        </div>
                      </div>

                      {/* Right Side: Marks Display or Quick Marks Entry + Edit/Delete */}
                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {isInlineEditing ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                max={exam.maxMarks}
                                autoFocus
                                aria-label={`Marks obtained for ${exam.title}`}
                                placeholder="Marks"
                                value={inlineMarksText}
                                onChange={(e) => {
                                  setInlineMarksText(e.target.value);
                                  setInlineMarksError(null);
                                }}
                                className="glass-input w-20 px-2.5 py-1.5 rounded-lg text-xs font-mono tabular-nums"
                              />
                              <span className="font-mono tabular-nums text-white/60">
                                / {exam.maxMarks}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSaveInlineMarks(exam)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5 shrink-0" />
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setInlineMarksExamId(null);
                                  setInlineMarksError(null);
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/75 text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                            {inlineMarksError && (
                              <p className="text-[11px] text-rose-400">{inlineMarksError}</p>
                            )}
                          </div>
                        ) : isGraded && pct !== null ? (
                          <div className="text-left lg:text-right font-mono tabular-nums">
                            <div className="text-sm font-bold text-white">
                              {exam.marksObtained} / {exam.maxMarks}{' '}
                              <span className="text-emerald-400">({pct}%)</span>
                            </div>
                            <div
                              className={`text-[11px] font-sans font-medium ${
                                pct >= 70
                                  ? 'text-emerald-400'
                                  : pct >= 50
                                  ? 'text-amber-300'
                                  : 'text-rose-400'
                              }`}
                            >
                              {standing}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-mono tabular-nums text-white/55">
                              Pending / {exam.maxMarks} max
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setInlineMarksExamId(exam.id);
                                setInlineMarksText('');
                                setInlineMarksError(null);
                              }}
                              aria-label={`Enter marks for ${exam.title}`}
                              className="px-3 py-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/12 hover:bg-emerald-500/22 text-emerald-300 hover:text-white font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Enter Marks
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(exam)}
                            aria-label={`Edit ${exam.title}`}
                            className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 hover:text-white inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 shrink-0" />
                            <span>Edit</span>
                          </button>

                          {confirmDeleteId === exam.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteExam(exam.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Confirm Delete
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(exam.id)}
                              aria-label={`Delete ${exam.title}`}
                              className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 text-white/55 hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center space-y-3">
                <p className="text-sm text-white/60">
                  {exams.length === 0
                    ? 'No exam dates or marks have been added yet.'
                    : 'No exams match your active filter criteria.'}
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenAdd()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Add First Exam</span>
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {/* Add / Edit Exam Modal */}
      {editingDraft && (
        <ModalShell
          title={
            exams.some((ex) => ex.id === editingDraft.id)
              ? 'Edit Exam Date & Marks'
              : 'Add Subject Exam & Marks'
          }
          subtitle="Schedule an upcoming exam date or log marks obtained for a completed assessment."
          onClose={() => {
            setEditingDraft(null);
            setFormError(null);
          }}
          maxWidthClass="max-w-lg"
        >
          <form onSubmit={handleSaveForm} className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200"
              >
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="exam-subject-select"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  Subject / Course
                </label>
                <select
                  id="exam-subject-select"
                  value={editingDraft.subjectId}
                  onChange={(e) => handleDraftSubjectChange(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#0d1320] text-white">
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="exam-category-select"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  Exam Type
                </label>
                <select
                  id="exam-category-select"
                  value={editingDraft.category}
                  onChange={(e) =>
                    setEditingDraft({
                      ...editingDraft,
                      category: e.target.value as ExamCategory,
                    })
                  }
                  className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl"
                >
                  {EXAM_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#0d1320] text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="exam-title-input"
                className="block text-xs font-semibold text-white/80 mb-1.5"
              >
                Exam Title
              </label>
              <input
                id="exam-title-input"
                type="text"
                autoFocus
                placeholder="e.g. Midterm Exam, Quiz 1 — Dynamic Programming, Lab Practical"
                value={editingDraft.title}
                onChange={(e) => {
                  setEditingDraft({ ...editingDraft, title: e.target.value });
                  if (formError) setFormError(null);
                }}
                className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label
                  htmlFor="exam-date-input"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  Exam Date
                </label>
                <input
                  id="exam-date-input"
                  type="date"
                  value={editingDraft.examDate}
                  onChange={(e) =>
                    setEditingDraft({ ...editingDraft, examDate: e.target.value })
                  }
                  className="glass-input w-full px-3 py-2.5 text-xs rounded-xl font-mono tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="exam-time-input"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  Start Time (Optional)
                </label>
                <input
                  id="exam-time-input"
                  type="time"
                  value={editingDraft.startTime}
                  onChange={(e) =>
                    setEditingDraft({ ...editingDraft, startTime: e.target.value })
                  }
                  className="glass-input w-full px-3 py-2.5 text-xs rounded-xl font-mono tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="exam-room-input"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  Exam Hall / Room
                </label>
                <input
                  id="exam-room-input"
                  type="text"
                  placeholder="e.g. Hall A"
                  value={editingDraft.room}
                  onChange={(e) =>
                    setEditingDraft({ ...editingDraft, room: e.target.value })
                  }
                  className="glass-input w-full px-3 py-2.5 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label
                  htmlFor="exam-obtained-marks-input"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  Marks Obtained
                </label>
                <input
                  id="exam-obtained-marks-input"
                  type="number"
                  step="any"
                  placeholder="Blank if upcoming"
                  value={editingDraft.marksObtainedText}
                  onChange={(e) => {
                    setEditingDraft({ ...editingDraft, marksObtainedText: e.target.value });
                    if (formError) setFormError(null);
                  }}
                  className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl font-mono tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="exam-max-marks-input"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  Maximum Marks
                </label>
                <input
                  id="exam-max-marks-input"
                  type="number"
                  step="any"
                  value={editingDraft.maxMarksText}
                  onChange={(e) => {
                    setEditingDraft({ ...editingDraft, maxMarksText: e.target.value });
                    if (formError) setFormError(null);
                  }}
                  className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl font-mono tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="exam-weightage-input"
                  className="block text-xs font-semibold text-white/80 mb-1.5"
                >
                  Weightage % (Optional)
                </label>
                <input
                  id="exam-weightage-input"
                  type="number"
                  step="any"
                  placeholder="e.g. 30"
                  value={editingDraft.weightageText}
                  onChange={(e) => {
                    setEditingDraft({ ...editingDraft, weightageText: e.target.value });
                    if (formError) setFormError(null);
                  }}
                  className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl font-mono tabular-nums"
                />
              </div>
            </div>

            {previewPct !== null && (
              <p className="text-xs text-emerald-400 font-mono tabular-nums">
                Calculated Score: {previewObtained} / {previewMax} ({previewPct}% ·{' '}
                {getExamPerformanceStanding(previewPct)})
              </p>
            )}

            <div>
              <label
                htmlFor="exam-notes-input"
                className="block text-xs font-semibold text-white/80 mb-1.5"
              >
                Syllabus / Remarks (Optional)
              </label>
              <input
                id="exam-notes-input"
                type="text"
                placeholder="e.g. Modules 1–3, Graph algorithms & greedy proofs"
                value={editingDraft.notes}
                onChange={(e) =>
                  setEditingDraft({ ...editingDraft, notes: e.target.value })
                }
                className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl"
              />
            </div>

            <ColorSwatchPicker
              value={editingDraft.color || '#10b981'}
              onChange={(color) => setEditingDraft({ ...editingDraft, color })}
              label="Exam Color Tag"
              compact
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  setEditingDraft(null);
                  setFormError(null);
                }}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Save Exam
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
};

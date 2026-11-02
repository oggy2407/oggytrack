import React, { useState } from 'react';
import {
  AcademicImportPayload,
  Assignment,
  AttendanceRecord,
  DayOfWeek,
  Holiday,
  HolidayType,
  ImportedAssignmentCandidate,
  ImportedAttendanceCandidate,
  ImportedAttendanceSummaryCandidate,
  ImportedClassCandidate,
  ImportedHolidayCandidate,
  ImportedSubjectCandidate,
  Subject,
  TimetableEntry,
} from '../../types/oggytrack';
import { parseTimetableFile } from '../../utils/timetableParser';
import { buildBackfillAttendanceRecords } from '../../utils/academicCalculations';
import { formatDateISO } from '../../utils/dateUtils';
import { ModalShell } from '../common/ModalShell';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardPaste,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Palmtree,
  Plus,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';

export type ImporterFocusMode = 'universal' | 'holidays';

interface TimetableImporterProps {
  userId?: string;
  existingTimetable: TimetableEntry[];
  subjects: Subject[];
  initialMode?: ImporterFocusMode;
  onImportConfirmed: (payload: AcademicImportPayload) => void;
  onClose: () => void;
}

const ALL_DAYS: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const SUBJECT_COLORS = [
  '#10b981',
  '#06b6d4',
  '#f59e0b',
  '#3b82f6',
  '#14b8a6',
  '#ec4899',
  '#f43f5e',
  '#0ea5e9',
];

const HOLIDAY_CATEGORIES: Array<{ value: HolidayType; label: string }> = [
  { value: 'National', label: 'National Holiday' },
  { value: 'Institutional', label: 'Institutional Break' },
  { value: 'Semester Break', label: 'Semester Break' },
  { value: 'Exam Preparation', label: 'Exam Preparation' },
  { value: 'Personal', label: 'Personal Day Off' },
];

export const TimetableImporter: React.FC<TimetableImporterProps> = ({
  userId = 'usr_student',
  existingTimetable,
  subjects,
  initialMode = 'universal',
  onImportConfirmed,
  onClose,
}) => {
  const isHolidayFocus = initialMode === 'holidays';
  const [step, setStep] = useState<'upload' | 'scanning' | 'review'>('upload');
  const [inputMethod, setInputMethod] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [documentSummary, setDocumentSummary] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'holidays' | 'schedule' | 'subjects' | 'attendance' | 'assignments'
  >(isHolidayFocus ? 'holidays' : 'schedule');
  const [replaceSummaryAttendance, setReplaceSummaryAttendance] = useState(true);

  const [classCandidates, setClassCandidates] = useState<ImportedClassCandidate[]>([]);
  const [subjectCandidates, setSubjectCandidates] = useState<ImportedSubjectCandidate[]>([]);
  const [attendanceCandidates, setAttendanceCandidates] = useState<ImportedAttendanceCandidate[]>([]);
  const [summaryCandidates, setSummaryCandidates] = useState<ImportedAttendanceSummaryCandidate[]>([]);
  const [assignmentCandidates, setAssignmentCandidates] = useState<ImportedAssignmentCandidate[]>([]);
  const [holidayCandidates, setHolidayCandidates] = useState<ImportedHolidayCandidate[]>([]);
  const [restoredProfile, setRestoredProfile] = useState<AcademicImportPayload['restoredProfile']>();
  const [restoredSettings, setRestoredSettings] = useState<AcademicImportPayload['restoredSettings']>();
  const [restoredWallpaper, setRestoredWallpaper] = useState<AcademicImportPayload['restoredWallpaper']>();

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setErrorMsg(null);
    setFileName(files.length === 1 ? files[0].name : `${files.length} files (${files[0].name}...)`);
    setStep('scanning');

    try {
      const allClasses: ImportedClassCandidate[] = [];
      const allSubjects: ImportedSubjectCandidate[] = [];
      const allAttRecords: ImportedAttendanceCandidate[] = [];
      const allSummaries: ImportedAttendanceSummaryCandidate[] = [];
      const allAssignments: ImportedAssignmentCandidate[] = [];
      const allHolidays: ImportedHolidayCandidate[] = [];
      const summariesText: string[] = [];
      let foundProfile: AcademicImportPayload['restoredProfile'];
      let foundSettings: AcademicImportPayload['restoredSettings'];
      let foundWallpaper: AcademicImportPayload['restoredWallpaper'];

      for (const file of files) {
        const res = await parseTimetableFile(file, existingTimetable);
        summariesText.push(res.documentSummary);
        allClasses.push(...res.candidates);
        res.subjects.forEach((s) => {
          if (!allSubjects.some((ex) => ex.code.toUpperCase() === s.code.toUpperCase())) {
            allSubjects.push(s);
          }
        });
        allAttRecords.push(...res.attendanceRecords);
        allSummaries.push(...res.attendanceSummaries);
        allAssignments.push(...res.assignments);
        allHolidays.push(...res.holidays);
        if (res.restoredProfile) foundProfile = res.restoredProfile;
        if (res.restoredSettings) foundSettings = res.restoredSettings;
        if (res.restoredWallpaper) foundWallpaper = res.restoredWallpaper;
      }

      setDocumentSummary(summariesText.join(' '));
      setClassCandidates(allClasses);
      setSubjectCandidates(allSubjects);
      setAttendanceCandidates(allAttRecords);
      setSummaryCandidates(allSummaries);
      setAssignmentCandidates(allAssignments);
      setHolidayCandidates(allHolidays);
      setRestoredProfile(foundProfile);
      setRestoredSettings(foundSettings);
      setRestoredWallpaper(foundWallpaper);

      if (isHolidayFocus && allHolidays.length > 0) setActiveTab('holidays');
      else if (
        allHolidays.length > 0 &&
        allClasses.length === 0 &&
        allSummaries.length === 0 &&
        allAttRecords.length === 0
      ) {
        setActiveTab('holidays');
      } else if (allClasses.length > 0) setActiveTab('schedule');
      else if (allSummaries.length > 0 || allAttRecords.length > 0) setActiveTab('attendance');
      else if (allSubjects.length > 0) setActiveTab('subjects');
      else if (allHolidays.length > 0) setActiveTab('holidays');
      else if (allAssignments.length > 0) setActiveTab('assignments');
      else setActiveTab(isHolidayFocus ? 'holidays' : 'schedule');

      setStep('review');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to parse the uploaded file.');
      setStep('upload');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleScanPastedText = () => {
    const trimmed = pastedText.trim();
    if (!trimmed) return;
    const virtualFile = new File(
      [trimmed],
      isHolidayFocus ? 'pasted-holiday-list.txt' : 'pasted-academic-data.txt',
      { type: 'text/plain' }
    );
    processFiles([virtualFile]);
  };

  const handleAddHolidayRow = () => {
    const todayISO = formatDateISO(new Date());
    setHolidayCandidates((prev) => [
      ...prev,
      {
        id: `hol_manual_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        title: '',
        startDate: todayISO,
        endDate: todayISO,
        type: 'National',
        cancelsClasses: true,
        selected: true,
      },
    ]);
  };

  const selectedCounts = {
    classes: classCandidates.filter((c) => c.selected).length,
    subjects: subjectCandidates.filter((s) => s.selected).length,
    attendance:
      summaryCandidates.filter((s) => s.selected).length +
      attendanceCandidates.filter((r) => r.selected).length,
    holidays: holidayCandidates.filter((h) => h.selected && h.title.trim().length > 0).length,
    assignments: assignmentCandidates.filter((a) => a.selected).length,
  };

  const totalSelected =
    selectedCounts.classes +
    selectedCounts.subjects +
    selectedCounts.attendance +
    selectedCounts.holidays +
    selectedCounts.assignments;

  const handleConfirmImport = () => {
    // 1. Resolve Subjects Map (existing + newly selected + referenced by selected classes/attendance)
    const subjectByCode = new Map<string, Subject>();
    subjects.forEach((s) => {
      subjectByCode.set(s.code.toUpperCase(), s);
    });

    const newSubjectsToSave: Subject[] = [];

    const resolveOrCreateSubject = (
      codeRaw: string,
      nameRaw: string,
      opts?: Partial<ImportedSubjectCandidate>
    ): Subject => {
      const code = (codeRaw || 'SUBJ').trim().toUpperCase();
      const existing =
        subjectByCode.get(code) ||
        Array.from(subjectByCode.values()).find(
          (s) => s.name.toLowerCase() === (nameRaw || '').trim().toLowerCase()
        );
      if (existing) return existing;

      const created: Subject = {
        id: `sub_imp_${Date.now()}_${code.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.random()
          .toString(36)
          .slice(2, 5)}`,
        userId,
        code,
        name: (nameRaw || code).trim(),
        credits: opts?.credits || 3,
        faculty: opts?.faculty || 'Instructor',
        room: opts?.room || 'Room 101',
        color:
          opts?.color ||
          SUBJECT_COLORS[(subjects.length + newSubjectsToSave.length) % SUBJECT_COLORS.length],
        targetAttendance: opts?.targetAttendance || 75,
        createdAt: new Date().toISOString(),
      };
      subjectByCode.set(code, created);
      newSubjectsToSave.push(created);
      return created;
    };

    subjectCandidates
      .filter((s) => s.selected)
      .forEach((sc) => {
        resolveOrCreateSubject(sc.code, sc.name, sc);
      });

    // 2. Convert Timetable Entries
    const convertedTimetable: TimetableEntry[] = classCandidates
      .filter((c) => c.selected)
      .map((cand, idx) => {
        const sub = resolveOrCreateSubject(cand.code, cand.subjectName, {
          faculty: cand.faculty,
          room: cand.room,
        });
        return {
          id: `tt_imp_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          userId,
          subjectId: sub.id,
          subjectName: sub.name,
          code: sub.code,
          day: cand.day,
          startTime: cand.startTime,
          endTime: cand.endTime,
          room: cand.room || sub.room,
          faculty: cand.faculty || sub.faculty,
          type: cand.type,
          color: sub.color,
          recurrence: 'weekly',
        };
      });

    // 3. Convert Dated Past Attendance Logs & Past Summary Counts
    const convertedAttendance: AttendanceRecord[] = [];
    const replaceSubjectIdsForSummary: string[] = [];

    attendanceCandidates
      .filter((r) => r.selected)
      .forEach((rec, idx) => {
        const sub = resolveOrCreateSubject(rec.code, rec.subjectName);
        convertedAttendance.push({
          id: `att_imp_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          userId,
          subjectId: sub.id,
          date: rec.date,
          status: rec.status,
          note: rec.note || `Imported from ${fileName}`,
          timestamp: new Date().toISOString(),
        });
      });

    summaryCandidates
      .filter((s) => s.selected)
      .forEach((sum) => {
        const sub = resolveOrCreateSubject(sum.code, sum.subjectName);
        if (replaceSummaryAttendance) {
          replaceSubjectIdsForSummary.push(sub.id);
        }
        const scheduledDays = [
          ...existingTimetable.filter((t) => t.subjectId === sub.id).map((t) => t.day),
          ...convertedTimetable.filter((t) => t.subjectId === sub.id).map((t) => t.day),
        ];
        const generated = buildBackfillAttendanceRecords({
          userId,
          subjectId: sub.id,
          attended: sum.attended,
          missed: sum.missed,
          cancelled: sum.cancelled,
          scheduledDays,
          note: `Imported past summary (${fileName})`,
        });
        convertedAttendance.push(...generated);
      });

    // 4. Convert Assignments & Holidays
    const convertedAssignments: Assignment[] = assignmentCandidates
      .filter((a) => a.selected)
      .map((asg, idx) => {
        const sub = resolveOrCreateSubject(asg.subjectCode, asg.subjectName);
        return {
          id: `asg_imp_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
          userId,
          subjectId: sub.id,
          subjectCode: sub.code,
          subjectName: sub.name,
          title: asg.title,
          dueDate: asg.dueDate,
          dueTime: asg.dueTime || '23:59',
          priority: asg.priority || 'medium',
          status: 'not_started',
          type: asg.type || 'Homework',
          completionPercent: 0,
          createdAt: new Date().toISOString(),
        };
      });

    const convertedHolidays: Holiday[] = holidayCandidates
      .filter((h) => h.selected && h.title.trim().length > 0)
      .map((hol, idx) => {
        const start = hol.startDate || formatDateISO(new Date());
        const end = hol.endDate && hol.endDate >= start ? hol.endDate : start;
        return {
          id: `hol_imp_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
          userId,
          title: hol.title.trim(),
          startDate: start,
          endDate: end,
          type: hol.type || 'Institutional',
          description: hol.description?.trim() || undefined,
          cancelsClasses: hol.cancelsClasses,
        };
      });

    onImportConfirmed({
      subjects: newSubjectsToSave,
      timetable: convertedTimetable,
      attendanceRecords: convertedAttendance,
      assignments: convertedAssignments,
      holidays: convertedHolidays,
      replaceSubjectIdsForSummary,
      restoredProfile,
      restoredSettings,
      restoredWallpaper,
    });
  };

  const isOnlyHolidaysSelected =
    selectedCounts.holidays > 0 &&
    selectedCounts.classes === 0 &&
    selectedCounts.subjects === 0 &&
    selectedCounts.attendance === 0 &&
    selectedCounts.assignments === 0;

  return (
    <ModalShell
      title={isHolidayFocus ? 'Scan Academic Holidays & Breaks' : 'Universal Academic File Importer'}
      subtitle={
        isHolidayFocus
          ? 'Scan any holiday circular, academic calendar PDF, screenshot, photo, Excel/CSV, ICS file, or paste a holiday list'
          : 'Upload any file — PDFs, screenshots, Excel, Word, CSV, ICS calendars, HTML portal exports, or JSON backups'
      }
      onClose={onClose}
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-5">
        {step === 'upload' && (
          <div className="space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Input Method Switcher */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs w-fit">
              <button
                type="button"
                onClick={() => setInputMethod('file')}
                className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  inputMethod === 'file'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload File or Photo</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMethod('paste')}
                className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  inputMethod === 'paste'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>{isHolidayFocus ? 'Paste Holiday List' : 'Paste Text'}</span>
              </button>
            </div>

            {inputMethod === 'file' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('universalAcademicFileInput')?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-white/[0.14] bg-white/[0.02] hover:border-emerald-400/50 hover:bg-white/[0.04]'
                }`}
              >
                <input
                  id="universalAcademicFileInput"
                  type="file"
                  multiple
                  accept="*/*"
                  aria-label={isHolidayFocus ? 'Upload holiday file' : 'Upload academic file'}
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <input
                  id="cameraScanInput"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  aria-label="Capture photo with camera"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {isHolidayFocus ? (
                  <Palmtree className="w-11 h-11 text-emerald-400 mx-auto mb-3" />
                ) : (
                  <UploadCloud className="w-11 h-11 text-emerald-400 mx-auto mb-3" />
                )}
                <div className="text-sm sm:text-base font-bold text-white">
                  {isHolidayFocus
                    ? 'Drop any holiday circular, academic calendar, screenshot, or spreadsheet'
                    : 'Drop any timetable, attendance report, holiday circular, or calendar file here'}
                </div>
                <p className="text-xs text-white/60 mt-1">
                  or click to browse any file from your device (supports multiple files at once)
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById('universalAcademicFileInput')?.click();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Browse Files</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById('cameraScanInput')?.click();
                    }}
                    className="px-4 py-2 rounded-xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Scan Photo / Camera</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5 text-[11px] text-white/70 text-left">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>PNG, JPG, WebP, HEIC</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>PDF, DOCX, PPTX, TXT</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>XLSX, XLS, CSV, HTML</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>ICS, JSON, ZIP, MD</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.1] space-y-3">
                <label
                  htmlFor="pasteAcademicTextArea"
                  className="block text-xs font-medium text-white/60"
                >
                  {isHolidayFocus
                    ? 'Paste holiday circular text, academic calendar dates, or CSV rows'
                    : 'Paste timetable rows, past attendance counts, or holiday dates'}
                </label>
                <textarea
                  id="pasteAcademicTextArea"
                  rows={6}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={
                    isHolidayFocus
                      ? 'Academic Calendar 2026:\nOct 2, 2026 - Gandhi Jayanti (National Holiday)\nNov 8 - Nov 12, 2026: Diwali Break\nDec 21, 2026 to Jan 3, 2027 - Winter Semester Recess'
                      : 'Monday 09:00 - 10:00 CS201 Data Structures (Hall A)\nOct 20, 2026 - Midterm Break'
                  }
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input placeholder-white/40 font-mono leading-relaxed"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleScanPastedText}
                    disabled={!pastedText.trim()}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{isHolidayFocus ? 'Extract Holidays' : 'Extract Records'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white/60 leading-relaxed">
              {isHolidayFocus ? (
                <>
                  Detects single-day holidays, multi-day festival or semester breaks, holiday categories, and{' '}
                  <strong className="text-white">automatic class suspension</strong> rules from circulars, screenshots, PDFs, spreadsheets, and calendars. Every holiday can be edited before saving.
                </>
              ) : (
                <>
                  Automatically builds your <strong className="text-white">Subjects</strong>, <strong className="text-white">Weekly Timetable</strong>,{' '}
                  <strong className="text-white">Past Attendance History</strong>, <strong className="text-white">Assignments</strong>, and{' '}
                  <strong className="text-white">Holidays</strong> based on what is inside your uploaded file. You can review and edit every item before saving.
                </>
              )}
            </div>
          </div>
        )}

        {step === 'scanning' && (
          <div className="py-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin mx-auto shadow-lg shadow-emerald-500/30" />
            <div className="space-y-1">
              <h3 className="font-bold text-base text-white">
                {isHolidayFocus
                  ? 'Scanning Holiday Dates & Recess Rules...'
                  : 'Reading & Structuring File Content...'}
              </h3>
              <p className="text-xs text-white/60">
                {isHolidayFocus ? (
                  <>
                    Extracting holiday names, date ranges, and class suspension settings from{' '}
                    <strong className="text-white">{fileName}</strong>
                  </>
                ) : (
                  <>
                    Extracting courses, schedules, holidays, and past attendance records from{' '}
                    <strong className="text-white">{fileName}</strong>
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{documentSummary}</span>
              </div>
              <span className="font-mono tabular-nums text-[11px] text-emerald-300 shrink-0">
                {totalSelected} items selected
              </span>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
              {isHolidayFocus && (
                <button
                  type="button"
                  onClick={() => setActiveTab('holidays')}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'holidays'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Palmtree className="w-3.5 h-3.5" />
                  <span>Holidays ({holidayCandidates.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'schedule'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Timetable ({classCandidates.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'attendance'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Past Attendance ({summaryCandidates.length + attendanceCandidates.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('subjects')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'subjects'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Subjects ({subjectCandidates.length})</span>
              </button>

              {!isHolidayFocus && (
                <button
                  type="button"
                  onClick={() => setActiveTab('holidays')}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'holidays'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Palmtree className="w-3.5 h-3.5" />
                  <span>Holidays ({holidayCandidates.length})</span>
                </button>
              )}

              {assignmentCandidates.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('assignments')}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'assignments'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Assignments ({assignmentCandidates.length})</span>
                </button>
              )}
            </div>

            {/* Tab 1: Timetable Classes */}
            {activeTab === 'schedule' && (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
                {classCandidates.length === 0 ? (
                  <div className="py-8 text-center text-white/60 border border-dashed border-white/[0.1] rounded-xl">
                    No recurring weekly class slots were found in this file. Check the Past Attendance or Subjects tabs.
                  </div>
                ) : (
                  classCandidates.map((cand) => (
                    <div
                      key={cand.id}
                      className={`p-3 rounded-xl border transition-all ${
                        cand.selected
                          ? cand.hasConflict
                            ? 'border-amber-500/50 bg-amber-950/20'
                            : 'border-white/[0.12] bg-white/[0.04]'
                          : 'border-white/[0.05] bg-white/[0.02] opacity-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={cand.selected}
                          aria-label={`Select class ${cand.code}`}
                          onChange={() =>
                            setClassCandidates((prev) =>
                              prev.map((c) => (c.id === cand.id ? { ...c, selected: !c.selected } : c))
                            )
                          }
                          className="mt-1 w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                        />

                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={cand.code}
                              aria-label="Course code"
                              onChange={(e) =>
                                setClassCandidates((prev) =>
                                  prev.map((c) => (c.id === cand.id ? { ...c, code: e.target.value } : c))
                                )
                              }
                              className="font-mono font-bold w-24 px-2 py-1 rounded glass-input text-xs"
                            />
                            <input
                              type="text"
                              value={cand.subjectName}
                              aria-label="Subject name"
                              onChange={(e) =>
                                setClassCandidates((prev) =>
                                  prev.map((c) =>
                                    c.id === cand.id ? { ...c, subjectName: e.target.value } : c
                                  )
                                )
                              }
                              className="flex-1 min-w-[160px] font-semibold px-2 py-1 rounded glass-input text-xs"
                            />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                            <div>
                              <span className="text-white/60 block text-[10px] mb-0.5">Day</span>
                              <select
                                value={cand.day}
                                aria-label="Class weekday"
                                onChange={(e) =>
                                  setClassCandidates((prev) =>
                                    prev.map((c) =>
                                      c.id === cand.id ? { ...c, day: e.target.value as DayOfWeek } : c
                                    )
                                  )
                                }
                                className="w-full px-2 py-1 rounded glass-input text-[11px]"
                              >
                                {ALL_DAYS.map((d) => (
                                  <option key={d} value={d} className="bg-[#0d1320]">
                                    {d}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <span className="text-white/60 block text-[10px] mb-0.5">Time (24h)</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={cand.startTime}
                                  aria-label="Start time"
                                  onChange={(e) =>
                                    setClassCandidates((prev) =>
                                      prev.map((c) =>
                                        c.id === cand.id ? { ...c, startTime: e.target.value } : c
                                      )
                                    )
                                  }
                                  className="w-14 px-1.5 py-1 rounded glass-input text-[10px] font-mono tabular-nums"
                                />
                                <span>-</span>
                                <input
                                  type="text"
                                  value={cand.endTime}
                                  aria-label="End time"
                                  onChange={(e) =>
                                    setClassCandidates((prev) =>
                                      prev.map((c) =>
                                        c.id === cand.id ? { ...c, endTime: e.target.value } : c
                                      )
                                    )
                                  }
                                  className="w-14 px-1.5 py-1 rounded glass-input text-[10px] font-mono tabular-nums"
                                />
                              </div>
                            </div>

                            <div>
                              <span className="text-white/60 block text-[10px] mb-0.5">Room</span>
                              <input
                                type="text"
                                value={cand.room}
                                aria-label="Classroom"
                                onChange={(e) =>
                                  setClassCandidates((prev) =>
                                    prev.map((c) => (c.id === cand.id ? { ...c, room: e.target.value } : c))
                                  )
                                }
                                className="w-full px-2 py-1 rounded glass-input text-[11px]"
                              />
                            </div>

                            <div>
                              <span className="text-white/60 block text-[10px] mb-0.5">Instructor</span>
                              <input
                                type="text"
                                value={cand.faculty}
                                aria-label="Instructor"
                                onChange={(e) =>
                                  setClassCandidates((prev) =>
                                    prev.map((c) =>
                                      c.id === cand.id ? { ...c, faculty: e.target.value } : c
                                    )
                                  )
                                }
                                className="w-full px-2 py-1 rounded glass-input text-[11px]"
                              />
                            </div>
                          </div>

                          {cand.hasConflict && (
                            <div className="text-[11px] text-amber-300 font-medium flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>{cand.conflictDetails}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Past Attendance (Summary Counts + Dated Logs) */}
            {activeTab === 'attendance' && (
              <div className="max-h-72 overflow-y-auto space-y-3 pr-1 text-xs">
                {summaryCandidates.length === 0 && attendanceCandidates.length === 0 ? (
                  <div className="py-8 text-center text-white/60 border border-dashed border-white/[0.1] rounded-xl">
                    No past attendance counts or dated logs were detected in this file.
                  </div>
                ) : (
                  <>
                    {summaryCandidates.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                          <span className="font-bold text-white">
                            Past Attendance Totals ({summaryCandidates.length} courses)
                          </span>
                          <label className="flex items-center gap-1.5 text-[11px] text-white/70 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={replaceSummaryAttendance}
                              onChange={(e) => setReplaceSummaryAttendance(e.target.checked)}
                              className="accent-emerald-500 rounded"
                            />
                            <span>Replace existing records for these subjects</span>
                          </label>
                        </div>

                        {summaryCandidates.map((sum) => {
                          const total = sum.attended + sum.missed;
                          const pct = total > 0 ? ((sum.attended / total) * 100).toFixed(1) : '0.0';
                          return (
                            <div
                              key={sum.id}
                              className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.1] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={sum.selected}
                                  aria-label={`Select attendance summary for ${sum.code}`}
                                  onChange={() =>
                                    setSummaryCandidates((prev) =>
                                      prev.map((s) =>
                                        s.id === sum.id ? { ...s, selected: !s.selected } : s
                                      )
                                    )
                                  }
                                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                                />
                                <div>
                                  <div className="font-bold text-white">
                                    <span className="font-mono text-emerald-400">{sum.code}</span> ·{' '}
                                    {sum.subjectName}
                                  </div>
                                  <div className="text-[11px] text-white/60 tabular-nums">
                                    Calculated: <strong className="text-white">{pct}%</strong> ({sum.attended}/
                                    {total} classes)
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div>
                                  <span className="block text-[10px] text-emerald-400 mb-0.5">Attended</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={sum.attended}
                                    aria-label={`Attended count for ${sum.code}`}
                                    onChange={(e) =>
                                      setSummaryCandidates((prev) =>
                                        prev.map((s) =>
                                          s.id === sum.id
                                            ? { ...s, attended: Math.max(0, Number(e.target.value) || 0) }
                                            : s
                                        )
                                      )
                                    }
                                    className="w-16 px-2 py-1 rounded glass-input font-mono tabular-nums text-xs"
                                  />
                                </div>
                                <div>
                                  <span className="block text-[10px] text-rose-300 mb-0.5">Missed</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={sum.missed}
                                    aria-label={`Missed count for ${sum.code}`}
                                    onChange={(e) =>
                                      setSummaryCandidates((prev) =>
                                        prev.map((s) =>
                                          s.id === sum.id
                                            ? { ...s, missed: Math.max(0, Number(e.target.value) || 0) }
                                            : s
                                        )
                                      )
                                    }
                                    className="w-16 px-2 py-1 rounded glass-input font-mono tabular-nums text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {attendanceCandidates.length > 0 && (
                      <div className="space-y-2">
                        <span className="font-bold text-white block">
                          Dated Past Attendance Logs ({attendanceCandidates.length} entries)
                        </span>
                        {attendanceCandidates.map((rec) => (
                          <div
                            key={rec.id}
                            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-wrap items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={rec.selected}
                                aria-label={`Select attendance log ${rec.code} ${rec.date}`}
                                onChange={() =>
                                  setAttendanceCandidates((prev) =>
                                    prev.map((r) =>
                                      r.id === rec.id ? { ...r, selected: !r.selected } : r
                                    )
                                  )
                                }
                                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                              />
                              <span className="font-mono font-bold text-emerald-400">{rec.code}</span>
                              <span className="text-white/80">{rec.subjectName}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={rec.date}
                                aria-label="Attendance date"
                                onChange={(e) =>
                                  setAttendanceCandidates((prev) =>
                                    prev.map((r) =>
                                      r.id === rec.id ? { ...r, date: e.target.value } : r
                                    )
                                  )
                                }
                                className="px-2 py-1 rounded glass-input font-mono tabular-nums text-[11px]"
                              />
                              <select
                                value={rec.status}
                                aria-label="Attendance status"
                                onChange={(e) =>
                                  setAttendanceCandidates((prev) =>
                                    prev.map((r) =>
                                      r.id === rec.id
                                        ? {
                                            ...r,
                                            status: e.target.value as 'present' | 'absent' | 'cancelled',
                                          }
                                        : r
                                    )
                                  )
                                }
                                className="px-2 py-1 rounded glass-input text-[11px] capitalize"
                              >
                                <option value="present" className="bg-[#0d1320]">Present</option>
                                <option value="absent" className="bg-[#0d1320]">Absent</option>
                                <option value="cancelled" className="bg-[#0d1320]">Cancelled</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Tab 3: Subjects */}
            {activeTab === 'subjects' && (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
                {subjectCandidates.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.1] flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                      <input
                        type="checkbox"
                        checked={sub.selected}
                        aria-label={`Select subject ${sub.code}`}
                        onChange={() =>
                          setSubjectCandidates((prev) =>
                            prev.map((s) => (s.id === sub.id ? { ...s, selected: !s.selected } : s))
                          )
                        }
                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={sub.code}
                        aria-label="Subject code"
                        onChange={(e) =>
                          setSubjectCandidates((prev) =>
                            prev.map((s) =>
                              s.id === sub.id ? { ...s, code: e.target.value.toUpperCase() } : s
                            )
                          )
                        }
                        className="font-mono font-bold w-24 px-2 py-1 rounded glass-input"
                      />
                      <input
                        type="text"
                        value={sub.name}
                        aria-label="Subject title"
                        onChange={(e) =>
                          setSubjectCandidates((prev) =>
                            prev.map((s) => (s.id === sub.id ? { ...s, name: e.target.value } : s))
                          )
                        }
                        className="flex-1 px-2 py-1 rounded glass-input font-semibold"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-white/60">Target %:</span>
                      <input
                        type="number"
                        min="50"
                        max="100"
                        value={sub.targetAttendance}
                        aria-label={`Target attendance for ${sub.code}`}
                        onChange={(e) =>
                          setSubjectCandidates((prev) =>
                            prev.map((s) =>
                              s.id === sub.id
                                ? { ...s, targetAttendance: Number(e.target.value) || 75 }
                                : s
                            )
                          )
                        }
                        className="w-16 px-2 py-1 rounded glass-input font-mono tabular-nums"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 4: Holidays (Editable Single & Multi-Day Breaks) */}
            {activeTab === 'holidays' && (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white">
                    Scanned Holidays & Breaks ({holidayCandidates.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddHolidayRow}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Holiday Row</span>
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                  {holidayCandidates.length === 0 ? (
                    <div className="py-8 text-center text-white/60 border border-dashed border-white/[0.1] rounded-xl space-y-2">
                      <p>No holidays were detected in this file.</p>
                      <button
                        type="button"
                        onClick={handleAddHolidayRow}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Holiday Manually</span>
                      </button>
                    </div>
                  ) : (
                    holidayCandidates.map((hol) => (
                      <div
                        key={hol.id}
                        className={`p-3 rounded-xl border transition-all ${
                          hol.selected
                            ? 'border-white/[0.12] bg-white/[0.04]'
                            : 'border-white/[0.05] bg-white/[0.02] opacity-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={hol.selected}
                            aria-label={`Select holiday ${hol.title || 'row'}`}
                            onChange={() =>
                              setHolidayCandidates((prev) =>
                                prev.map((h) =>
                                  h.id === hol.id ? { ...h, selected: !h.selected } : h
                                )
                              )
                            }
                            className="mt-1.5 w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0"
                          />

                          <div className="flex-1 space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                              <div className="sm:col-span-7">
                                <span className="text-white/60 block text-[10px] mb-0.5">
                                  Holiday / Recess Name
                                </span>
                                <input
                                  type="text"
                                  value={hol.title}
                                  placeholder="e.g. Diwali Break"
                                  aria-label="Holiday name"
                                  onChange={(e) =>
                                    setHolidayCandidates((prev) =>
                                      prev.map((h) =>
                                        h.id === hol.id ? { ...h, title: e.target.value } : h
                                      )
                                    )
                                  }
                                  className="w-full font-semibold px-2.5 py-1.5 rounded-lg glass-input text-xs"
                                />
                              </div>

                              <div className="sm:col-span-5">
                                <span className="text-white/60 block text-[10px] mb-0.5">
                                  Category
                                </span>
                                <select
                                  value={hol.type}
                                  aria-label="Holiday category"
                                  onChange={(e) =>
                                    setHolidayCandidates((prev) =>
                                      prev.map((h) =>
                                        h.id === hol.id
                                          ? { ...h, type: e.target.value as HolidayType }
                                          : h
                                      )
                                    )
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs"
                                >
                                  {HOLIDAY_CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value} className="bg-[#0d1320]">
                                      {cat.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-end justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <div>
                                  <span className="text-white/60 block text-[10px] mb-0.5">
                                    Start Date
                                  </span>
                                  <input
                                    type="date"
                                    value={hol.startDate}
                                    aria-label="Holiday start date"
                                    onChange={(e) => {
                                      const nextStart = e.target.value;
                                      setHolidayCandidates((prev) =>
                                        prev.map((h) =>
                                          h.id === hol.id
                                            ? {
                                                ...h,
                                                startDate: nextStart,
                                                endDate:
                                                  h.endDate && h.endDate >= nextStart
                                                    ? h.endDate
                                                    : nextStart,
                                              }
                                            : h
                                        )
                                      );
                                    }}
                                    className="px-2.5 py-1 rounded-lg glass-input font-mono tabular-nums text-[11px]"
                                  />
                                </div>
                                <div>
                                  <span className="text-white/60 block text-[10px] mb-0.5">
                                    End Date
                                  </span>
                                  <input
                                    type="date"
                                    value={hol.endDate}
                                    min={hol.startDate}
                                    aria-label="Holiday end date"
                                    onChange={(e) =>
                                      setHolidayCandidates((prev) =>
                                        prev.map((h) =>
                                          h.id === hol.id ? { ...h, endDate: e.target.value } : h
                                        )
                                      )
                                    }
                                    className="px-2.5 py-1 rounded-lg glass-input font-mono tabular-nums text-[11px]"
                                  />
                                </div>
                              </div>

                              <label className="flex items-center gap-1.5 text-[11px] text-white/70 cursor-pointer pb-1">
                                <input
                                  type="checkbox"
                                  checked={hol.cancelsClasses}
                                  onChange={(e) =>
                                    setHolidayCandidates((prev) =>
                                      prev.map((h) =>
                                        h.id === hol.id
                                          ? { ...h, cancelsClasses: e.target.checked }
                                          : h
                                      )
                                    )
                                  }
                                  className="accent-emerald-500 rounded cursor-pointer"
                                />
                                <span>Suspend scheduled classes</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 5: Assignments */}
            {activeTab === 'assignments' && (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
                {assignmentCandidates.map((asg) => (
                  <div
                    key={asg.id}
                    className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between gap-2"
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={asg.selected}
                        onChange={() =>
                          setAssignmentCandidates((prev) =>
                            prev.map((a) => (a.id === asg.id ? { ...a, selected: !a.selected } : a))
                          )
                        }
                        className="w-4 h-4 accent-emerald-500 rounded"
                      />
                      <span className="text-emerald-400 font-mono font-semibold">{asg.subjectCode}</span>
                      <span className="text-white font-medium">{asg.title}</span>
                    </label>
                    <span className="font-mono tabular-nums text-white/60 text-[11px]">Due {asg.dueDate}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white cursor-pointer"
              >
                {inputMethod === 'paste' ? 'Scan Another List' : 'Upload Another File'}
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={totalSelected === 0}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {isOnlyHolidaysSelected
                    ? `Save ${selectedCounts.holidays} ${
                        selectedCounts.holidays === 1 ? 'Holiday' : 'Holidays'
                      } to Calendar`
                    : 'Apply Selected Data to Workspace'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

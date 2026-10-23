import React, { useState } from 'react';
import { ImportedClassCandidate, TimetableEntry, Subject, DayOfWeek } from '../../types/oggytrack';
import { parseTimetableFile } from '../../utils/timetableParser';
import { ModalShell } from '../common/ModalShell';
import { 
  FileText, 
  Check, 
  AlertTriangle, 
  ShieldCheck
} from 'lucide-react';

interface TimetableImporterProps {
  userId?: string;
  existingTimetable: TimetableEntry[];
  subjects: Subject[];
  onImportConfirmed: (entries: TimetableEntry[], newSubjects: Subject[]) => void;
  onClose: () => void;
}

export const TimetableImporter: React.FC<TimetableImporterProps> = ({
  userId = 'usr_student',
  existingTimetable,
  subjects,
  onImportConfirmed,
  onClose,
}) => {
  const [step, setStep] = useState<'upload' | 'scanning' | 'review'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [candidates, setCandidates] = useState<ImportedClassCandidate[]>([]);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setFileName(file.name);
    setStep('scanning');

    try {
      // Simulate OCR and table extraction pipeline
      await new Promise((resolve) => setTimeout(resolve, 1400));
      const res = await parseTimetableFile(file, existingTimetable);
      setCandidates(res.candidates);
      setStep('review');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process timetable document.');
      setStep('upload');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const toggleSelectCandidate = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const updateCandidateField = (id: string, field: keyof ImportedClassCandidate, value: any) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleConfirmImport = () => {
    const selected = candidates.filter((c) => c.selected);
    const newSubjectsMap = new Map<string, Subject>();

    const convertedEntries: TimetableEntry[] = selected.map((cand) => {
      const match = subjects.find(
        (s) => s.code.toLowerCase() === cand.code.toLowerCase() || s.name.toLowerCase() === cand.subjectName.toLowerCase()
      );
      const genId = match?.id || `sub_gen_${cand.code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      if (!match && !newSubjectsMap.has(genId)) {
        newSubjectsMap.set(genId, {
          id: genId,
          userId,
          name: cand.subjectName,
          code: cand.code.toUpperCase(),
          credits: 3,
          faculty: cand.faculty,
          room: cand.room,
          color: '#a855f7',
          targetAttendance: 75,
          createdAt: new Date().toISOString(),
        });
      }

      return {
        id: `tt_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        subjectId: genId,
        subjectName: cand.subjectName,
        code: cand.code.toUpperCase(),
        day: cand.day,
        startTime: cand.startTime,
        endTime: cand.endTime,
        room: cand.room,
        faculty: cand.faculty,
        type: cand.type,
        color: match?.color || '#a855f7',
        recurrence: 'weekly',
      };
    });

    onImportConfirmed(convertedEntries, Array.from(newSubjectsMap.values()));
  };

  return (
    <ModalShell
      title="Intelligent Timetable Importer"
      subtitle="OCR and table parsing for scanned college timetables, PDFs, images, and spreadsheets"
      onClose={onClose}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-6">

        {/* Step 1: Upload Dropzone */}
        {step === 'upload' && (
          <div className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-purple-400 bg-purple-950/30'
                  : 'border-white/20 bg-white/[0.02] hover:border-purple-500/50 hover:bg-white/[0.04]'
              }`}
              onClick={() => document.getElementById('timetableFileInput')?.click()}
            >
              <input
                id="timetableFileInput"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />
              <FileText className="w-10 h-10 text-purple-400 mx-auto mb-3" />
              <div className="text-sm font-bold text-white">
                Drag and drop your timetable document here
              </div>
              <p className="text-xs text-slate-400 mt-1">
                or click to browse from your device
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-[10px] text-purple-300 font-mono">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">PDF</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">PNG / JPG</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">CSV</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">Excel (.XLSX)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200/90 leading-relaxed">
              💡 <strong>Privacy & Security:</strong> Parsing runs securely on your machine. You will be able to preview, edit, or deselect any detected class before it gets saved.
            </div>
          </div>
        )}

        {/* Step 2: Scanning / OCR Extraction Animation */}
        {step === 'scanning' && (
          <div className="py-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-3 border-purple-500 border-t-transparent animate-spin mx-auto shadow-lg shadow-purple-500/30" />
            <div className="space-y-1">
              <h3 className="font-bold text-base text-white">Scanning Document & Analyzing Grids...</h3>
              <p className="text-xs text-slate-400">
                Running optical character recognition, weekday mapping, and conflict checks on <strong>{fileName}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Review & Edit Detected Candidates */}
        {step === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">
                Detected {candidates.length} Class Sessions
              </span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-4 h-4" /> Ready for verification
              </span>
            </div>

            {/* Candidates Table */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  className={`p-3 rounded-xl border transition-all ${
                    cand.selected
                      ? cand.hasConflict
                        ? 'border-amber-500/50 bg-amber-950/20'
                        : 'border-white/15 bg-white/5'
                      : 'border-white/5 bg-white/[0.02] opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={cand.selected}
                      onChange={() => toggleSelectCandidate(cand.id)}
                      className="mt-1 w-4 h-4 accent-purple-600 rounded cursor-pointer"
                    />

                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={cand.code}
                            onChange={(e) => updateCandidateField(cand.id, 'code', e.target.value)}
                            className="font-mono font-bold w-20 px-2 py-0.5 rounded bg-white/10 text-white text-xs border border-white/10"
                          />
                          <input
                            type="text"
                            value={cand.subjectName}
                            onChange={(e) => updateCandidateField(cand.id, 'subjectName', e.target.value)}
                            className="font-semibold px-2 py-0.5 rounded bg-white/10 text-white text-xs border border-white/10"
                          />
                        </div>

                        <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">
                          {Math.round(cand.confidence * 100)}% Confidence
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Day</span>
                          <select
                            value={cand.day}
                            onChange={(e) => updateCandidateField(cand.id, 'day', e.target.value as DayOfWeek)}
                            className="w-full px-2 py-1 rounded bg-white/10 border border-white/10 text-white text-[11px]"
                          >
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d) => (
                              <option key={d} value={d} className="bg-slate-900">{d}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Time</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={cand.startTime}
                              onChange={(e) => updateCandidateField(cand.id, 'startTime', e.target.value)}
                              className="w-14 px-1 py-1 rounded bg-white/10 border border-white/10 text-white text-[10px] font-mono"
                            />
                            <span>-</span>
                            <input
                              type="text"
                              value={cand.endTime}
                              onChange={(e) => updateCandidateField(cand.id, 'endTime', e.target.value)}
                              className="w-14 px-1 py-1 rounded bg-white/10 border border-white/10 text-white text-[10px] font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Room</span>
                          <input
                            type="text"
                            value={cand.room}
                            onChange={(e) => updateCandidateField(cand.id, 'room', e.target.value)}
                            className="w-full px-2 py-1 rounded bg-white/10 border border-white/10 text-white text-[11px]"
                          />
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Instructor</span>
                          <input
                            type="text"
                            value={cand.faculty}
                            onChange={(e) => updateCandidateField(cand.id, 'faculty', e.target.value)}
                            className="w-full px-2 py-1 rounded bg-white/10 border border-white/10 text-white text-[11px]"
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
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300"
              >
                Scan Another File
              </button>

              <button
                onClick={handleConfirmImport}
                disabled={candidates.filter((c) => c.selected).length === 0}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save {candidates.filter((c) => c.selected).length} Classes to Timetable</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

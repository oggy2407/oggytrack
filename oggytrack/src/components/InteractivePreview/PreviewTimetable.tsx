import React, { useState } from 'react';
import { DesignConfig, ClassSession } from '../../types/design';
import { MOCK_CLASSES } from '../../utils/mockAcademicData';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Plus, 
  Filter, 
  UploadCloud, 
  FileText, 
  Check, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

interface PreviewTimetableProps {
  config: DesignConfig;
}

export const PreviewTimetable: React.FC<PreviewTimetableProps> = ({ config }) => {
  const [classes, setClasses] = useState<ClassSession[]>(MOCK_CLASSES);
  const [activeView, setActiveView] = useState<'week' | 'day' | 'agenda'>('week');
  const [selectedDay, setSelectedDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'>('Wednesday');
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importStep, setImportStep] = useState<'upload' | 'scanning' | 'preview'>('upload');

  const days: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday')[] = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
  ];

  const handleSimulateScan = () => {
    setImportStep('scanning');
    setTimeout(() => {
      setImportStep('preview');
    }, 1500);
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Academic Timetable
            </h1>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              Semester 5 · 2026
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Synchronized schedule with conflict warnings and attendance sync
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/60 text-xs">
            {(['week', 'day', 'agenda'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-3 py-1 font-medium capitalize rounded-md transition-colors ${
                  activeView === view
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {view}
              </button>
            ))}
          </div>

          {/* Import Timetable Button */}
          <button
            onClick={() => {
              setImportStep('upload');
              setShowImportModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-white shadow-xs transition-opacity hover:opacity-95"
            style={{ backgroundColor: config.accentColor }}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Import Timetable</span>
          </button>
        </div>
      </div>

      {/* Week Day selector if on day view */}
      {activeView === 'day' && (
        <div className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 overflow-x-auto">
            {days.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedDay === d
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {d} {d === 'Wednesday' && '· Today'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Timetable Content */}
      {activeView === 'week' ? (
        <div className={`p-4 border bg-white dark:bg-slate-900 ${config.borderRadius} border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto`}>
          <div className="min-w-[700px] grid grid-cols-5 gap-3">
            {days.map((day) => {
              const dayClasses = classes.filter((c) => c.day === day);
              const isToday = day === 'Wednesday';

              return (
                <div
                  key={day}
                  className={`rounded-lg p-2.5 flex flex-col min-h-[380px] border ${
                    isToday
                      ? 'border-indigo-400/70 bg-indigo-50/15 dark:bg-indigo-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-700/60">
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                      {day}
                    </span>
                    {isToday ? (
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                        Today
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">{dayClasses.length} sessions</span>
                    )}
                  </div>

                  {/* Class Cards for Day */}
                  <div className="space-y-2 flex-1">
                    {dayClasses.map((cls) => (
                      <div
                        key={cls.id}
                        onClick={() => setSelectedClass(cls)}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all cursor-pointer group text-left"
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span
                            className="font-bold text-xs font-mono"
                            style={{ color: cls.color }}
                          >
                            {cls.code}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {cls.type}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 transition-colors">
                          {cls.subjectName}
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{cls.startTime} - {cls.endTime}</span>
                        </div>

                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{cls.room}</span>
                        </div>
                      </div>
                    ))}

                    {dayClasses.length === 0 && (
                      <div className="h-full flex items-center justify-center p-4 text-center text-xs text-slate-400">
                        No scheduled classes
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeView === 'day' ? (
        <div className={`p-5 border bg-white dark:bg-slate-900 ${config.borderRadius} border-slate-200 dark:border-slate-800 space-y-3`}>
          {classes.filter((c) => c.day === selectedDay).map((cls) => (
            <div
              key={cls.id}
              onClick={() => setSelectedClass(cls)}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-between cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-12 rounded-full"
                  style={{ backgroundColor: cls.color }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                      {cls.code}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                      {cls.type}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                    {cls.subjectName}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-4 mt-1">
                    <span>{cls.startTime} - {cls.endTime}</span>
                    <span>{cls.room}</span>
                    <span>{cls.faculty}</span>
                  </div>
                </div>
              </div>

              <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                View Details →
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Agenda View */
        <div className={`p-5 border bg-white dark:bg-slate-900 ${config.borderRadius} border-slate-200 dark:border-slate-800 space-y-4`}>
          {days.map((d) => (
            <div key={d} className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {d}
              </div>
              <div className="space-y-1.5">
                {classes.filter((c) => c.day === d).map((cls) => (
                  <div
                    key={cls.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold w-16">{cls.startTime}</span>
                      <span className="font-bold">{cls.code}</span>
                      <span className="text-slate-600 dark:text-slate-400">{cls.subjectName}</span>
                    </div>
                    <div className="text-slate-500">{cls.room}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Class Details Modal */}
      {selectedClass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedClass.code} · {selectedClass.type}
                </span>
                <h3 className="text-lg font-bold mt-1">{selectedClass.subjectName}</h3>
              </div>
              <button
                onClick={() => setSelectedClass(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 my-5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2 p-2 rounded bg-slate-50 dark:bg-slate-800">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Every {selectedClass.day} from <strong>{selectedClass.startTime}</strong> to <strong>{selectedClass.endTime}</strong></span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-slate-50 dark:bg-slate-800">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Classroom: <strong>{selectedClass.room}</strong></span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-slate-50 dark:bg-slate-800">
                <User className="w-4 h-4 text-slate-400" />
                <span>Instructor: <strong>{selectedClass.faculty}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedClass(null)}
                className="flex-1 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                onClick={() => setSelectedClass(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg text-white"
                style={{ backgroundColor: config.accentColor }}
              >
                Edit Class Info
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timetable Import Preview Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Import Academic Timetable</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload PDF, Image (PNG/JPG), Excel XLSX, or CSV schedule file
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {importStep === 'upload' && (
              <div className="py-6 space-y-4">
                <div
                  onClick={handleSimulateScan}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Click to browse or drop timetable file here
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Supports Official College PDFs, Scanned Timetable Photos, CSV & Excel
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  ⚡ <strong>Intelligent Parsing Engine</strong> will automatically extract subjects, faculty names, weekdays, time slots, and detect schedule conflicts for your manual review.
                </div>
              </div>
            )}

            {importStep === 'scanning' && (
              <div className="py-10 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-xs font-semibold">Extracting Timetable Data...</div>
                <div className="text-[11px] text-slate-400">
                  Running document OCR, table boundary analysis & subject detection
                </div>
              </div>
            )}

            {importStep === 'preview' && (
              <div className="py-4 space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Detected 5 Class Sessions</span>
                  <span className="text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> High Confidence
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 text-xs">
                  {[
                    { code: 'CS301', title: 'Algorithms & Complexity', time: 'Mon, Wed, Fri 09:30-10:45', room: 'Hall B' },
                    { code: 'CS304', title: 'Operating Systems & Kernels', time: 'Wed, Fri 11:00-12:15', room: 'Room 201' },
                    { code: 'CS310', title: 'Distributed Database Systems', time: 'Tue, Thu 10:00-11:30', room: 'Room 304' },
                  ].map((row, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold font-mono">{row.code}</span> · {row.title}
                        <div className="text-[11px] text-slate-400">{row.time} · {row.room}</div>
                      </div>
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Ready</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="flex-1 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                    }}
                    className="flex-1 py-2 text-xs font-semibold rounded-lg text-white"
                    style={{ backgroundColor: config.accentColor }}
                  >
                    Confirm & Save to Timetable
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

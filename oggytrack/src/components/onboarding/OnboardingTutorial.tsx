import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { UserProfile, Subject, TimetableEntry, DayOfWeek, ClassType } from '../../types/oggytrack';
import { db } from '../../utils/storage';
import { getDayOfWeekFromDate } from '../../utils/dateUtils';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  BookOpen, 
  Calendar, 
  User, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  GraduationCap,
  Layers,
  MapPin,
  Clock
} from 'lucide-react';

interface OnboardingTutorialProps {
  user: UserProfile;
  onFinish: (updatedUser: UserProfile, subjects: Subject[], timetable: TimetableEntry[]) => void;
  onSkip: () => void;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  user,
  onFinish,
  onSkip,
}) => {
  const [step, setStep] = useState<number>(1);

  // Step 1: Profile state
  const [name, setName] = useState(user.name || '');
  const [institution, setInstitution] = useState(user.institution || 'College of Technology');
  const [degree, setDegree] = useState(user.degree || 'B.Tech Computer Science');
  const [semester, setSemester] = useState(user.semester || 'Semester 1');
  const [targetAttendance, setTargetAttendance] = useState(user.targetAttendance || 75);

  // Step 2: Subjects state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubFaculty, setNewSubFaculty] = useState('');
  const [newSubRoom, setNewSubRoom] = useState('');
  const [newSubColor, setNewSubColor] = useState('#8b5cf6');

  // Step 3: Timetable state
  const workingDays: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const liveWeekday = getDayOfWeekFromDate(new Date());
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [newTtSubjectId, setNewTtSubjectId] = useState('');
  const [newTtDay, setNewTtDay] = useState<DayOfWeek>(
    workingDays.includes(liveWeekday) ? liveWeekday : 'Monday'
  );
  const [newTtStartTime, setNewTtStartTime] = useState('09:30');
  const [newTtEndTime, setNewTtEndTime] = useState('10:45');
  const [newTtType, setNewTtType] = useState<ClassType>('Lecture');
  const [newTtRoom, setNewTtRoom] = useState('');

  const COLOR_PALETTE = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#3b82f6'];

  // Handle adding subject in Step 2
  const handleAddSubject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSubName.trim() || !newSubCode.trim()) return;

    const sub: Subject = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      name: newSubName.trim(),
      code: newSubCode.trim().toUpperCase(),
      credits: 4,
      faculty: newSubFaculty.trim() || 'Professor',
      room: newSubRoom.trim() || 'Room 101',
      color: newSubColor,
      targetAttendance,
      createdAt: new Date().toISOString(),
    };

    const updated = [...subjects, sub];
    setSubjects(updated);
    setNewSubName('');
    setNewSubCode('');
    setNewSubFaculty('');
    setNewSubRoom('');

    if (!newTtSubjectId) {
      setNewTtSubjectId(sub.id);
    }
  };

  const handleRemoveSubject = (id: string) => {
    setSubjects(subjects.filter((s) => s.id !== id));
    setTimetable(timetable.filter((t) => t.subjectId !== id));
    if (newTtSubjectId === id) {
      const remaining = subjects.filter((s) => s.id !== id);
      setNewTtSubjectId(remaining[0]?.id || '');
    }
  };

  const handleLoadSampleSubjects = () => {
    const samples = db.loadSampleEngineeringTemplate(user.id);
    setSubjects(samples.subjects);
    setTimetable(samples.timetable);
    if (samples.subjects.length > 0) {
      setNewTtSubjectId(samples.subjects[0].id);
    }
  };

  // Handle adding timetable entry in Step 3
  const handleAddTimetableEntry = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const sub = subjects.find((s) => s.id === newTtSubjectId);
    if (!sub) return;

    const entry: TimetableEntry = {
      id: `tt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      subjectId: sub.id,
      subjectName: sub.name,
      code: sub.code,
      day: newTtDay,
      startTime: newTtStartTime,
      endTime: newTtEndTime,
      room: newTtRoom.trim() || sub.room || 'Room 101',
      faculty: sub.faculty,
      type: newTtType,
      color: sub.color,
      recurrence: 'weekly',
    };

    setTimetable([...timetable, entry]);
    setNewTtRoom('');
  };

  const handleRemoveTimetableEntry = (id: string) => {
    setTimetable(timetable.filter((t) => t.id !== id));
  };

  // Final step completion
  const handleComplete = () => {
    const updatedUser: UserProfile = {
      ...user,
      name: name.trim() || user.name,
      institution: institution.trim(),
      degree: degree.trim(),
      semester: semester.trim(),
      targetAttendance,
      hasCompletedTutorial: true,
    };

    onFinish(updatedUser, subjects, timetable);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/85 backdrop-blur-xl animate-fade-in text-slate-100">
      <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Let's Get Started Setup Tutorial"
          className="bg-slate-900 border border-white/15 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative my-auto"
        >
          {/* Glow accent */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Let's Get Started</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                  Step {step} of 4
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Setup your subjects, timetable, and attendance goals in 2 minutes
              </p>
            </div>
          </div>

          <button
            onClick={onSkip}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
          >
            Skip for now
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-white/5 h-1">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Modal Body / Steps */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
          {/* STEP 1: Student Profile */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                <GraduationCap className="w-4 h-4" />
                <span>1. Customize Your Student Profile</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Oggy"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden focus:border-purple-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    College / University
                  </label>
                  <input
                    type="text"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. National Institute of Tech"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden focus:border-purple-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Degree & Branch
                  </label>
                  <input
                    type="text"
                    required
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    placeholder="e.g. B.Tech Computer Science"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden focus:border-purple-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Current Semester
                  </label>
                  <input
                    type="text"
                    required
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    placeholder="e.g. Semester 1"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden focus:border-purple-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Target Attendance</span>
                    <span className="font-bold text-purple-400">{targetAttendance}%</span>
                  </label>
                  <input
                    type="range"
                    min="60"
                    max="95"
                    step="5"
                    value={targetAttendance}
                    onChange={(e) => setTargetAttendance(Number(e.target.value))}
                    className="w-full accent-purple-500 h-2 bg-white/10 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>60%</span>
                    <span>75% (Standard)</span>
                    <span>95%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Add First Subjects */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                  <BookOpen className="w-4 h-4" />
                  <span>2. Add Your Courses & Subjects</span>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleSubjects}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 transition-all self-start cursor-pointer"
                >
                  ⚡ Load 4 Sample CS Courses
                </button>
              </div>

              {/* Add Subject mini-form */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <span className="text-xs font-bold text-white block">Add a Subject:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Subject Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Data Structures & Algorithms"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Subject Code *</label>
                    <input
                      type="text"
                      placeholder="e.g. CS201"
                      value={newSubCode}
                      onChange={(e) => setNewSubCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden text-xs font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Instructor / Professor</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Vance"
                      value={newSubFaculty}
                      onChange={(e) => setNewSubFaculty(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Classroom / Room</label>
                    <input
                      type="text"
                      placeholder="e.g. Hall 101"
                      value={newSubRoom}
                      onChange={(e) => setNewSubRoom(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 mr-1">Color:</span>
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewSubColor(c)}
                        className={`w-6 h-6 rounded-lg transition-transform ${
                          newSubColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddSubject}
                    disabled={!newSubName.trim() || !newSubCode.trim()}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Subject</span>
                  </button>
                </div>
              </div>

              {/* Added Subjects List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Configured Subjects ({subjects.length}):</span>
                  {subjects.length === 0 && (
                    <span className="text-amber-400">Add at least one subject to continue</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {subjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-3 h-8 rounded-full shrink-0"
                          style={{ backgroundColor: sub.color }}
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{sub.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {sub.code} · {sub.faculty}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(sub.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        title="Remove subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Schedule Timetable */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                <Calendar className="w-4 h-4" />
                <span>3. Schedule Your Class Sessions</span>
              </div>

              {subjects.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-white/5 border border-dashed border-white/15 text-xs text-slate-400">
                  Please add at least one subject in Step 2 first!
                </div>
              ) : (
                <>
                  {/* Class Scheduler form */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <span className="text-xs font-bold text-white block">Add a Timetable Slot:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">Select Subject</label>
                        <select
                          value={newTtSubjectId}
                          onChange={(e) => setNewTtSubjectId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                        >
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.code} - {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">Day of Week</label>
                        <select
                          value={newTtDay}
                          onChange={(e) => setNewTtDay(e.target.value as DayOfWeek)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                        >
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">Session Type</label>
                        <select
                          value={newTtType}
                          onChange={(e) => setNewTtType(e.target.value as ClassType)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                        >
                          <option value="Lecture">Lecture</option>
                          <option value="Lab">Lab</option>
                          <option value="Tutorial">Tutorial</option>
                          <option value="Seminar">Seminar</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">Start Time</label>
                        <input
                          type="time"
                          value={newTtStartTime}
                          onChange={(e) => setNewTtStartTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">End Time</label>
                        <input
                          type="time"
                          value={newTtEndTime}
                          onChange={(e) => setNewTtEndTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">Classroom / Room</label>
                        <input
                          type="text"
                          placeholder="e.g. Hall 101"
                          value={newTtRoom}
                          onChange={(e) => setNewTtRoom(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleAddTimetableEntry}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Class Slot</span>
                      </button>
                    </div>
                  </div>

                  {/* Scheduled slots list */}
                  <div className="space-y-2">
                    <span className="text-xs text-slate-400 block">
                      Scheduled Sessions ({timetable.length}):
                    </span>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {timetable.map((t) => (
                        <div
                          key={t.id}
                          className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="w-2.5 h-6 rounded-full"
                              style={{ backgroundColor: t.color }}
                            />
                            <div>
                              <div className="font-bold text-white">
                                {t.code} · {t.type}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {t.day} ({t.startTime} - {t.endTime}) · {t.room}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveTimetableEntry(t.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {timetable.length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-500">
                          No classes scheduled yet. Add slots above or skip to configure later.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 4: Ready to Track & Launch */}
          {step === 4 && (
            <div className="space-y-6 text-center py-4 animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-2xl shadow-purple-600/40">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">
                  You're all set, {name || user.name}!
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  Your workspace has been initialized with your profile, {subjects.length} subjects, and {timetable.length} weekly timetable sessions.
                </p>
              </div>

              {/* Workspace Snapshot */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-left grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Target</span>
                  <span className="text-lg font-bold text-purple-400">{targetAttendance}%</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Subjects</span>
                  <span className="text-lg font-bold text-white">{subjects.length}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Classes</span>
                  <span className="text-lg font-bold text-white">{timetable.length}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Mode</span>
                  <span className="text-xs font-bold text-emerald-400 block mt-1">Manual Edit</span>
                </div>
              </div>

              <div className="text-xs text-slate-400 max-w-md mx-auto">
                Everything can be edited or deleted manually anytime from your Subject, Timetable, and Settings panels.
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Navigation */}
        <div className="px-6 sm:px-8 py-4 border-t border-white/10 bg-slate-950/40 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-black text-white shadow-xl shadow-purple-600/40 transition-all cursor-pointer active:scale-95"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

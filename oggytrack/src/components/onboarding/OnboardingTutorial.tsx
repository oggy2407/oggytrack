import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { UserProfile, Subject, TimetableEntry, DayOfWeek, ClassType } from '../../types/oggytrack';
import { db } from '../../utils/storage';
import { pickNextSubjectColor } from '../../utils/colorPalette';
import { getDayOfWeekFromDate } from '../../utils/dateUtils';
import { ColorSwatchPicker } from '../common/ColorSwatchPicker';
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';

interface OnboardingTutorialProps {
  user: UserProfile;
  onFinish: (
    updatedUser: UserProfile,
    subjects: Subject[],
    timetable: TimetableEntry[],
    newRecoveryFriendName?: string
  ) => void;
  onSkip: () => void;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  user,
  onFinish,
  onSkip,
}) => {
  const [step, setStep] = useState<number>(1);

  // Step 1: Profile state (recovery secret is never pre-filled from storage)
  const [name, setName] = useState(user.name || '');
  const [recoveryFriendName, setRecoveryFriendName] = useState('');
  const recoveryAlreadySet = Boolean(user.hasRecoveryFriend || db.hasAccountRecoveryFriend());
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
  const [newSubColor, setNewSubColor] = useState('#10b981');

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

  const COLOR_PALETTE = ['#10b981', '#06b6d4', '#3b82f6', '#f59e0b', '#14b8a6', '#f43f5e'];

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
    setNewSubColor(pickNextSubjectColor(updated.map((s) => s.color)));

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

  const handleComplete = () => {
    const trimmedRecovery = recoveryFriendName.trim();
    const updatedUser: UserProfile = {
      ...user,
      name: name.trim() || user.name,
      institution: institution.trim(),
      degree: degree.trim(),
      semester: semester.trim(),
      targetAttendance,
      hasRecoveryFriend: Boolean(trimmedRecovery || recoveryAlreadySet),
      hasCompletedTutorial: true,
    };

    onFinish(updatedUser, subjects, timetable, trimmedRecovery || undefined);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-xl animate-fade-in text-white">
      <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Let's Get Started Setup Tutorial"
          className="bg-[#0d1320]/98 border border-white/[0.1] rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative my-auto"
        >
          <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-white/[0.08] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Let's Get Started
                  </h2>
                  <span className="text-xs text-emerald-400 font-semibold tabular-nums">
                    · Step {step} of 4
                  </span>
                </div>
                <p className="text-xs text-white/60 truncate">
                  Configure your profile, subjects, and timetable in 2 minutes
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-white/60 hover:text-white px-3 py-1.5 rounded-xl border border-white/[0.1] hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Skip for now
            </button>
          </div>

          {/* Step Progress Bar */}
          <div className="w-full bg-white/[0.06] h-1">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <GraduationCap className="w-4 h-4" />
                  <span>01. Customize Your Student Profile</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-white/80 font-semibold mb-1">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 font-semibold mb-1">
                      Friend's Name (Password Recovery)
                    </label>
                    <input
                      type="password"
                      autoComplete="off"
                      value={recoveryFriendName}
                      onChange={(e) => setRecoveryFriendName(e.target.value)}
                      placeholder={
                        recoveryAlreadySet
                          ? 'Configured (leave blank to keep)'
                          : 'Optional secret recovery friend'
                      }
                      className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 font-semibold mb-1">
                      College / University
                    </label>
                    <input
                      type="text"
                      required
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="e.g. National Institute of Tech"
                      className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 font-semibold mb-1">
                      Degree & Branch
                    </label>
                    <input
                      type="text"
                      required
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      placeholder="e.g. B.Tech Computer Science"
                      className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 font-semibold mb-1">
                      Current Semester
                    </label>
                    <input
                      type="text"
                      required
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      placeholder="e.g. Semester 1"
                      className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 font-semibold mb-1 flex items-center justify-between">
                      <span>Target Attendance</span>
                      <span className="font-bold text-emerald-400 tabular-nums">
                        {targetAttendance}%
                      </span>
                    </label>
                    <input
                      type="range"
                      min="60"
                      max="95"
                      step="5"
                      value={targetAttendance}
                      onChange={(e) => setTargetAttendance(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-2 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-white/50 mt-1 tabular-nums">
                      <span>60%</span>
                      <span>75% (Standard)</span>
                      <span>95%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                    <BookOpen className="w-4 h-4" />
                    <span>02. Add Your Courses & Subjects</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadSampleSubjects}
                    className="text-xs px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-colors self-start cursor-pointer whitespace-nowrap"
                  >
                    Load 4 Sample CS Courses
                  </button>
                </div>

                <div className="glass-card p-4 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-white block">Add a Subject</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-white/60 text-[11px] mb-1">Subject Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Data Structures & Algorithms"
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-white/60 text-[11px] mb-1">Subject Code *</label>
                      <input
                        type="text"
                        placeholder="e.g. CS201"
                        value={newSubCode}
                        onChange={(e) => setNewSubCode(e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs font-mono uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-white/60 text-[11px] mb-1">
                        Instructor / Professor
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Vance"
                        value={newSubFaculty}
                        onChange={(e) => setNewSubFaculty(e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-white/60 text-[11px] mb-1">
                        Classroom / Room
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Hall 101"
                        value={newSubRoom}
                        onChange={(e) => setNewSubRoom(e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-2 space-y-3">
                    <ColorSwatchPicker
                      value={newSubColor}
                      onChange={setNewSubColor}
                      label="Course Color Tag"
                      compact
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddSubject}
                        disabled={!newSubName.trim() || !newSubCode.trim()}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Subject</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Configured Subjects ({subjects.length})</span>
                    {subjects.length === 0 && (
                      <span className="text-amber-400">Add at least one subject to continue</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {subjects.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: sub.color }}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">{sub.name}</div>
                            <div className="text-[11px] text-white/60 font-mono truncate">
                              {sub.code} · {sub.faculty}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSubject(sub.id)}
                          className="p-1.5 rounded-lg text-white/50 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
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

            {step === 3 && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>03. Schedule Your Class Sessions</span>
                </div>

                {subjects.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-white/[0.03] border border-dashed border-white/[0.12] text-xs text-white/60">
                    Please add at least one subject in Step 2 first.
                  </div>
                ) : (
                  <>
                    <div className="glass-card p-4 rounded-2xl space-y-3">
                      <span className="text-xs font-bold text-white block">Add a Timetable Slot</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="block text-white/60 text-[11px] mb-1">
                            Select Subject
                          </label>
                          <select
                            value={newTtSubjectId}
                            onChange={(e) => setNewTtSubjectId(e.target.value)}
                            className="glass-input w-full px-3 py-2 rounded-xl bg-[#090d16] text-xs"
                          >
                            {subjects.map((s) => (
                              <option key={s.id} value={s.id} className="bg-[#090d16]">
                                {s.code} - {s.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-white/60 text-[11px] mb-1">
                            Day of Week
                          </label>
                          <select
                            value={newTtDay}
                            onChange={(e) => setNewTtDay(e.target.value as DayOfWeek)}
                            className="glass-input w-full px-3 py-2 rounded-xl bg-[#090d16] text-xs"
                          >
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d) => (
                              <option key={d} value={d} className="bg-[#090d16]">
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-white/60 text-[11px] mb-1">
                            Session Type
                          </label>
                          <select
                            value={newTtType}
                            onChange={(e) => setNewTtType(e.target.value as ClassType)}
                            className="glass-input w-full px-3 py-2 rounded-xl bg-[#090d16] text-xs"
                          >
                            <option value="Lecture" className="bg-[#090d16]">Lecture</option>
                            <option value="Lab" className="bg-[#090d16]">Lab</option>
                            <option value="Tutorial" className="bg-[#090d16]">Tutorial</option>
                            <option value="Seminar" className="bg-[#090d16]">Seminar</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-white/60 text-[11px] mb-1">Start Time</label>
                          <input
                            type="time"
                            value={newTtStartTime}
                            onChange={(e) => setNewTtStartTime(e.target.value)}
                            className="glass-input w-full px-3 py-2 rounded-xl text-xs tabular-nums"
                          />
                        </div>

                        <div>
                          <label className="block text-white/60 text-[11px] mb-1">End Time</label>
                          <input
                            type="time"
                            value={newTtEndTime}
                            onChange={(e) => setNewTtEndTime(e.target.value)}
                            className="glass-input w-full px-3 py-2 rounded-xl text-xs tabular-nums"
                          />
                        </div>

                        <div>
                          <label className="block text-white/60 text-[11px] mb-1">
                            Classroom / Room
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Hall 101"
                            value={newTtRoom}
                            onChange={(e) => setNewTtRoom(e.target.value)}
                            className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleAddTimetableEntry}
                          className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Class Slot</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs text-white/60 block">
                        Scheduled Sessions ({timetable.length})
                      </span>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {timetable.map((t) => (
                          <div
                            key={t.id}
                            className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: t.color }}
                              />
                              <div>
                                <div className="font-bold text-white">
                                  {t.code} · {t.type}
                                </div>
                                <div className="text-[11px] text-white/60 tabular-nums">
                                  {t.day} · {t.startTime} - {t.endTime} · {t.room}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveTimetableEntry(t.id)}
                              className="p-1 rounded-lg text-white/50 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {timetable.length === 0 && (
                          <div className="p-3 text-center text-xs text-white/50">
                            No classes scheduled yet. Add slots above or continue to configure later.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 text-center py-4 animate-fade-in">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-950/50">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">
                    You're all set, {name || user.name}
                  </h3>
                  <p className="text-xs text-white/60 max-w-md mx-auto leading-relaxed">
                    Your workspace is ready with your profile, {subjects.length} subjects, and{' '}
                    {timetable.length} weekly timetable sessions.
                  </p>
                </div>

                <div className="glass-card p-5 rounded-2xl text-left grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto tabular-nums">
                  <div>
                    <span className="text-xs text-white/60 block">Target</span>
                    <span className="text-lg font-bold text-emerald-400">{targetAttendance}%</span>
                  </div>
                  <div>
                    <span className="text-xs text-white/60 block">Subjects</span>
                    <span className="text-lg font-bold text-white">{subjects.length}</span>
                  </div>
                  <div>
                    <span className="text-xs text-white/60 block">Classes</span>
                    <span className="text-lg font-bold text-white">{timetable.length}</span>
                  </div>
                  <div>
                    <span className="text-xs text-white/60 block">Status</span>
                    <span className="text-sm font-bold text-emerald-400 block mt-1">Ready</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 sm:px-8 py-4 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white transition-colors cursor-pointer"
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
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 transition-colors cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-xs font-bold text-slate-950 transition-all cursor-pointer"
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

import React, { useState } from 'react';
import { UserProfile, AppSettings } from '../../types/oggytrack';
import { AuthCredentials, db } from '../../utils/storage';
import { 
  Settings as SettingsIcon, 
  User, 
  Sliders, 
  Download, 
  RotateCcw, 
  ShieldCheck, 
  Check, 
  Sparkles,
  Database,
  Moon,
  Sun,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Palette
} from 'lucide-react';

interface SettingsViewProps {
  user: UserProfile;
  settings: AppSettings;
  onUpdateUser: (updated: UserProfile) => void;
  onUpdateSettings: (updated: AppSettings) => void;
  onSignOut: () => void;
  onResetData: () => void;
  onExportJson: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  settings,
  onUpdateUser,
  onUpdateSettings,
  onSignOut,
  onResetData,
  onExportJson,
}) => {
  const [profileForm, setProfileForm] = useState<UserProfile>(user);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Auth Credentials State
  const [auth, setAuth] = useState<AuthCredentials>(() => db.getAuth());
  const [usernameInput, setUsernameInput] = useState(auth.username || 'oggy');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser(profileForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const trimmedUser = usernameInput.trim();
    if (!trimmedUser) {
      setAuthError('Username cannot be blank.');
      return;
    }

    if (newPassword && newPassword.length < 4) {
      setAuthError('New password must be at least 4 characters long.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setAuthError('New password and confirmation do not match.');
      return;
    }

    const updatedAuth: AuthCredentials = {
      ...auth,
      username: trimmedUser,
      password: newPassword ? newPassword : auth.password,
      lastLoginAt: new Date().toISOString(),
    };

    db.saveAuth(updatedAuth);
    setAuth(updatedAuth);
    setNewPassword('');
    setConfirmPassword('');
    setAuthSuccess('Account security credentials updated successfully!');
    setTimeout(() => setAuthSuccess(''), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          System & Profile Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your academic profile, security credentials, and workspace backup
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-lg">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Profile details updated and saved to persistent storage!</span>
        </div>
      )}

      {/* Section 1: Academic Profile Form */}
      <form
        onSubmit={handleSaveProfile}
        className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-white/10">
          <User className="w-4 h-4 text-purple-400" />
          <h2 className="font-bold text-base text-white">Student Academic Profile</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold uppercase mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold uppercase mb-1">
              Campus Email
            </label>
            <input
              type="email"
              required
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold uppercase mb-1">
              Student ID / Roll Number
            </label>
            <input
              type="text"
              required
              value={profileForm.studentId}
              onChange={(e) => setProfileForm({ ...profileForm, studentId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono focus:outline-hidden focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold uppercase mb-1">
              College / University
            </label>
            <input
              type="text"
              required
              value={profileForm.institution}
              onChange={(e) => setProfileForm({ ...profileForm, institution: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold uppercase mb-1">
              Degree & Major
            </label>
            <input
              type="text"
              required
              value={profileForm.degree}
              onChange={(e) => setProfileForm({ ...profileForm, degree: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold uppercase mb-1">
              Current Semester
            </label>
            <input
              type="text"
              required
              value={profileForm.semester}
              onChange={(e) => setProfileForm({ ...profileForm, semester: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold uppercase mb-1">
              Default Target Attendance %
            </label>
            <input
              type="number"
              min="50"
              max="100"
              required
              value={profileForm.targetAttendance}
              onChange={(e) => setProfileForm({ ...profileForm, targetAttendance: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold uppercase mb-1">
              Timezone
            </label>
            <input
              type="text"
              value={profileForm.timezone}
              onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden focus:border-purple-400"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
          >
            Save Profile Details
          </button>
        </div>
      </form>

      {/* Section 2: Account Security & Password */}
      <form
        onSubmit={handleSaveCredentials}
        className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-purple-400" />
            <h2 className="font-bold text-base text-white">Account Security & Credentials</h2>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Protected</span>
          </span>
        </div>

        {authError && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium animate-fade-in">
            {authError}
          </div>
        )}

        {authSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{authSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold uppercase mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden focus:border-purple-400 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold uppercase mb-1 flex items-center justify-between">
              <span>New Password</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold uppercase mb-1">
              Confirm New Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-hidden focus:border-purple-400"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sign Out of Workspace</span>
          </button>

          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
          >
            Update Credentials & Password
          </button>
        </div>
      </form>

      {/* Section 3: Data Management & Backup */}
      <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10">
          <Database className="w-4 h-4 text-purple-400" />
          <h2 className="font-bold text-base text-white">Data Management & Workspace Reset</h2>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-white">Full JSON Data Backup</h3>
            <p className="text-xs text-slate-400">
              Download your complete academic database including subjects, attendance logs, and schedules as an offline JSON archive.
            </p>
          </div>
          <button
            type="button"
            onClick={onExportJson}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>Download JSON Backup</span>
          </button>
        </div>

        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            <span className="font-semibold text-rose-300 block">Reset Academic Records</span>
            <span className="text-[11px] text-slate-400">Permanently clears your current subjects, timetable slots, and attendance records.</span>
          </div>
          {confirmReset ? (
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  onResetData();
                  setConfirmReset(false);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Reset</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold transition-colors cursor-pointer self-start sm:self-auto shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear / Reset Workspace</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

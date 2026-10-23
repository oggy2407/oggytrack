import React, { useState } from 'react';
import { UserProfile } from '../../types/oggytrack';
import { db } from '../../utils/storage';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  Calendar,
  FileCheck,
  Palmtree
} from 'lucide-react';

interface AuthPageProps {
  onLoginSuccess: (user: UserProfile, isNewUser: boolean) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setErrorMsg('Please enter your username.');
      return;
    }
    if (!trimmedPass) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const result = db.authenticateOrRegister(trimmedUser, trimmedPass);
      setLoading(false);

      if (!result.success) {
        setErrorMsg(result.error || 'Authentication failed. Please verify credentials.');
        return;
      }

      onLoginSuccess(result.user, result.isNew);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden font-sans selection:bg-purple-500 selection:text-white">
      {/* Background ambient radial gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-8 border-b border-white/10">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-purple-600/25">
            O
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white whitespace-nowrap">
            oggytrack
          </span>
        </div>

        <button
          type="button"
          onClick={() => document.getElementById('auth-username-input')?.focus()}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Sign In
        </button>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-12 md:py-20 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
        {/* Left Side: Hero Information */}
        <div className="flex-1 max-w-2xl space-y-8 text-center lg:text-left">
          <div className="text-xs font-semibold tracking-wide text-purple-300">
            Academic Attendance, Timetable & Coursework Planner
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] [text-wrap:balance]">
            Your entire semester,{' '}
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              perfectly on track.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl mx-auto lg:mx-0">
            Track subject-wise attendance accurately, safeguard your target percentage with lecture buffer forecasting, and organize weekly classes, assignments, and campus holidays in one place.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-left">
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10">
              <div className="flex items-center gap-2.5 font-bold text-sm text-white">
                <TrendingUp className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Attendance Safeguard</span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Calculates exact safe-to-miss classes and consecutive attendance recovery targets.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10">
              <div className="flex items-center gap-2.5 font-bold text-sm text-white">
                <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Conflict-Free Timetable</span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Weekly and daily lecture schedule with classroom locations and instructor details.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10">
              <div className="flex items-center gap-2.5 font-bold text-sm text-white">
                <FileCheck className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Assignments Board</span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Priority-ranked coursework tasks and live due-date tracking across every subject.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10">
              <div className="flex items-center gap-2.5 font-bold text-sm text-white">
                <Palmtree className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Holidays & Live Calendar</span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Manage academic breaks and view classes, deadlines, and recess dates on a real-time calendar.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Professional Sign In Card */}
        <div className="w-full max-w-md">
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/85 backdrop-blur-2xl border border-white/15 shadow-2xl relative overflow-hidden">
            <div className="space-y-1.5 mb-6">
              <span className="text-xs font-semibold text-purple-400 block">
                Student Workspace Sign In
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Let's Get Started
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your username and password below to open or create your workspace.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="auth-username-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="auth-username-input"
                    type="text"
                    required
                    placeholder="e.g. oggy"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all font-medium"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="auth-password-input" className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-slate-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-white/5 border border-white/15 text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 active:scale-98 text-white shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Opening Workspace...</span>
                    </span>
                  ) : (
                    <>
                      <span>Sign In & Launch Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-400 leading-relaxed">
                First-time sign in with a new username (for example, <strong className="text-slate-200">oggy</strong>) creates your personal profile and opens the step-by-step setup guide.
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
        <span>© {currentYear} oggytrack. Academic Attendance & Schedule Planner.</span>
      </footer>
    </div>
  );
};

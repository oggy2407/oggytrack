import React, { useState } from 'react';
import { ModalShell } from '../common/ModalShell';
import { db } from '../../utils/storage';
import { RecoveryMethod } from '../../utils/authSecurity';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Hash,
  KeyRound,
  Lock,
  User,
  Users,
} from 'lucide-react';

interface ForgotPasswordModalProps {
  initialUsername?: string;
  initialOpenChooser?: boolean;
  onClose: () => void;
  onResetSuccess: (username: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  initialUsername = '',
  initialOpenChooser = false,
  onClose,
  onResetSuccess,
}) => {
  const [step, setStep] = useState<'verify' | 'reset'>('verify');
  const [username, setUsername] = useState(initialUsername);
  const [method, setMethod] = useState<RecoveryMethod>('friend');
  const [showChooser, setShowChooser] = useState<boolean>(initialOpenChooser);
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectMethod = (nextMethod: RecoveryMethod) => {
    setMethod(nextMethod);
    setAnswer('');
    setErrorMsg('');
    setShowChooser(false);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const res = db.verifyAccountRecovery({
      username,
      method,
      answer,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Could not verify recovery details.');
      return;
    }

    if (res.matchedUsername) {
      setUsername(res.matchedUsername);
    }
    setStep('reset');
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const res = db.resetAccountPassword({
      username,
      method,
      answer,
      newPassword,
      confirmPassword,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Unable to reset password.');
      return;
    }

    onResetSuccess(res.username || username.trim());
  };

  return (
    <ModalShell
      title={step === 'verify' ? 'Forgot Password' : 'Create New Password'}
      subtitle={
        step === 'verify'
          ? showChooser
            ? 'Select a recovery option to verify your account'
            : 'Verify your identity to reset your workspace password'
          : `Set a new password for @${username.trim()}`
      }
      onClose={onClose}
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-300 font-medium flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 'verify' && showChooser && (
          <div className="space-y-3 animate-fade-in">
            <div>
              <label
                htmlFor="recovery-chooser-username"
                className="block text-white/75 font-semibold mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                <input
                  id="recovery-chooser-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="glass-input w-full pl-10 pr-3.5 py-2.5 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="pt-1 space-y-2">
              <p className="text-white/75 font-semibold">Try another way to sign in & reset</p>

              <button
                type="button"
                onClick={() => handleSelectMethod('friend')}
                className="w-full p-3.5 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.07] hover:border-accent-400/50 transition-colors flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center text-accent-400 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white">Write your friend's name</div>
                    <div className="text-[11px] text-white/60">
                      Verify using the recovery friend's name saved on your account
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/50 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod('studentId')}
                className="w-full p-3.5 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.07] hover:border-accent-400/50 transition-colors flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white">Verify with Student ID</div>
                    <div className="text-[11px] text-white/60">
                      Enter the Student ID / Roll Number on your academic profile
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/50 shrink-0" />
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {step === 'verify' && !showChooser && (
          <form onSubmit={handleVerifySubmit} className="space-y-4 animate-fade-in">
            <div>
              <label
                htmlFor="recovery-username-input"
                className="block text-white/75 font-semibold mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                <input
                  id="recovery-username-input"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alex"
                  className="glass-input w-full pl-10 pr-3.5 py-2.5 rounded-xl font-medium"
                />
              </div>
            </div>

            {method === 'friend' ? (
              <div>
                <label
                  htmlFor="recovery-friend-input"
                  className="block text-white/75 font-semibold mb-1.5"
                >
                  Your Friend's Name
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                  <input
                    id="recovery-friend-input"
                    type="text"
                    required
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Write your friend's name"
                    className="glass-input w-full pl-10 pr-3.5 py-2.5 rounded-xl font-medium"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-white/55 mt-1.5">
                  Enter the friend's name linked to your account for password recovery.
                </p>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="recovery-studentid-input"
                  className="block text-white/75 font-semibold mb-1.5"
                >
                  Student ID / Roll Number
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                  <input
                    id="recovery-studentid-input"
                    type="text"
                    required
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="e.g. STU-2026"
                    className="glass-input w-full pl-10 pr-3.5 py-2.5 rounded-xl font-mono"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-white/55 mt-1.5">
                  Enter the Student ID saved on your academic profile.
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setShowChooser(true);
                }}
                className="text-accent-400 hover:text-accent-300 font-semibold py-2 px-2 rounded-lg hover:bg-accent-500/10 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Try another way
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Verify & Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetSubmit} className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Account verified for @{username}</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="recovery-new-password"
                  className="block text-white/80 font-semibold"
                >
                  New Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-white/60 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                <input
                  id="recovery-new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="glass-input w-full pl-10 pr-3.5 py-2.5 rounded-xl"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="recovery-confirm-password"
                className="block text-white/80 font-semibold mb-1.5"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                <input
                  id="recovery-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="glass-input w-full pl-10 pr-3.5 py-2.5 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setStep('verify');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 font-semibold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Save New Password
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalShell>
  );
};

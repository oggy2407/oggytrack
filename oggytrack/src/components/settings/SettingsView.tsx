import React, { useRef, useState } from 'react';
import { UserProfile, AppSettings, PrimaryColor } from '../../types/oggytrack';
import { AuthCredentials, db } from '../../utils/storage';
import { ForgotPasswordModal } from '../auth/ForgotPasswordModal';
import {
  WORKSPACE_ACCENT_PRESETS,
  deriveAccentPalette,
  getReadableOnAccentColor,
  normalizeHexColor,
} from '../../utils/colorPalette';
import {
  DEFAULT_GLASS_SETTINGS,
  compressImageFileToDataUrl,
  normalizeGlassSettings,
} from '../../utils/wallpaperGlass';
import {
  User,
  Download,
  RotateCcw,
  ShieldCheck,
  Check,
  Database,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  UploadCloud,
  Palette,
  Users,
  ImagePlus,
  Trash2,
  Sliders,
} from 'lucide-react';

interface SettingsViewProps {
  user: UserProfile;
  settings: AppSettings;
  customWallpaper?: string | null;
  onUpdateWallpaper?: (dataUrl: string | null) => boolean;
  onUpdateUser: (updated: UserProfile) => void;
  onUpdateSettings: (updated: AppSettings) => void;
  onSignOut: () => void;
  onResetData: () => void;
  onExportJson: () => void;
  onOpenImportModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  settings,
  customWallpaper,
  onUpdateWallpaper,
  onUpdateUser,
  onUpdateSettings,
  onSignOut,
  onResetData,
  onExportJson,
  onOpenImportModal,
}) => {
  const [profileForm, setProfileForm] = useState<UserProfile>(user);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [customHexDraft, setCustomHexDraft] = useState<string>(
    settings.customHex || settings.accentColor || '#10b981'
  );

  // Auth Credentials State (never pre-populated with stored secrets)
  const [auth, setAuth] = useState<AuthCredentials>(() => db.getAuth());
  const [usernameInput, setUsernameInput] = useState(auth.username || 'student');
  const [friendNameInput, setFriendNameInput] = useState<string>('');
  const [hasRecoveryConfigured, setHasRecoveryConfigured] = useState<boolean>(() =>
    Boolean(user.hasRecoveryFriend || db.hasAccountRecoveryFriend(auth.username))
  );
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [forgotModalState, setForgotModalState] = useState<{
    open: boolean;
    openChooser: boolean;
  }>({ open: false, openChooser: false });
  const [confirmReset, setConfirmReset] = useState(false);
  const [wallpaperBusy, setWallpaperBusy] = useState(false);
  const [wallpaperFeedback, setWallpaperFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const wallpaperInputRef = useRef<HTMLInputElement | null>(null);

  const glassSettings = normalizeGlassSettings(settings);
  const hasCustomPhoto = Boolean(customWallpaper);

  const activePalette = deriveAccentPalette(
    settings.primaryColor,
    settings.customHex || settings.accentColor
  );

  const handleSelectAccentPreset = (id: PrimaryColor, hex: string) => {
    setCustomHexDraft(hex);
    onUpdateSettings({
      ...settings,
      primaryColor: id,
      accentColor: hex,
      customHex: id === 'custom' ? hex : settings.customHex,
    });
  };

  const handleApplyCustomHex = (e: React.FormEvent) => {
    e.preventDefault();
    const validHex = normalizeHexColor(customHexDraft, activePalette.accent500);
    setCustomHexDraft(validHex);
    onUpdateSettings({
      ...settings,
      primaryColor: 'custom',
      accentColor: validHex,
      customHex: validHex,
    });
  };

  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setWallpaperBusy(true);
    setWallpaperFeedback(null);
    try {
      const compressedDataUrl = await compressImageFileToDataUrl(file);
      const saved = onUpdateWallpaper
        ? onUpdateWallpaper(compressedDataUrl)
        : db.saveCustomWallpaper(compressedDataUrl);
      if (!saved) {
        setWallpaperFeedback({
          type: 'error',
          text: 'Browser storage is full. Please choose a smaller photo or clear old records.',
        });
        return;
      }
      onUpdateSettings({
        ...settings,
        backgroundMode: 'photo',
      });
      setWallpaperFeedback({
        type: 'success',
        text: 'Custom background photo applied behind glassy workspace surfaces!',
      });
      setTimeout(() => setWallpaperFeedback(null), 3200);
    } catch (err: unknown) {
      setWallpaperFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not process the selected photo.',
      });
    } finally {
      setWallpaperBusy(false);
    }
  };

  const handleRemoveWallpaper = () => {
    if (onUpdateWallpaper) {
      onUpdateWallpaper(null);
    } else {
      db.saveCustomWallpaper(null);
    }
    onUpdateSettings({
      ...settings,
      backgroundMode: 'space',
      applyPhotoToLanding: false,
    });
    setWallpaperFeedback({
      type: 'success',
      text: 'Custom photo removed. Restored 3D Space background.',
    });
    setTimeout(() => setWallpaperFeedback(null), 2600);
  };

  const handleResetGlassDefaults = () => {
    onUpdateSettings({
      ...settings,
      glassOpacity: DEFAULT_GLASS_SETTINGS.glassOpacity,
      glassBlur: DEFAULT_GLASS_SETTINGS.glassBlur,
      photoDimmer: DEFAULT_GLASS_SETTINGS.photoDimmer,
      photoBlur: DEFAULT_GLASS_SETTINGS.photoBlur,
    });
  };

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

    if (auth.isDemoSession) {
      setAuthError(
        'Demo mode uses an ephemeral guest session. Sign out and create a personal account to set custom credentials.'
      );
      return;
    }

    const result = db.updateAccountSecurity({
      currentUsername: auth.username,
      nextUsername: usernameInput,
      oldPassword,
      newPassword,
      confirmPassword,
      friendName: friendNameInput,
    });

    if (!result.success) {
      setAuthError(result.error || 'Unable to update security credentials.');
      return;
    }

    if (result.auth) {
      setAuth(result.auth);
      setUsernameInput(result.auth.username);
    }
    const nextHasRecovery = Boolean(result.hasRecoveryFriend);
    setHasRecoveryConfigured(nextHasRecovery);

    if (result.user) {
      setProfileForm((prev) => ({
        ...prev,
        hasRecoveryFriend: nextHasRecovery,
      }));
      onUpdateUser({
        ...profileForm,
        hasRecoveryFriend: nextHasRecovery,
      });
    }

    setFriendNameInput('');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setAuthSuccess(
      result.passwordChanged
        ? 'Password and security settings updated (salted SHA-256)!'
        : 'Account security & recovery details saved!'
    );
    setTimeout(() => setAuthSuccess(''), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div className="pb-4 border-b border-white/[0.08]">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          System & Profile Settings
        </h1>
        <p className="text-sm text-white/60 mt-1">
          Customize your background photo, glassy appearance, accent colors, academic profile, and credentials
        </p>
      </div>

      {/* Section 1: Workspace Appearance & Accent Color */}
      <section className="glass-card p-6 rounded-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-accent-400" />
            <h2 className="font-bold text-base text-white">Appearance & Accent Color</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/65">
            <span>Active Theme:</span>
            <span className="font-semibold text-accent-400">{activePalette.name}</span>
          </div>
        </div>

        <p className="text-xs text-white/60 leading-relaxed">
          Choose from 10 dark-glassmorphism accent palettes or set your own custom hex color. Primary buttons, active navigation highlights, ambient lighting, and focus rings adapt immediately while keeping attendance statuses semantically clear.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {WORKSPACE_ACCENT_PRESETS.map((preset) => {
            const isSelected = settings.primaryColor === preset.id;
            const checkInk = getReadableOnAccentColor(preset.baseHex);

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectAccentPreset(preset.id, preset.baseHex)}
                aria-pressed={isSelected}
                aria-label={`Select ${preset.name} accent theme`}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-center gap-2.5 ${
                  isSelected
                    ? 'border-accent-400 bg-accent-500/15 text-white'
                    : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-white/80 hover:text-white'
                }`}
              >
                <span
                  className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center shadow-sm border border-white/15"
                  style={{ backgroundColor: preset.baseHex }}
                >
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 stroke-[3]" style={{ color: checkInk }} />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{preset.name}</div>
                  <div className="text-[10px] font-mono text-white/50 uppercase">
                    {preset.baseHex}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Hex Row + Time Format Preference */}
        <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <form onSubmit={handleApplyCustomHex} className="flex flex-wrap items-center gap-2.5">
            <label
              htmlFor="settings-custom-color-picker"
              className="text-xs font-semibold text-white/80 whitespace-nowrap"
            >
              Custom Hex Accent:
            </label>
            <input
              id="settings-custom-color-picker"
              type="color"
              aria-label="Custom workspace color picker"
              value={normalizeHexColor(customHexDraft, activePalette.accent500)}
              onChange={(e) => {
                const nextHex = normalizeHexColor(e.target.value);
                setCustomHexDraft(nextHex);
                handleSelectAccentPreset('custom', nextHex);
              }}
              className="w-9 h-9 rounded-xl border border-white/20 bg-transparent cursor-pointer shrink-0"
            />
            <input
              type="text"
              aria-label="Custom hex color code"
              value={customHexDraft}
              onChange={(e) => setCustomHexDraft(e.target.value)}
              placeholder="#8B5CF6"
              className="glass-input w-28 px-3 py-2 rounded-xl text-xs font-mono uppercase"
            />
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Apply Custom
            </button>
            {settings.primaryColor !== 'emerald' && (
              <button
                type="button"
                onClick={() => handleSelectAccentPreset('emerald', '#10b981')}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/75 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Reset Default
              </button>
            )}
          </form>

          <div className="flex items-center gap-2 text-xs shrink-0">
            <span className="text-white/60">Clock Format:</span>
            <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              {(['12h', '24h'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, timeFormat: fmt })}
                  aria-pressed={settings.timeFormat === fmt}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    settings.timeFormat === fmt
                      ? 'bg-accent-500 text-accent-ink font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Background Photo & Glassy Appearance Customizer */}
        <div className="pt-5 border-t border-white/[0.08] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-accent-400" />
                <h3 className="font-bold text-sm text-white">
                  Background Photo & Glassy Appearance
                </h3>
              </div>
              <p className="text-xs text-white/60 mt-1">
                Upload your own wallpaper photo or switch back to 3D Space anytime, and fine-tune frosted glass translucency.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={wallpaperInputRef}
                id="settings-wallpaper-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                onChange={handleWallpaperUpload}
                aria-label="Upload custom background photo"
                className="sr-only"
              />

              <div
                role="group"
                aria-label="Workspace background mode"
                className="flex items-center p-1 rounded-xl bg-white/[0.05] border border-white/[0.1]"
              >
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      backgroundMode: 'space',
                    })
                  }
                  aria-pressed={glassSettings.backgroundMode === 'space' || !hasCustomPhoto}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    glassSettings.backgroundMode === 'space' || !hasCustomPhoto
                      ? 'bg-accent-500 text-accent-ink font-bold'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  3D Space
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!hasCustomPhoto) {
                      wallpaperInputRef.current?.click();
                      return;
                    }
                    onUpdateSettings({
                      ...settings,
                      backgroundMode: 'photo',
                    });
                  }}
                  aria-pressed={glassSettings.backgroundMode === 'photo' && hasCustomPhoto}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    glassSettings.backgroundMode === 'photo' && hasCustomPhoto
                      ? 'bg-accent-500 text-accent-ink font-bold'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Custom Photo
                </button>
              </div>

              <button
                type="button"
                disabled={wallpaperBusy}
                onClick={() => wallpaperInputRef.current?.click()}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>{wallpaperBusy ? 'Processing...' : hasCustomPhoto ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
            </div>
          </div>

          {wallpaperFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in ${
                wallpaperFeedback.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-300'
                  : 'bg-rose-500/15 border border-rose-500/35 text-rose-300'
              }`}
            >
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{wallpaperFeedback.text}</span>
            </div>
          )}

          {hasCustomPhoto && customWallpaper && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-y border-white/[0.08]">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-24 h-14 rounded-xl overflow-hidden border border-white/20 shrink-0 bg-black/40">
                  <img
                    src={customWallpaper}
                    alt="Custom background wallpaper preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="text-xs font-semibold text-white">
                    Custom Wallpaper Ready ·{' '}
                    <span className="text-accent-400">
                      {glassSettings.backgroundMode === 'photo' ? 'Active' : 'Saved'}
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-white/75 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={glassSettings.applyPhotoToLanding}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          applyPhotoToLanding: e.target.checked,
                        })
                      }
                      className="rounded border-white/25 accent-emerald-400 cursor-pointer"
                    />
                    <span>Also show custom photo on starting sign-in page (replaces 3D Mars)</span>
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveWallpaper}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Photo</span>
              </button>
            </div>
          )}

          {/* Glass & Photo Tuning Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs pt-1">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="slider-glass-opacity" className="text-white/75 font-medium">
                  Glass Surface Opacity
                </label>
                <span className="font-mono text-accent-400 tabular-nums">
                  {glassSettings.glassOpacity}%
                </span>
              </div>
              <input
                id="slider-glass-opacity"
                type="range"
                min={16}
                max={82}
                value={glassSettings.glassOpacity}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    glassOpacity: Number(e.target.value),
                  })
                }
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="slider-glass-blur" className="text-white/75 font-medium">
                  Glass Frost Blur
                </label>
                <span className="font-mono text-accent-400 tabular-nums">
                  {glassSettings.glassBlur}px
                </span>
              </div>
              <input
                id="slider-glass-blur"
                type="range"
                min={0}
                max={32}
                value={glassSettings.glassBlur}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    glassBlur: Number(e.target.value),
                  })
                }
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="slider-photo-dimmer" className="text-white/75 font-medium">
                  Photo Contrast Dimmer
                </label>
                <span className="font-mono text-accent-400 tabular-nums">
                  {glassSettings.photoDimmer}%
                </span>
              </div>
              <input
                id="slider-photo-dimmer"
                type="range"
                min={15}
                max={85}
                value={glassSettings.photoDimmer}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    photoDimmer: Number(e.target.value),
                  })
                }
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="slider-photo-blur" className="text-white/75 font-medium">
                  Photo Soft Focus Blur
                </label>
                <span className="font-mono text-accent-400 tabular-nums">
                  {glassSettings.photoBlur}px
                </span>
              </div>
              <input
                id="slider-photo-blur"
                type="range"
                min={0}
                max={24}
                value={glassSettings.photoBlur}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    photoBlur: Number(e.target.value),
                  })
                }
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleResetGlassDefaults}
              className="text-xs font-semibold text-white/65 hover:text-white underline cursor-pointer"
            >
              Reset glass & photo sliders to default
            </button>
          </div>
        </div>
      </section>

      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Profile details updated and saved to persistent storage!</span>
        </div>
      )}

      {/* Section 2: Academic Profile Form */}
      <form
        onSubmit={handleSaveProfile}
        className="glass-card p-6 rounded-2xl space-y-4"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
          <User className="w-4 h-4 text-accent-400" />
          <h2 className="font-bold text-base text-white">Student Academic Profile</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label htmlFor="profile-full-name" className="block text-white/60 font-medium mb-1.5">
              Full Name
            </label>
            <input
              id="profile-full-name"
              type="text"
              required
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input"
            />
          </div>

          <div>
            <label htmlFor="profile-student-id" className="block text-white/60 font-medium mb-1.5">
              Student ID / Roll Number
            </label>
            <input
              id="profile-student-id"
              type="text"
              required
              value={profileForm.studentId}
              onChange={(e) => setProfileForm({ ...profileForm, studentId: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input font-mono"
            />
          </div>

          <div>
            <label htmlFor="profile-institution" className="block text-white/60 font-medium mb-1.5">
              College / University
            </label>
            <input
              id="profile-institution"
              type="text"
              required
              value={profileForm.institution}
              onChange={(e) => setProfileForm({ ...profileForm, institution: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input"
            />
          </div>

          <div>
            <label htmlFor="profile-degree" className="block text-white/60 font-medium mb-1.5">
              Degree & Major
            </label>
            <input
              id="profile-degree"
              type="text"
              required
              value={profileForm.degree}
              onChange={(e) => setProfileForm({ ...profileForm, degree: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input"
            />
          </div>

          <div>
            <label htmlFor="profile-semester" className="block text-white/60 font-medium mb-1.5">
              Current Semester
            </label>
            <input
              id="profile-semester"
              type="text"
              required
              value={profileForm.semester}
              onChange={(e) => setProfileForm({ ...profileForm, semester: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input"
            />
          </div>

          <div>
            <label
              htmlFor="profile-target-attendance"
              className="block text-white/60 font-medium mb-1.5"
            >
              Default Target Attendance %
            </label>
            <input
              id="profile-target-attendance"
              type="number"
              min="50"
              max="100"
              required
              value={profileForm.targetAttendance}
              onChange={(e) =>
                setProfileForm({ ...profileForm, targetAttendance: Number(e.target.value) })
              }
              className="w-full px-3.5 py-2.5 rounded-xl glass-input tabular-nums"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-white/[0.08] flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink shadow-lg shadow-accent-950/30 transition-colors cursor-pointer"
          >
            Save Profile Details
          </button>
        </div>
      </form>

      {/* Section 3: Account Security & Password */}
      <form
        onSubmit={handleSaveCredentials}
        className="glass-card p-6 rounded-2xl space-y-5"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-accent-400" />
            <h2 className="font-bold text-base text-white">Account Security & Credentials</h2>
          </div>
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Protected</span>
          </span>
        </div>

        {authError && (
          <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium flex flex-wrap items-center justify-between gap-2 animate-fade-in">
            <span>{authError}</span>
            <button
              type="button"
              onClick={() => setForgotModalState({ open: true, openChooser: true })}
              className="text-accent-400 hover:text-accent-300 font-bold underline cursor-pointer whitespace-nowrap"
            >
              Forgot password? Try another way
            </button>
          </div>
        )}

        {authSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{authSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label htmlFor="security-username" className="block text-white/60 font-medium mb-1.5">
              Username
            </label>
            <input
              id="security-username"
              type="text"
              required
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input font-medium"
            />
          </div>

          <div>
            <label
              htmlFor="security-friend-name"
              className="block text-white/60 font-medium mb-1.5 flex items-center justify-between gap-1.5"
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-accent-400" />
                <span>Friend's Name (Password Recovery)</span>
              </span>
              {hasRecoveryConfigured && (
                <span className="text-[11px] font-semibold text-emerald-400">
                  Configured (Hidden)
                </span>
              )}
            </label>
            <input
              id="security-friend-name"
              type={showPassword ? 'text' : 'password'}
              autoComplete="off"
              value={friendNameInput}
              onChange={(e) => setFriendNameInput(e.target.value)}
              placeholder={
                hasRecoveryConfigured
                  ? 'Hidden — enter a new name only to replace it'
                  : 'Set recovery friend name (hashed locally)'
              }
              className="w-full px-3.5 py-2.5 rounded-xl glass-input"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/[0.08] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-white/85">
              Change Password (requires your old password)
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                className="text-white/60 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>{showPassword ? 'Hide' : 'Show'}</span>
              </button>
              <span className="text-white/25" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                onClick={() => setForgotModalState({ open: true, openChooser: false })}
                className="text-accent-400 hover:text-accent-300 font-semibold cursor-pointer whitespace-nowrap"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label
                htmlFor="security-old-password"
                className="block text-white/60 font-medium mb-1.5"
              >
                Old Password
              </label>
              <input
                id="security-old-password"
                type={showPassword ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input"
              />
            </div>

            <div>
              <label
                htmlFor="security-new-password"
                className="block text-white/60 font-medium mb-1.5"
              >
                New Password
              </label>
              <input
                id="security-new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 4 characters"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input"
              />
            </div>

            <div>
              <label
                htmlFor="security-confirm-password"
                className="block text-white/60 font-medium mb-1.5"
              >
                Confirm New Password
              </label>
              <input
                id="security-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sign Out of Workspace</span>
          </button>

          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink shadow-lg shadow-accent-950/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Update Credentials & Password
          </button>
        </div>
      </form>

      {/* Section 4: Data Management & Backup */}
      <div className="glass-card p-6 rounded-2xl space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
          <Database className="w-4 h-4 text-accent-400" />
          <h2 className="font-bold text-base text-white">Data Management & Workspace Reset</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-white">Import File or JSON Backup</h3>
            <p className="text-xs text-white/60">
              Upload any academic document (PDF, Image, Excel, CSV, ICS, Word) or restore a saved JSON backup archive.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenImportModal}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink shadow-lg shadow-accent-950/30 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload / Import File</span>
            </button>
            <button
              type="button"
              onClick={onExportJson}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-white border border-white/[0.12] transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4 text-accent-400" />
              <span>Export JSON Backup</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white/60">
          <div>
            <span className="font-semibold text-rose-300 block">Reset Academic Records</span>
            <span className="text-xs text-white/60">Permanently clears your current subjects, timetable slots, and attendance records.</span>
          </div>
          {confirmReset ? (
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  onResetData();
                  setConfirmReset(false);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Reset</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-2 rounded-xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear / Reset Workspace</span>
            </button>
          )}
        </div>
      </div>
      {forgotModalState.open && (
        <ForgotPasswordModal
          initialUsername={auth.username || usernameInput}
          initialOpenChooser={forgotModalState.openChooser}
          onClose={() => setForgotModalState({ open: false, openChooser: false })}
          onResetSuccess={() => {
            setAuth(db.getAuth());
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setAuthError('');
            setAuthSuccess('Password reset successfully via account recovery!');
            setForgotModalState({ open: false, openChooser: false });
            setTimeout(() => setAuthSuccess(''), 3500);
          }}
        />
      )}
    </div>
  );
};

import React, { useRef, useState } from 'react';
import { UserProfile, AcademicNotification, AppSettings, PrimaryColor } from '../../types/oggytrack';
import { formatDateISO, formatLiveClock, formatReadableISO, useLiveClock } from '../../utils/dateUtils';
import {
  WORKSPACE_ACCENT_PRESETS,
  deriveAccentPalette,
  getReadableOnAccentColor,
  normalizeHexColor,
} from '../../utils/colorPalette';
import {
  compressImageFileToDataUrl,
  normalizeGlassSettings,
} from '../../utils/wallpaperGlass';
import { BrandLogo } from '../common/BrandLogo';
import {
  Bell,
  Plus,
  Check,
  CheckCircle2,
  AlertTriangle,
  Settings as SettingsIcon,
  LogOut,
  ChevronDown,
  Clock,
  Menu,
  Info,
  Palette,
  NotebookPen,
  ImagePlus,
} from 'lucide-react';

interface NavbarProps {
  user: UserProfile;
  settings: AppSettings;
  customWallpaper?: string | null;
  onUpdateWallpaper?: (dataUrl: string | null) => boolean;
  notifications: AcademicNotification[];
  activePage: string;
  onNavigate: (page: string) => void;
  onUpdateSettings?: (updated: AppSettings) => void;
  onOpenMobileSidebar: () => void;
  onQuickAddClass: () => void;
  onQuickAddAssignment: () => void;
  onQuickAddTodoNote?: () => void;
  onMarkNotificationRead: (id: string) => void;
  onClearAllNotifications: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  settings,
  customWallpaper,
  onUpdateWallpaper,
  notifications,
  activePage,
  onNavigate,
  onUpdateSettings,
  onOpenMobileSidebar,
  onQuickAddClass,
  onQuickAddAssignment,
  onQuickAddTodoNote,
  onMarkNotificationRead,
  onClearAllNotifications,
  onSignOut,
}) => {
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const quickWallpaperRef = useRef<HTMLInputElement | null>(null);
  const now = useLiveClock(1000);
  const todayISO = formatDateISO(now);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const glassSettings = normalizeGlassSettings(settings);
  const hasCustomPhoto = Boolean(customWallpaper);

  const activePalette = deriveAccentPalette(
    settings.primaryColor,
    settings.customHex || settings.accentColor
  );

  const handleSelectAccent = (id: PrimaryColor, hex: string) => {
    if (!onUpdateSettings) return;
    onUpdateSettings({
      ...settings,
      primaryColor: id,
      accentColor: hex,
      customHex: id === 'custom' ? hex : settings.customHex,
    });
  };

  const handleQuickWallpaperSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUpdateSettings || !onUpdateWallpaper) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      if (onUpdateWallpaper(dataUrl)) {
        onUpdateSettings({
          ...settings,
          backgroundMode: 'photo',
        });
      }
    } catch {
      // Detailed validation messages are shown in SettingsView
    }
  };

  const getPageTitle = (page: string) => {
    switch (page) {
      case 'dashboard':
        return 'Academic Overview';
      case 'todo':
        return 'To-Do Notebook';
      case 'timetable':
        return 'My Timetable & Schedule';
      case 'attendance':
        return 'Attendance Tracker';
      case 'exams':
        return 'Exams & Marks';
      case 'assignments':
        return 'Assignments & Tasks';
      case 'holidays':
        return 'Holidays & Campus Recess';
      case 'subjects':
        return 'Subject Directory';
      case 'calendar':
        return 'Unified Calendar';
      case 'analytics':
        return 'Performance & Analytics';
      case 'settings':
        return 'System Settings';
      default:
        return 'oggytrack';
    }
  };

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-white/[0.08] px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Mobile Sidebar Toggle + Mobile Full BrandLogo / Desktop Contextual Breadcrumb */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Open navigation menu"
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white transition-colors cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            aria-label="oggytrack home"
            className="md:hidden flex items-center shrink-0 cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-accent-400"
          >
            <BrandLogo size="sm" showText />
          </button>

          <div className="hidden md:block min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-white/60 overflow-hidden">
              <span className="text-accent-400 font-semibold whitespace-nowrap shrink-0">
                oggytrack
              </span>
              <span className="text-white/30 shrink-0">/</span>
              <span className="capitalize truncate">{activePage}</span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
              {getPageTitle(activePage)}
            </h1>
          </div>
        </div>

        {/* Center: Live Date & Time Indicator (Desktop) */}
        <div className="hidden xl:flex items-center gap-2 text-xs text-white/70 font-mono tabular-nums whitespace-nowrap shrink-0 px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <Clock className="w-3.5 h-3.5 text-accent-400 shrink-0" />
          <span>{formatReadableISO(todayISO)}</span>
          <span className="text-white/30">·</span>
          <span className="text-white font-semibold">
            {formatLiveClock(now, settings.timeFormat, true)}
          </span>
        </div>

        {/* Right: Quick Actions, Accent Theme Picker, Notifications & Account */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onQuickAddClass}
            className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-accent-400" />
            <span>Add Class</span>
          </button>

          {activePage === 'todo' && onQuickAddTodoNote ? (
            <button
              type="button"
              onClick={onQuickAddTodoNote}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <NotebookPen className="w-3.5 h-3.5 text-amber-300" />
              <span>New Note</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onQuickAddAssignment}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>Add Task</span>
            </button>
          )}

          {/* Quick Customize Appearance & Background Photo Switcher */}
          {onUpdateSettings && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowColorDropdown(!showColorDropdown);
                  setShowNotifDropdown(false);
                  setShowProfileDropdown(false);
                }}
                aria-label="Customize appearance and background"
                aria-expanded={showColorDropdown}
                title="Customize accent color & background photo"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] text-white/85 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Palette className="w-4 h-4 text-accent-400 shrink-0" />
                <span className="hidden lg:inline text-xs font-semibold">Customize</span>
                <span
                  className="w-2.5 h-2.5 rounded-sm border border-white/25 shrink-0"
                  style={{ backgroundColor: activePalette.accent500 }}
                  aria-hidden="true"
                />
              </button>

              {showColorDropdown && (
                <div
                  role="dialog"
                  aria-label="Customize workspace appearance"
                  className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#0b1122]/95 backdrop-blur-2xl border border-white/[0.16] shadow-2xl p-4 z-50 animate-fade-in text-white space-y-3.5"
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                    <div>
                      <div className="text-xs font-bold text-white">Customize Appearance</div>
                      <div className="text-[11px] text-white/55">
                        {activePalette.name} ·{' '}
                        {glassSettings.backgroundMode === 'photo' && hasCustomPhoto
                          ? 'Photo Wallpaper'
                          : '3D Space'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowColorDropdown(false);
                        onNavigate('settings');
                      }}
                      className="text-[11px] font-semibold text-accent-400 hover:text-accent-300 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Glass Sliders
                    </button>
                  </div>

                  {/* Quick Background Photo Switcher */}
                  <div className="space-y-2 pb-3 border-b border-white/[0.08]">
                    <div className="flex items-center justify-between text-[11px] text-white/70 font-semibold">
                      <span>Background</span>
                      {onUpdateWallpaper && (
                        <>
                          <input
                            ref={quickWallpaperRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                            onChange={handleQuickWallpaperSelect}
                            aria-label="Quick upload background photo"
                            className="sr-only"
                          />
                          <button
                            type="button"
                            onClick={() => quickWallpaperRef.current?.click()}
                            className="inline-flex items-center gap-1 text-accent-400 hover:text-accent-300 font-bold cursor-pointer whitespace-nowrap"
                          >
                            <ImagePlus className="w-3.5 h-3.5" />
                            <span>{hasCustomPhoto ? 'Change Photo' : 'Upload Photo'}</span>
                          </button>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            backgroundMode: 'space',
                          })
                        }
                        aria-pressed={glassSettings.backgroundMode === 'space' || !hasCustomPhoto}
                        className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
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
                            quickWallpaperRef.current?.click();
                            return;
                          }
                          onUpdateSettings({
                            ...settings,
                            backgroundMode: 'photo',
                          });
                        }}
                        aria-pressed={glassSettings.backgroundMode === 'photo' && hasCustomPhoto}
                        className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          glassSettings.backgroundMode === 'photo' && hasCustomPhoto
                            ? 'bg-accent-500 text-accent-ink font-bold'
                            : 'text-white/70 hover:text-white'
                        }`}
                      >
                        Custom Photo
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {WORKSPACE_ACCENT_PRESETS.map((preset) => {
                      const isSelected = settings.primaryColor === preset.id;
                      const checkColor = getReadableOnAccentColor(preset.baseHex);

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectAccent(preset.id, preset.baseHex)}
                          aria-label={`Apply ${preset.name} theme`}
                          aria-pressed={isSelected}
                          title={preset.name}
                          className={`h-9 rounded-xl border flex items-center justify-center transition-transform cursor-pointer ${
                            isSelected
                              ? 'border-white scale-105 shadow-md'
                              : 'border-white/15 opacity-85 hover:opacity-100 hover:scale-105'
                          }`}
                          style={{ backgroundColor: preset.baseHex }}
                        >
                          {isSelected && (
                            <Check
                              className="w-4 h-4 stroke-[3]"
                              style={{ color: checkColor }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-between gap-2 text-xs">
                    <label
                      htmlFor="navbar-custom-accent-picker"
                      className="text-white/70 font-medium cursor-pointer"
                    >
                      Custom Color
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-white/55 uppercase tabular-nums">
                        {activePalette.accent500}
                      </span>
                      <input
                        id="navbar-custom-accent-picker"
                        type="color"
                        aria-label="Choose custom workspace accent color"
                        value={normalizeHexColor(
                          settings.customHex || activePalette.accent500,
                          '#10b981'
                        )}
                        onChange={(e) =>
                          handleSelectAccent('custom', normalizeHexColor(e.target.value))
                        }
                        className="w-7 h-7 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notifications Center */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
                setShowProfileDropdown(false);
                setShowColorDropdown(false);
              }}
              className="relative p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/70 hover:text-white transition-colors cursor-pointer"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-accent-500 text-accent-ink text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0d1320]/98 backdrop-blur-2xl border border-white/[0.1] shadow-2xl p-4 z-50 animate-fade-in text-white">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-white">Notifications</span>
                    <span className="text-white/40">·</span>
                    <span className="text-accent-400 font-semibold tabular-nums">
                      {unreadCount} unread
                    </span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={onClearAllNotifications}
                      className="text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 mt-3 pr-1 text-xs">
                  {notifications.map((n) => (
                    <button
                      type="button"
                      key={n.id}
                      onClick={() => onMarkNotificationRead(n.id)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                        n.read
                          ? 'border-white/[0.05] bg-white/[0.02] text-white/60'
                          : 'border-accent-500/30 bg-accent-500/[0.08] text-white'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {n.type === 'attendance_warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        ) : n.type === 'assignment_due' ? (
                          <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-accent-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs text-white">{n.title}</div>
                          <div className="text-[11px] text-white/70 mt-0.5 leading-relaxed">
                            {n.message}
                          </div>
                          <div className="text-[10px] text-white/50 mt-1 tabular-nums">
                            {new Date(n.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}

                  {notifications.length === 0 && (
                    <div className="py-6 text-center text-xs text-white/50">
                      No notifications right now.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowProfileDropdown(!showProfileDropdown);
                setShowNotifDropdown(false);
                setShowColorDropdown(false);
              }}
              className="flex items-center gap-2 p-1.5 sm:px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white transition-colors cursor-pointer"
              aria-label="User profile menu"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent-500 to-accent-secondary flex items-center justify-center font-bold text-xs text-accent-ink shrink-0">
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <span className="hidden sm:inline font-medium text-xs max-w-[100px] truncate">
                {user.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-white/60" />
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0d1320]/98 backdrop-blur-2xl border border-white/[0.1] shadow-2xl p-3 z-50 animate-fade-in text-white">
                <div className="p-2 border-b border-white/[0.08]">
                  <div className="font-bold text-xs text-white truncate">{user.name}</div>
                  <div className="text-[11px] text-white/60 truncate">
                    {user.studentId} · {user.institution}
                  </div>
                  <div className="text-[11px] text-accent-400 mt-1 truncate">
                    {user.degree} · {user.semester}
                  </div>
                </div>

                <div className="space-y-1 mt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('settings');
                      setShowProfileDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] text-white/80 hover:text-white transition-colors cursor-pointer"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-accent-400" />
                    <span>Settings & Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileDropdown(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-rose-500/15 text-rose-300 hover:text-rose-200 transition-colors border-t border-white/[0.06] pt-2 mt-1 cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-rose-500/15 border border-white/[0.08] hover:border-rose-500/30 text-white/70 hover:text-rose-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Sign Out of your workspace"
            aria-label="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

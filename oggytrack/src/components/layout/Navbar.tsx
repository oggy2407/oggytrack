import React, { useState } from 'react';
import { UserProfile, AcademicNotification, AppSettings } from '../../types/oggytrack';
import { formatDateISO, formatLiveClock, formatReadableISO, useLiveClock } from '../../utils/dateUtils';
import { 
  Bell, 
  Sparkles, 
  Plus, 
  CheckCircle2,
  AlertTriangle,
  Settings as SettingsIcon,
  LogOut,
  ChevronDown,
  Clock,
  Menu
} from 'lucide-react';

interface NavbarProps {
  user: UserProfile;
  settings: AppSettings;
  notifications: AcademicNotification[];
  activePage: string;
  onNavigate: (page: string) => void;
  onOpenMobileSidebar: () => void;
  onQuickAddClass: () => void;
  onQuickAddAssignment: () => void;
  onMarkNotificationRead: (id: string) => void;
  onClearAllNotifications: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  settings,
  notifications,
  activePage,
  onNavigate,
  onOpenMobileSidebar,
  onQuickAddClass,
  onQuickAddAssignment,
  onMarkNotificationRead,
  onClearAllNotifications,
  onSignOut,
}) => {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const now = useLiveClock(1000);
  const todayISO = formatDateISO(now);
  const unreadCount = notifications.filter((n) => !n.read).length;


  const getPageTitle = (page: string) => {
    switch (page) {
      case 'dashboard': return 'Academic Overview';
      case 'timetable': return 'My Timetable & Schedule';
      case 'attendance': return 'Attendance Tracker';
      case 'assignments': return 'Assignments & Tasks';
      case 'holidays': return 'Holidays & Campus Recess';
      case 'subjects': return 'Subject Directory';
      case 'calendar': return 'Unified Calendar';
      case 'analytics': return 'Performance & Analytics';
      case 'settings': return 'System Settings';
      default: return 'oggytrack';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/75 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-2.5 sm:py-3 transition-colors">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Mobile Sidebar Toggle + Breadcrumbs & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Open navigation menu"
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-400/80">
              <span>oggytrack</span>
              <span className="text-white/30">/</span>
              <span className="capitalize truncate">{activePage}</span>
            </div>
            <h1 className="text-sm sm:text-lg font-bold text-white tracking-tight truncate">
              {getPageTitle(activePage)}
            </h1>
          </div>
        </div>

        {/* Center: Live Date & Time Indicator (Desktop) */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 font-mono tabular-nums px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
          <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>{formatReadableISO(todayISO)}</span>
          <span className="text-white/30">·</span>
          <span className="text-white font-semibold">{formatLiveClock(now, settings.timeFormat, true)}</span>
        </div>

        {/* Right: Actions, Notifications & Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Add Class */}
          <button
            onClick={onQuickAddClass}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span>Add Class</span>
          </button>

          {/* Quick Add Assignment */}
          <button
            onClick={onQuickAddAssignment}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Add Task</span>
          </button>

          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-4 z-50 animate-fade-in text-slate-100">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-purple-400">
                      Notifications
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                      {unreadCount} unread
                    </span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={onClearAllNotifications}
                      className="text-[11px] text-slate-400 hover:text-white transition-colors"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 mt-3 pr-1 text-xs">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => onMarkNotificationRead(n.id)}
                      className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                        n.read
                          ? 'border-white/5 bg-white/5 text-slate-400'
                          : 'border-purple-500/30 bg-purple-950/30 text-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {n.type === 'attendance_warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        ) : n.type === 'assignment_due' ? (
                          <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-xs text-white">{n.title}</div>
                          <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                            {n.message}
                          </div>
                          <div className="text-[9px] text-slate-500 mt-1">
                            {new Date(n.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {notifications.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No notifications at this time.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2 p-1.5 sm:px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all hover:scale-102 active:scale-95"
              aria-label="User profile menu"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-xs text-white shadow-xs">
                {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <span className="hidden sm:inline font-medium text-xs max-w-[100px] truncate">
                {user.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/98 backdrop-blur-2xl border border-white/15 shadow-2xl p-3 z-50 animate-fade-in text-slate-100">
                <div className="p-2 border-b border-white/10">
                  <div className="font-bold text-xs text-white truncate">{user.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                  <div className="text-[10px] text-purple-400 mt-1">{user.degree} · {user.semester}</div>
                </div>

                <div className="space-y-1 mt-2 text-xs">
                  <button
                    onClick={() => {
                      onNavigate('settings');
                      setShowProfileDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-purple-400" />
                    <span>Settings & Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-rose-500/15 text-rose-300 hover:text-rose-200 transition-colors border-t border-white/5 pt-2 mt-1 cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Sign Out Button in Header */}
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-300 transition-all cursor-pointer"
            title="Sign Out of your workspace"
            aria-label="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

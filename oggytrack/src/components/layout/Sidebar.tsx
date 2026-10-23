import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserProfile, AppSettings } from '../../types/oggytrack';
import { formatDateISO, formatLiveClock, formatReadableISO, useLiveClock } from '../../utils/dateUtils';
import { 
  LayoutDashboard, 
  Calendar, 
  TrendingUp, 
  FileCheck, 
  Palmtree, 
  BookOpen, 
  CalendarDays, 
  BarChart3, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  X,
  LogOut,
  Clock
} from 'lucide-react';

interface SidebarProps {
  user: UserProfile;
  settings: AppSettings;
  activePage: string;
  onNavigate: (page: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  settings,
  activePage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onSignOut,
}) => {
  const now = useLiveClock(1000);
  const todayISO = formatDateISO(now);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'timetable', label: 'My Timetable', icon: Calendar },
    { id: 'attendance', label: 'Attendance', icon: TrendingUp },
    { id: 'assignments', label: 'Assignments', icon: FileCheck },
    { id: 'holidays', label: 'Holidays', icon: Palmtree },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleMobileSelect = (pageId: string) => {
    onNavigate(pageId);
    onCloseMobile();
  };

  return (
    <>
      {/* Desktop Persistent Left Sidebar */}
      <aside
        aria-label="Primary Sidebar Navigation"
        className={`hidden md:flex flex-col justify-between shrink-0 transition-transform duration-200 relative z-20 ${
          collapsed ? 'w-20' : 'w-64'
        } bg-slate-950/75 backdrop-blur-2xl border-r border-white/10`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-lg shadow-purple-600/20">
                O
              </div>
              {!collapsed && (
                <div className="truncate text-left">
                  <span className="font-extrabold text-lg tracking-tight text-white whitespace-nowrap">
                    oggytrack
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation List */}
          <nav className="p-3 space-y-1.5" aria-label="Main sections">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors group whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-purple-600/20 text-white border border-purple-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  } ${collapsed ? 'justify-center px-2' : ''}`}
                  title={item.label}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-purple-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {!collapsed && <span className="truncate tracking-wide">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Student Profile Footer */}
        <div className="p-3 border-t border-white/10 bg-white/[0.02]">
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors text-left ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Account & Settings"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center font-bold text-xs text-purple-300 shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="truncate text-left text-xs min-w-0">
                <div className="font-semibold text-white truncate">{user.name}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {user.studentId} · {user.semester || 'Enrolled'}
                </div>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Left Sidebar Drawer */}
      {mobileOpen &&
        createPortal(
          <div className="md:hidden fixed inset-0 z-[90] flex">
            {/* Backdrop Scrim */}
            <div
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
              onClick={onCloseMobile}
              aria-hidden="true"
            />

            {/* Slide-In Left Sidebar */}
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Sidebar Navigation"
              className="relative z-10 w-72 max-w-[84vw] h-full bg-slate-950 border-r border-white/15 shadow-2xl flex flex-col justify-between overflow-y-auto animate-fade-in text-slate-100"
            >
              <div>
                {/* Mobile Sidebar Brand & Close Header */}
                <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/10">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-lg shadow-purple-600/20">
                      O
                    </div>
                    <span className="font-extrabold text-lg tracking-tight text-white truncate">
                      oggytrack
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={onCloseMobile}
                    aria-label="Close navigation menu"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Live Local Date & Clock Strip */}
                <div className="px-4 py-2.5 border-b border-white/10 bg-white/[0.02] flex items-center gap-2 text-xs text-slate-300 font-mono tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="truncate">{formatReadableISO(todayISO)}</span>
                  <span className="text-white/30">·</span>
                  <span className="text-white font-semibold shrink-0">
                    {formatLiveClock(now, settings.timeFormat, false)}
                  </span>
                </div>

                {/* Mobile Sidebar Links (44px+ touch targets) */}
                <nav className="p-3 space-y-1" aria-label="Mobile sections">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePage === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleMobileSelect(item.id)}
                        className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          isActive
                            ? 'bg-purple-600/20 text-white border border-purple-500/40'
                            : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-purple-400' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate tracking-wide">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Mobile Sidebar Footer: Profile + Sign Out */}
              <div className="p-3 border-t border-white/10 bg-white/[0.02] space-y-2">
                <button
                  type="button"
                  onClick={() => handleMobileSelect('settings')}
                  className="w-full min-h-[44px] flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center font-bold text-xs text-purple-300 shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-white truncate">{user.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {user.studentId} · {user.semester || 'Enrolled'}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onCloseMobile();
                    onSignOut();
                  }}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
};


import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserProfile, AppSettings } from '../../types/oggytrack';
import { formatDateISO, formatLiveClock, formatReadableISO, useLiveClock } from '../../utils/dateUtils';
import { BrandLogo } from '../common/BrandLogo';
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
  Clock,
  GraduationCap,
  NotebookPen,
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
    { id: 'todo', label: 'To-Do Notebook', icon: NotebookPen },
    { id: 'timetable', label: 'My Timetable', icon: Calendar },
    { id: 'attendance', label: 'Attendance', icon: TrendingUp },
    { id: 'exams', label: 'Exams & Marks', icon: GraduationCap },
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
        className={`hidden md:flex flex-col justify-between shrink-0 sticky top-0 h-screen overflow-y-auto transition-[width] duration-200 z-20 ${
          collapsed ? 'w-20' : 'w-64'
        } glass-panel border-r border-white/[0.08]`}
      >
        <div>
          {/* Brand Header */}
          {collapsed ? (
            <div className="py-3 px-2 flex flex-col items-center gap-2 border-b border-white/[0.08]">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                aria-label="oggytrack dashboard"
                title="oggytrack"
                className="p-1 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-accent-400"
              >
                <BrandLogo size="md" showText={false} />
              </button>
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="w-9 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="px-4 py-3.5 flex items-center justify-between gap-2 border-b border-white/[0.08]">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                aria-label="oggytrack dashboard"
                className="flex items-center shrink-0 cursor-pointer text-left rounded-xl focus-visible:outline-2 focus-visible:outline-accent-400"
              >
                <BrandLogo size="md" showText />
              </button>

              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Navigation List */}
          <nav className="p-3 space-y-1" aria-label="Main sections">
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
                      ? 'bg-accent-500/15 text-white border border-accent-500/30'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  } ${collapsed ? 'justify-center px-2' : ''}`}
                  title={item.label}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-accent-400' : 'text-white/50 group-hover:text-white/90'
                    }`}
                  />
                  {!collapsed && <span className="truncate tracking-wide">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Student Profile Footer */}
        <div className="p-3 border-t border-white/[0.08] bg-white/[0.015]">
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.05] cursor-pointer transition-colors text-left ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Account & Settings"
          >
            <div className="w-8 h-8 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center font-bold text-xs text-accent-300 shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="truncate text-left text-xs min-w-0">
                <div className="font-semibold text-white truncate">{user.name}</div>
                <div className="text-[11px] text-white/60 truncate">
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
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-fade-in"
              onClick={onCloseMobile}
              aria-hidden="true"
            />

            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Sidebar Navigation"
              className="relative z-10 w-72 max-w-[84vw] h-full bg-[#090d16] border-r border-white/[0.1] shadow-2xl flex flex-col justify-between overflow-y-auto animate-fade-in text-white"
            >
              <div>
                <div className="px-4 py-3.5 flex items-center justify-between gap-2 border-b border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => handleMobileSelect('dashboard')}
                    aria-label="oggytrack dashboard"
                    className="flex items-center shrink-0 cursor-pointer text-left rounded-xl"
                  >
                    <BrandLogo size="md" showText />
                  </button>

                  <button
                    type="button"
                    onClick={onCloseMobile}
                    aria-label="Close navigation menu"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-4 py-2.5 border-b border-white/[0.08] bg-white/[0.02] flex items-center gap-2 text-xs text-white/70 font-mono tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-accent-400 shrink-0" />
                  <span className="truncate">{formatReadableISO(todayISO)}</span>
                  <span className="text-white/30">·</span>
                  <span className="text-white font-semibold shrink-0">
                    {formatLiveClock(now, settings.timeFormat, false)}
                  </span>
                </div>

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
                            ? 'bg-accent-500/15 text-white border border-accent-500/30'
                            : 'text-white/70 hover:text-white hover:bg-white/[0.04] border border-transparent'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-accent-400' : 'text-white/50'
                          }`}
                        />
                        <span className="truncate tracking-wide">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="p-3 border-t border-white/[0.08] bg-white/[0.015] space-y-2">
                <button
                  type="button"
                  onClick={() => handleMobileSelect('settings')}
                  className="w-full min-h-[44px] flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.05] transition-colors text-left cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center font-bold text-xs text-accent-300 shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-white truncate">{user.name}</div>
                    <div className="text-[11px] text-white/60 truncate">
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

import React, { useState } from 'react';
import { DesignConfig, PreviewScreen, ViewportMode } from '../../types/design';
import { PreviewDashboard } from './PreviewDashboard';
import { PreviewTimetable } from './PreviewTimetable';
import { PreviewAttendance } from './PreviewAttendance';
import { PreviewAssignments } from './PreviewAssignments';
import { PreviewCalendar } from './PreviewCalendar';
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
  Sliders, 
  Monitor, 
  Smartphone, 
  Download, 
  ArrowLeft, 
  Check, 
  Bell, 
  Search, 
  Menu,
  ChevronRight,
  LogOut,
  Sparkles
} from 'lucide-react';

interface PreviewShellProps {
  config: DesignConfig;
  activeScreen: PreviewScreen;
  onScreenChange: (screen: PreviewScreen) => void;
  onOpenCustomizer: () => void;
  onBackToWizard: () => void;
  onApproveDesign: () => void;
}

export const PreviewShell: React.FC<PreviewShellProps> = ({
  config,
  activeScreen,
  onScreenChange,
  onOpenCustomizer,
  onBackToWizard,
  onApproveDesign,
}) => {
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  const navItems: { id: PreviewScreen | 'holidays' | 'subjects' | 'analytics' | 'settings'; label: string; icon: any }[] = [
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

  const handleNavClick = (id: string) => {
    if (['dashboard', 'timetable', 'attendance', 'assignments', 'calendar'].includes(id)) {
      onScreenChange(id as PreviewScreen);
      setMobileMenuOpen(false);
    } else {
      // For holidays, subjects, analytics, settings in the preview, route intelligently or open settings
      if (id === 'settings') {
        onOpenCustomizer();
      } else if (id === 'holidays' || id === 'calendar') {
        onScreenChange('calendar');
      } else if (id === 'subjects' || id === 'analytics') {
        onScreenChange('attendance');
      }
      setMobileMenuOpen(false);
    }
  };



  // Determine container classes based on theme and density
  const isDark = config.theme === 'dark';
  const densityPadding = 
    config.density === 'compact' ? 'p-4 sm:p-5' : 
    config.density === 'spacious' ? 'p-6 sm:p-8' : 
    'p-5 sm:p-6';

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <PreviewDashboard config={config} onNavigateScreen={onScreenChange} />;
      case 'timetable':
        return <PreviewTimetable config={config} />;
      case 'attendance':
        return <PreviewAttendance config={config} />;
      case 'assignments':
        return <PreviewAssignments config={config} />;
      case 'calendar':
        return <PreviewCalendar config={config} />;
      default:
        return <PreviewDashboard config={config} onNavigateScreen={onScreenChange} />;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'}`}>
      {/* Top Banner Control Bar (Preview Toolbar) */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Back & Active Design Info */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToWizard}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Designs</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-500">Previewing:</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {config.name}
              </span>
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: config.accentColor }}
              />
            </div>
          </div>

          {/* Center: Viewport Switcher (Desktop 1440px vs Mobile 390px) */}
          <div className="flex items-center p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-xs">
            <button
              onClick={() => setViewport('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                viewport === 'desktop'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Desktop View</span>
            </button>

            <button
              onClick={() => setViewport('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                viewport === 'mobile'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Mobile (390px)</span>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCustomizer}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Customize</span>
            </button>



            <button
              onClick={onApproveDesign}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg text-white shadow-xs transition-opacity hover:opacity-95"
              style={{ backgroundColor: config.accentColor }}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Approve & Continue</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container: Desktop or Mobile Simulator Frame */}
      {viewport === 'desktop' ? (
        <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
          {/* Left Sidebar */}
          <aside
            className={`transition-all duration-200 shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between ${
              isDark ? 'bg-slate-900/90' : 'bg-white'
            } ${
              config.sidebarStyle === 'icon-only'
                ? 'w-18'
                : sidebarCollapsed
                ? 'w-18'
                : 'w-64'
            }`}
          >
            <div>
              {/* App Brand Lockup */}
              <div className="p-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs"
                    style={{ backgroundColor: config.accentColor }}
                  >
                    O
                  </div>
                  {!sidebarCollapsed && config.sidebarStyle !== 'icon-only' && (
                    <div className="truncate">
                      <div className="font-extrabold text-base tracking-tight text-slate-900 dark:text-slate-100">
                        oggytrack
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Academic Dashboard
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="p-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeScreen === item.id;
                  const isIconOnly = sidebarCollapsed || config.sidebarStyle === 'icon-only';

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                      } ${isIconOnly ? 'justify-center px-2' : ''}`}
                      title={item.label}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!isIconOnly && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Student Profile */}
            <div className="p-3 border-t border-slate-200/80 dark:border-slate-800">
              <div
                onClick={onOpenCustomizer}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                  AR
                </div>
                {!sidebarCollapsed && config.sidebarStyle !== 'icon-only' && (
                  <div className="truncate text-left">
                    <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                      Alex Rivers
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      CS · Year 3 (Sem 5)
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content Workspace */}
          <main className="flex-1 flex flex-col min-w-0">
            {/* Top Workspace Header */}
            <div className="bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  oggytrack / {activeScreen}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative hidden md:block w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search classes, notes, codes..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
                  </button>
                  <button
                    onClick={onOpenCustomizer}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    title="Design Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Screen Content Viewport */}
            <div className={`flex-1 overflow-y-auto ${densityPadding}`}>
              {renderActiveScreen()}
            </div>
          </main>
        </div>
      ) : (
        /* Mobile 390px Viewport Frame Simulator */
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-[390px] h-[780px] bg-white dark:bg-slate-900 border-8 border-slate-800 rounded-[44px] shadow-2xl overflow-hidden flex flex-col relative">
            {/* Phone Speaker Notch & Status Bar */}
            <div className="h-6 bg-slate-900 flex items-center justify-between px-6 text-white text-[10px] font-medium shrink-0">
              <span>9:41</span>
              <div className="w-16 h-3 bg-black rounded-full" />
              <span>5G · 100%</span>
            </div>

            {/* Mobile App Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-black"
                  style={{ backgroundColor: config.accentColor }}
                >
                  O
                </div>
                <span className="font-bold text-sm tracking-tight">oggytrack</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenCustomizer}
                  className="p-1 rounded text-slate-500"
                >
                  <Sliders className="w-4 h-4 text-indigo-500" />
                </button>
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                  AR
                </div>
              </div>
            </div>

            {/* Mobile Screen Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {renderActiveScreen()}
            </div>

            {/* Mobile Bottom Navigation Bar (as per mobileNav setting) */}
            <div className="h-14 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-around px-2 shrink-0">
              {[
                { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
                { id: 'timetable', label: 'Timetable', icon: Calendar },
                { id: 'attendance', label: 'Attendance', icon: TrendingUp },
                { id: 'assignments', label: 'Tasks', icon: FileCheck },
                { id: 'calendar', label: 'Calendar', icon: CalendarDays },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeScreen === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onScreenChange(tab.id as PreviewScreen)}
                    className={`flex flex-col items-center justify-center py-1 px-2 text-[10px] transition-colors ${
                      isActive
                        ? 'font-bold'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    style={{ color: isActive ? config.accentColor : undefined }}
                  >
                    <Icon className="w-4 h-4 mb-0.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Home indicator bar */}
            <div className="h-4 bg-white dark:bg-slate-900 flex justify-center items-center pb-1">
              <div className="w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

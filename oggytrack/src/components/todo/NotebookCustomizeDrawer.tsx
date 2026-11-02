import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  KanbanColumnId,
  NotebookConfig,
  NotebookPaperStyle,
  NotebookTheme,
  NotebookThemeColors,
} from '../../types/oggytrack';
import {
  NOTEBOOK_BODY_FONTS,
  NOTEBOOK_DEFAULT_THEME_COLORS,
  NOTEBOOK_HAND_FONTS,
} from '../../utils/notebookKanban';
import { RotateCcw, X } from 'lucide-react';

interface NotebookCustomizeDrawerProps {
  open: boolean;
  theme: NotebookTheme;
  cfg: NotebookConfig;
  activePageName: string;
  onChangeCfg: (updated: NotebookConfig) => void;
  onRenameActivePage: (name: string) => void;
  onResetAll: () => void;
  onClose: () => void;
}

const COLOR_FIELDS: Array<{ key: keyof NotebookThemeColors; label: string }> = [
  { key: 'paper', label: 'Paper' },
  { key: 'ink', label: 'Ink' },
  { key: 'lines', label: 'Ruled lines' },
  { key: 'margin', label: 'Margin line' },
  { key: 'accent', label: 'Buttons & focus' },
  { key: 'high', label: 'High priority notes' },
  { key: 'med', label: 'Medium priority notes' },
  { key: 'low', label: 'Low priority notes' },
];

export const NotebookCustomizeDrawer: React.FC<NotebookCustomizeDrawerProps> = ({
  open,
  theme,
  cfg,
  activePageName,
  onChangeCfg,
  onRenameActivePage,
  onResetAll,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const getThemeColor = (key: keyof NotebookThemeColors): string => {
    return cfg.c?.[theme]?.[key] || NOTEBOOK_DEFAULT_THEME_COLORS[theme][key];
  };

  const handleSetThemeColor = (key: keyof NotebookThemeColors, hex: string) => {
    onChangeCfg({
      ...cfg,
      c: {
        ...cfg.c,
        [theme]: {
          ...(cfg.c?.[theme] || {}),
          [key]: hex,
        },
      },
    });
  };

  const handleSetColumnName = (col: KanbanColumnId, value: string) => {
    onChangeCfg({
      ...cfg,
      cols: {
        ...cfg.cols,
        [col]: value || 'Untitled',
      },
    });
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Customize your notebook"
      className="fixed inset-0 z-[95] flex justify-end bg-black/35 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="w-full max-w-md h-full bg-[#0c1220]/98 border-l border-white/[0.12] text-white shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Customize Your Notebook
            </h2>
            <p className="text-xs text-white/60">
              Editing {theme === 'dark' ? 'night' : 'day'} paper & layout preferences
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white/80 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notebook customization"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {/* 1. Colours for Day / Night Page */}
          <fieldset className="space-y-2.5 border-b border-white/[0.08] pb-5">
            <legend className="text-xs font-bold uppercase tracking-wider text-accent-400 mb-2">
              Colours for {theme === 'dark' ? 'Night' : 'Day'} Page
            </legend>
            <div className="grid grid-cols-2 gap-2.5">
              {COLOR_FIELDS.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] cursor-pointer"
                >
                  <span className="text-white/80 truncate">{field.label}</span>
                  <input
                    type="color"
                    value={getThemeColor(field.key)}
                    onChange={(e) => handleSetThemeColor(field.key, e.target.value)}
                    className="w-7 h-7 rounded-md border border-white/20 bg-transparent cursor-pointer shrink-0"
                  />
                </label>
              ))}
            </div>
          </fieldset>

          {/* 2. Fonts & Size */}
          <fieldset className="space-y-3 border-b border-white/[0.08] pb-5">
            <legend className="text-xs font-bold uppercase tracking-wider text-accent-400 mb-1">
              Fonts & Scale
            </legend>

            <label className="block space-y-1">
              <span className="text-white/75 font-medium">Handwriting Font</span>
              <select
                value={cfg.hand}
                onChange={(e) => onChangeCfg({ ...cfg, hand: e.target.value })}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs bg-[#111827]"
              >
                {Object.entries(NOTEBOOK_HAND_FONTS).map(([label, val]) => (
                  <option key={label} value={val} className="bg-[#111827] text-white">
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-white/75 font-medium">Body Font</span>
              <select
                value={cfg.body}
                onChange={(e) => onChangeCfg({ ...cfg, body: e.target.value })}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs bg-[#111827]"
              >
                {Object.entries(NOTEBOOK_BODY_FONTS).map(([label, val]) => (
                  <option key={label} value={val} className="bg-[#111827] text-white">
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center justify-between gap-3">
              <span className="text-white/75 font-medium">Text Size ({cfg.fs.toFixed(2)}x)</span>
              <input
                type="range"
                min={0.85}
                max={1.25}
                step={0.05}
                value={cfg.fs}
                onChange={(e) => onChangeCfg({ ...cfg, fs: Number(e.target.value) })}
                className="w-44 accent-emerald-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between gap-3">
              <span className="text-white/75 font-medium">Heading Size ({cfg.hs.toFixed(2)}x)</span>
              <input
                type="range"
                min={0.75}
                max={1.35}
                step={0.05}
                value={cfg.hs}
                onChange={(e) => onChangeCfg({ ...cfg, hs: Number(e.target.value) })}
                className="w-44 accent-emerald-400 cursor-pointer"
              />
            </label>
          </fieldset>

          {/* 3. Paper & Binding */}
          <fieldset className="space-y-3 border-b border-white/[0.08] pb-5">
            <legend className="text-xs font-bold uppercase tracking-wider text-accent-400 mb-1">
              Paper & Spiral Binding
            </legend>

            <label className="block space-y-1">
              <span className="text-white/75 font-medium">Paper Ruling</span>
              <select
                value={cfg.paper}
                onChange={(e) =>
                  onChangeCfg({ ...cfg, paper: e.target.value as NotebookPaperStyle })
                }
                className="w-full glass-input rounded-xl px-3 py-2 text-xs bg-[#111827]"
              >
                <option value="ruled" className="bg-[#111827]">
                  Ruled
                </option>
                <option value="grid" className="bg-[#111827]">
                  Grid
                </option>
                <option value="dots" className="bg-[#111827]">
                  Dots
                </option>
                <option value="plain" className="bg-[#111827]">
                  Plain
                </option>
              </select>
            </label>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-white/80">
                <input
                  type="checkbox"
                  checked={cfg.margin}
                  onChange={(e) => onChangeCfg({ ...cfg, margin: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-400"
                />
                <span>Show vertical margin line</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-white/80">
                <span>Spiral rings</span>
                <input
                  type="color"
                  value={cfg.ring}
                  onChange={(e) => onChangeCfg({ ...cfg, ring: e.target.value })}
                  className="w-7 h-7 rounded-md border border-white/20 bg-transparent cursor-pointer"
                />
              </label>
            </div>
          </fieldset>

          {/* 4. Sticky Notes */}
          <fieldset className="space-y-3 border-b border-white/[0.08] pb-5">
            <legend className="text-xs font-bold uppercase tracking-wider text-accent-400 mb-1">
              Sticky Notes
            </legend>

            <label className="flex items-center justify-between gap-3">
              <span className="text-white/75 font-medium">Card Tilt ({cfg.tm.toFixed(1)}x)</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={cfg.tm}
                onChange={(e) => onChangeCfg({ ...cfg, tm: Number(e.target.value) })}
                className="w-44 accent-emerald-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between gap-3">
              <span className="text-white/75 font-medium">Corner Roundness ({cfg.cr}px)</span>
              <input
                type="range"
                min={0}
                max={18}
                step={1}
                value={cfg.cr}
                onChange={(e) => onChangeCfg({ ...cfg, cr: Number(e.target.value) })}
                className="w-44 accent-emerald-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-white/80">
              <input
                type="checkbox"
                checked={cfg.tape}
                onChange={(e) => onChangeCfg({ ...cfg, tape: e.target.checked })}
                className="w-4 h-4 rounded accent-emerald-400"
              />
              <span>Show masking tape strips on notes</span>
            </label>
          </fieldset>

          {/* 5. Words & Column Labels */}
          <fieldset className="space-y-3 border-b border-white/[0.08] pb-5">
            <legend className="text-xs font-bold uppercase tracking-wider text-accent-400 mb-1">
              Headings & Motto
            </legend>

            <label className="block space-y-1">
              <span className="text-white/75 font-medium">Active Page Name</span>
              <input
                type="text"
                maxLength={28}
                value={activePageName}
                onChange={(e) => onRenameActivePage(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-white/75 font-medium">Motto Under Clock</span>
              <input
                type="text"
                maxLength={60}
                value={cfg.motto}
                onChange={(e) => onChangeCfg({ ...cfg, motto: e.target.value })}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs"
              />
            </label>

            <div className="grid grid-cols-3 gap-2">
              <label className="block space-y-1">
                <span className="text-white/65">Column 1</span>
                <input
                  type="text"
                  maxLength={20}
                  value={cfg.cols.todo}
                  onChange={(e) => handleSetColumnName('todo', e.target.value)}
                  className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-white/65">Column 2</span>
                <input
                  type="text"
                  maxLength={20}
                  value={cfg.cols.doing}
                  onChange={(e) => handleSetColumnName('doing', e.target.value)}
                  className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-white/65">Column 3</span>
                <input
                  type="text"
                  maxLength={20}
                  value={cfg.cols.done}
                  onChange={(e) => handleSetColumnName('done', e.target.value)}
                  className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs"
                />
              </label>
            </div>
          </fieldset>

          {/* 6. Clock & Sketch Pad */}
          <fieldset className="space-y-2.5 pb-4">
            <legend className="text-xs font-bold uppercase tracking-wider text-accent-400 mb-1">
              Clock & Sketch Pad
            </legend>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer text-white/80">
                <input
                  type="checkbox"
                  checked={cfg.clock}
                  onChange={(e) => onChangeCfg({ ...cfg, clock: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-400"
                />
                <span>Show clock</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-white/80">
                <input
                  type="checkbox"
                  checked={cfg.sec}
                  onChange={(e) => onChangeCfg({ ...cfg, sec: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-400"
                />
                <span>Show seconds</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-white/80">
                <input
                  type="checkbox"
                  checked={cfg.h24}
                  onChange={(e) => onChangeCfg({ ...cfg, h24: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-400"
                />
                <span>24-hour time</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-white/80">
                <input
                  type="checkbox"
                  checked={cfg.date}
                  onChange={(e) => onChangeCfg({ ...cfg, date: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-400"
                />
                <span>Show date</span>
              </label>
              <label className="col-span-2 flex items-center gap-2 cursor-pointer text-white/80">
                <input
                  type="checkbox"
                  checked={cfg.pad}
                  onChange={(e) => onChangeCfg({ ...cfg, pad: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-400"
                />
                <span>Show Polaroid photo & scribble pad</span>
              </label>
            </div>
          </fieldset>
        </div>
      </aside>
    </div>,
    document.body
  );
};

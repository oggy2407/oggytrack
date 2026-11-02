import React, { useEffect, useRef, useState } from 'react';
import {
  Assignment,
  KanbanColumnId,
  KanbanPriority,
  KanbanTask,
  NotebookConfig,
  NotebookWorkspaceState,
  Subject,
} from '../../types/oggytrack';
import {
  KANBAN_COLUMN_IDS,
  KANBAN_PRIORITY_LABELS,
  addNotebookPage,
  addTaskToBoard,
  applyNotebookSkin,
  clearColumnInBoard,
  computeNoteTilt,
  computeNotebookSummary,
  createDefaultNotebookConfig,
  createKanbanTask,
  cycleKanbanPriority,
  deleteTaskFromBoard,
  filterBoardColumnTasks,
  findTaskColumnInBoard,
  getActiveBoard,
  isTaskOverdue,
  moveTaskInBoard,
  parseExternalNotebookJson,
  renameNotebookPage,
  syncAssignmentsToNotebookBoard,
  tearOutNotebookPage,
  updateTaskInBoard,
} from '../../utils/notebookKanban';
import { formatDateISO, useLiveClock } from '../../utils/dateUtils';
import { ModalShell } from '../common/ModalShell';
import { NotebookScribblePad } from './NotebookScribblePad';
import { NotebookCustomizeDrawer } from './NotebookCustomizeDrawer';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react';

interface NotebookKanbanViewProps {
  workspace: NotebookWorkspaceState;
  subjects: Subject[];
  assignments: Assignment[];
  autoOpenAddModal?: boolean;
  onConsumeAutoOpen?: () => void;
  onChangeWorkspace: (updated: NotebookWorkspaceState) => void;
}

interface NoteModalState {
  isOpen: boolean;
  isNew: boolean;
  taskId: string;
  title: string;
  note: string;
  priority: KanbanPriority;
  due: string;
  columnId: KanbanColumnId;
  subjectId: string;
}

interface UndoSnapshot {
  message: string;
  previousData: NotebookWorkspaceState['data'];
}

export const NotebookKanbanView: React.FC<NotebookKanbanViewProps> = ({
  workspace,
  subjects,
  assignments,
  autoOpenAddModal = false,
  onConsumeAutoOpen,
  onChangeWorkspace,
}) => {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const now = useLiveClock(1000);
  const todayISO = formatDateISO(now);

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | KanbanPriority>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>('');
  const [tearArmed, setTearArmed] = useState<boolean>(false);
  const [flippingKey, setFlippingKey] = useState<number>(0);

  const [editingInlineNoteId, setEditingInlineNoteId] = useState<string | null>(null);
  const [inlineNoteDraft, setInlineNoteDraft] = useState<string>('');

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumnId | null>(null);
  const [clearedColumns, setClearedColumns] = useState<Record<string, boolean>>({});

  const [customizeOpen, setCustomizeOpen] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);

  const [modalState, setModalState] = useState<NoteModalState>({
    isOpen: false,
    isNew: true,
    taskId: '',
    title: '',
    note: '',
    priority: 'med',
    due: '',
    columnId: 'todo',
    subjectId: '',
  });

  const activeBoard = getActiveBoard(workspace.data);
  const summary = computeNotebookSummary(workspace.data, todayISO);
  const isFiltering =
    searchQuery.trim() !== '' || priorityFilter !== 'all' || subjectFilter !== 'all';

  useEffect(() => {
    if (shellRef.current) {
      applyNotebookSkin(shellRef.current.style, workspace.theme, workspace.cfg);
    }
  }, [workspace.theme, workspace.cfg]);

  useEffect(() => {
    if (autoOpenAddModal) {
      openAddNoteModal('todo');
      onConsumeAutoOpen?.();
    }
  }, [autoOpenAddModal]);

  useEffect(() => {
    if (!tearArmed) return;
    const timer = window.setTimeout(() => setTearArmed(false), 3200);
    return () => window.clearTimeout(timer);
  }, [tearArmed]);

  useEffect(() => {
    if (!statusBanner) return;
    const timer = window.setTimeout(() => setStatusBanner(null), 4000);
    return () => window.clearTimeout(timer);
  }, [statusBanner]);

  const triggerPageFlip = (mutateFn: () => NotebookWorkspaceState) => {
    setFlippingKey((prev) => prev + 1);
    onChangeWorkspace(mutateFn());
  };

  const updateData = (nextData: NotebookWorkspaceState['data']) => {
    onChangeWorkspace({
      ...workspace,
      data: nextData,
    });
  };

  const updateConfig = (nextCfg: NotebookConfig) => {
    onChangeWorkspace({
      ...workspace,
      cfg: nextCfg,
    });
  };

  const openAddNoteModal = (columnId: KanbanColumnId) => {
    setModalState({
      isOpen: true,
      isNew: true,
      taskId: '',
      title: '',
      note: '',
      priority: 'med',
      due: '',
      columnId,
      subjectId: subjectFilter !== 'all' ? subjectFilter : '',
    });
  };

  const openEditNoteModal = (task: KanbanTask) => {
    const col = findTaskColumnInBoard(activeBoard, task.id) || 'todo';
    setModalState({
      isOpen: true,
      isNew: false,
      taskId: task.id,
      title: task.title,
      note: task.note,
      priority: task.priority,
      due: task.due || '',
      columnId: col,
      subjectId: task.subjectId || '',
    });
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = modalState.title.trim();
    if (!cleanTitle) return;

    const linkedSub = subjects.find((s) => s.id === modalState.subjectId);

    if (modalState.isNew) {
      const task = createKanbanTask(cleanTitle, modalState.priority, modalState.note, {
        due: modalState.due,
        subjectId: linkedSub?.id,
        subjectCode: linkedSub?.code,
      });
      updateData(addTaskToBoard(workspace.data, activeBoard.id, modalState.columnId, task));
    } else {
      updateData(
        updateTaskInBoard(
          workspace.data,
          activeBoard.id,
          modalState.taskId,
          {
            title: cleanTitle,
            note: modalState.note.trim(),
            priority: modalState.priority,
            due: modalState.due,
            subjectId: linkedSub?.id,
            subjectCode: linkedSub?.code,
          },
          modalState.columnId
        )
      );
    }

    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCyclePriority = (task: KanbanTask) => {
    const nextPriority = cycleKanbanPriority(task.priority);
    updateData(
      updateTaskInBoard(workspace.data, activeBoard.id, task.id, { priority: nextPriority })
    );
  };

  const handleDeleteTask = (task: KanbanTask) => {
    const previousData = workspace.data;
    const res = deleteTaskFromBoard(workspace.data, activeBoard.id, task.id);
    updateData(res.data);
    setUndoSnapshot({
      message: `Removed "${task.title}"`,
      previousData,
    });
  };

  const handleQuickMove = (taskId: string, targetCol: KanbanColumnId) => {
    updateData(moveTaskInBoard(workspace.data, activeBoard.id, taskId, targetCol, 0));
  };

  const handleClearDone = () => {
    if (activeBoard.columns.done.length === 0) return;
    const previousData = workspace.data;
    const res = clearColumnInBoard(workspace.data, activeBoard.id, 'done');
    setClearedColumns((prev) => ({ ...prev, [`${activeBoard.id}_done`]: true }));
    updateData(res.data);
    setUndoSnapshot({
      message: `Cleared ${res.clearedTasks.length} completed ${
        res.clearedTasks.length === 1 ? 'note' : 'notes'
      }`,
      previousData,
    });
  };

  const handleSwitchBoard = (boardId: string) => {
    if (boardId === activeBoard.id) return;
    setTearArmed(false);
    setRenamingBoardId(null);
    triggerPageFlip(() => ({
      ...workspace,
      data: {
        ...workspace.data,
        activeId: boardId,
      },
    }));
  };

  const handleAddPage = () => {
    setTearArmed(false);
    const added = addNotebookPage(workspace.data, 'New page');
    triggerPageFlip(() => ({
      ...workspace,
      data: added.data,
    }));
    setRenamingBoardId(added.newBoardId);
    setRenameDraft('New page');
  };

  const commitRenameBoard = (boardId: string, keep: boolean) => {
    if (keep && renameDraft.trim()) {
      updateData(renameNotebookPage(workspace.data, boardId, renameDraft));
    }
    setRenamingBoardId(null);
  };

  const handleTearOutClick = () => {
    if (workspace.data.boards.length <= 1) return;
    if (!tearArmed) {
      setTearArmed(true);
      return;
    }
    const previousData = workspace.data;
    const tornName = activeBoard.name;
    setTearArmed(false);
    triggerPageFlip(() => ({
      ...workspace,
      data: tearOutNotebookPage(workspace.data, activeBoard.id),
    }));
    setUndoSnapshot({
      message: `Tore out page "${tornName}"`,
      previousData,
    });
  };

  const handleToggleDayNight = () => {
    const nextTheme = workspace.theme === 'dark' ? 'light' : 'dark';
    triggerPageFlip(() => ({
      ...workspace,
      theme: nextTheme,
    }));
  };

  const handleSyncAssignments = () => {
    const res = syncAssignmentsToNotebookBoard(workspace.data, activeBoard.id, assignments);
    if (res.addedCount > 0) {
      updateData(res.data);
      setStatusBanner(
        `Synced ${res.addedCount} coursework ${
          res.addedCount === 1 ? 'task' : 'tasks'
        } into "${activeBoard.name}".`
      );
    } else {
      setStatusBanner(
        assignments.length === 0
          ? 'No coursework deadlines in Assignments yet to sync.'
          : `All ${assignments.length} coursework tasks are already on "${activeBoard.name}".`
      );
    }
  };

  const handleExportNotebookJson = () => {
    const json = JSON.stringify(workspace, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notebook-kanban-${todayISO}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusBanner('Exported Notebook Kanban JSON.');
  };

  const handleImportNotebookJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const parsed = parseExternalNotebookJson(reader.result);
      if (!parsed || !parsed.data) {
        setStatusBanner('Could not parse file. Select a valid Notebook Kanban JSON file.');
        return;
      }
      triggerPageFlip(() => ({
        data: parsed.data!,
        cfg: parsed.cfg || workspace.cfg,
        theme: parsed.theme || workspace.theme,
        scribbleDataUrl:
          parsed.scribbleDataUrl !== undefined ? parsed.scribbleDataUrl : workspace.scribbleDataUrl,
        photoDataUrl:
          parsed.photoDataUrl !== undefined ? parsed.photoDataUrl : workspace.photoDataUrl,
      }));
      setStatusBanner(`Imported ${parsed.data.boards.length} notebook page(s) successfully.`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formattedClock = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    ...(workspace.cfg.sec ? { second: '2-digit' } : {}),
    hour12: !workspace.cfg.h24,
  });

  const formattedDate = now.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Compact Workspace Action Bar */}
      <div className="glass-card rounded-2xl px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/60">
            <span className="font-semibold text-accent-400">Notebook Kanban</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{summary.totalBoards} pages</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums text-white/85">
              {summary.totalOpenCount} open · {summary.totalDoneCount} done
            </span>
            {summary.overdueCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums text-rose-400 font-semibold">
                  {summary.overdueCount} overdue
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-white/55 mt-0.5">
            Spiral notebook board · Sync coursework deadlines or import/export JSON
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSyncAssignments}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.1] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Pull pending coursework deadlines from Assignments into this notebook page"
          >
            <RefreshCw className="w-3.5 h-3.5 text-accent-400 shrink-0" />
            <span>Sync Coursework</span>
          </button>

          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.1] text-white/85 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Import JSON from Notebook Kanban"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Import JSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportNotebookJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.1] text-white/85 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Export Notebook Kanban JSON"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setCustomizeOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink shadow-md shadow-accent-950/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Customize</span>
          </button>

          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportNotebookJson}
            aria-label="Import Notebook Kanban JSON file"
            className="hidden"
          />
        </div>
      </div>

      {/* Status or Undo Toast Banner */}
      {(statusBanner || undoSnapshot) && (
        <div className="glass-card rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs animate-fade-in border border-accent-500/30">
          <span className="text-white/90 font-medium truncate">
            {undoSnapshot ? undoSnapshot.message : statusBanner}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {undoSnapshot && (
              <button
                type="button"
                onClick={() => {
                  updateData(undoSnapshot.previousData);
                  setUndoSnapshot(null);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-500 text-accent-ink font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss notification banner"
              onClick={() => {
                setStatusBanner(null);
                setUndoSnapshot(null);
              }}
              className="p-1 text-white/60 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Spiral-Bound Notebook Spread */}
      <div
        ref={shellRef}
        data-nb-theme={workspace.theme}
        className="nb-shell flex flex-col md:flex-row items-stretch"
      >
        <div className="nb-rings" aria-hidden="true" />

        <div className="nb-stage">
          {flippingKey > 0 && <div key={flippingKey} className="nb-page-flip" aria-hidden="true" />}

          <div
            data-paper={workspace.cfg.paper}
            data-margin={workspace.cfg.margin ? 'true' : 'false'}
            className="nb-paper nb-crease px-5 sm:px-8 md:pl-[74px] md:pr-8 pt-6 pb-10 min-h-[680px]"
          >
            {/* Top Row: Clock + Motto + Day/Night Toggle & Polaroid Scribble Pad */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-5">
              <div className="space-y-1">
                {workspace.cfg.clock && (
                  <div className="nb-hand text-4xl sm:text-5xl font-bold tracking-tight tabular-nums">
                    {formattedClock}
                  </div>
                )}
                {workspace.cfg.date && (
                  <div className="nb-hand text-xl opacity-80">{formattedDate}</div>
                )}
                {workspace.cfg.motto && (
                  <p className="text-sm opacity-75">{workspace.cfg.motto}</p>
                )}

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleDayNight}
                    className="nb-btn inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-lg font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {workspace.theme === 'dark' ? (
                      <>
                        <Sun className="w-4 h-4 shrink-0" />
                        <span>Switch to day</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4 shrink-0" />
                        <span>Switch to night</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {workspace.cfg.pad && (
                <NotebookScribblePad
                  scribbleDataUrl={workspace.scribbleDataUrl}
                  photoDataUrl={workspace.photoDataUrl}
                  onChangeScribble={(dataUrl) =>
                    onChangeWorkspace({ ...workspace, scribbleDataUrl: dataUrl })
                  }
                  onChangePhoto={(dataUrl) =>
                    onChangeWorkspace({ ...workspace, photoDataUrl: dataUrl })
                  }
                />
              )}
            </div>

            {/* Active Page Heading & Notebook Page Tabs */}
            <header className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="nb-hand nb-title-scale font-bold tracking-tight break-words">
                  {activeBoard.name}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setRenamingBoardId(activeBoard.id);
                    setRenameDraft(activeBoard.name);
                  }}
                  aria-label={`Rename ${activeBoard.name} page`}
                  title="Rename this notebook page"
                  className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              <nav
                aria-label="Notebook pages"
                className="flex flex-wrap items-center gap-1.5"
              >
                {workspace.data.boards.map((board) => {
                  const isCurrent = board.id === activeBoard.id;
                  if (renamingBoardId === board.id) {
                    return (
                      <input
                        key={board.id}
                        type="text"
                        maxLength={24}
                        autoFocus
                        aria-label="Notebook page name"
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => commitRenameBoard(board.id, true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            commitRenameBoard(board.id, true);
                          } else if (e.key === 'Escape') {
                            commitRenameBoard(board.id, false);
                          }
                        }}
                        className="nb-field nb-hand rounded-t-xl px-3 py-1.5 text-xl font-bold w-36"
                      />
                    );
                  }

                  return (
                    <button
                      key={board.id}
                      type="button"
                      aria-current={isCurrent ? 'page' : undefined}
                      onClick={() => handleSwitchBoard(board.id)}
                      onDoubleClick={() => {
                        setRenamingBoardId(board.id);
                        setRenameDraft(board.name);
                      }}
                      className="nb-tab px-4 py-1.5 text-xl font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-transform"
                    >
                      {board.name}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={handleAddPage}
                  className="nb-tab-ghost px-3.5 py-1.5 text-xl font-semibold whitespace-nowrap shrink-0 cursor-pointer hover:opacity-100 opacity-85"
                >
                  + page
                </button>

                {workspace.data.boards.length > 1 && (
                  <button
                    type="button"
                    onClick={handleTearOutClick}
                    className="nb-tab-ghost px-3.5 py-1.5 text-xl font-semibold whitespace-nowrap shrink-0 cursor-pointer hover:opacity-100 opacity-85"
                  >
                    {tearArmed ? 'tap again to confirm' : 'tear out'}
                  </button>
                )}
              </nav>
            </header>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-6">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none" />
                <input
                  type="search"
                  aria-label="Search notes"
                  placeholder="Search notes…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="nb-field w-full rounded-lg pl-9 pr-3 py-2 text-sm font-medium"
                />
              </div>

              <select
                aria-label="Filter by priority"
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(e.target.value as 'all' | KanbanPriority)
                }
                className="nb-field rounded-lg px-3 py-2 text-sm font-semibold cursor-pointer"
              >
                <option value="all">All priorities</option>
                <option value="high">High</option>
                <option value="med">Medium</option>
                <option value="low">Low</option>
              </select>

              {subjects.length > 0 && (
                <select
                  aria-label="Filter by course"
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="nb-field rounded-lg px-3 py-2 text-sm font-semibold cursor-pointer"
                >
                  <option value="all">All courses</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} · {sub.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 3 Kanban Columns: To Do / In Progress / Done */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
              {KANBAN_COLUMN_IDS.map((colId, colIdx) => {
                const colTitle = workspace.cfg.cols[colId] || 'Untitled';
                const allColTasks = activeBoard.columns[colId];
                const visibleTasks = filterBoardColumnTasks(
                  allColTasks,
                  searchQuery,
                  priorityFilter,
                  subjectFilter
                );
                const isDropTarget = dragOverColumn === colId;
                const prevCol: KanbanColumnId | null =
                  colIdx > 0 ? KANBAN_COLUMN_IDS[colIdx - 1] : null;
                const nextCol: KanbanColumnId | null =
                  colIdx < KANBAN_COLUMN_IDS.length - 1
                    ? KANBAN_COLUMN_IDS[colIdx + 1]
                    : null;

                return (
                  <section
                    key={colId}
                    aria-label={colTitle}
                    onDragOver={(e) => {
                      if (!draggedTaskId) return;
                      e.preventDefault();
                      if (dragOverColumn !== colId) setDragOverColumn(colId);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverColumn(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverColumn(null);
                      const droppedId =
                        draggedTaskId || e.dataTransfer.getData('text/plain');
                      setDraggedTaskId(null);
                      if (!droppedId) return;
                      updateData(
                        moveTaskInBoard(workspace.data, activeBoard.id, droppedId, colId)
                      );
                    }}
                    className="flex flex-col"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="nb-hand nb-col-scale font-bold flex items-baseline gap-2">
                        <span>{colTitle}</span>
                        <span className="text-lg opacity-65 tabular-nums">
                          {allColTasks.length}
                        </span>
                      </h3>

                      {colId === 'done' && allColTasks.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearDone}
                          className="nb-hand text-base font-semibold opacity-70 hover:opacity-100 underline underline-offset-2 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Clear done
                        </button>
                      )}
                    </div>

                    {/* Hand-drawn wavy squiggle divider */}
                    <svg
                      viewBox="0 0 200 8"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                      className="w-full h-2 fill-none stroke-current opacity-60 mb-3.5"
                    >
                      <path
                        d="M0 4 Q12 0 25 4 T50 4 T75 4 T100 4 T125 4 T150 4 T175 4 T200 4"
                        strokeWidth="1.7"
                      />
                    </svg>

                    <div
                      className={`flex-1 min-h-[140px] space-y-4 rounded-xl py-1.5 transition-colors ${
                        isDropTarget ? 'bg-black/[0.07] px-2' : ''
                      }`}
                    >
                      {visibleTasks.map((task) => {
                        const overdue = isTaskOverdue(task, colId, todayISO);
                        const tiltDeg = computeNoteTilt(task.id, workspace.cfg.tm);
                        const noteColorClass =
                          task.priority === 'high'
                            ? 'nb-note-high'
                            : task.priority === 'low'
                            ? 'nb-note-low'
                            : 'nb-note-med';

                        return (
                          <article
                            key={task.id}
                            ref={(el) => {
                              if (el) {
                                el.style.setProperty('--nb-note-tilt', `${tiltDeg}deg`);
                              }
                            }}
                            draggable={
                              !isFiltering && editingInlineNoteId !== task.id
                            }
                            onDragStart={(e) => {
                              setDraggedTaskId(task.id);
                              e.dataTransfer.setData('text/plain', task.id);
                            }}
                            onDragEnd={() => {
                              setDraggedTaskId(null);
                              setDragOverColumn(null);
                            }}
                            className={`nb-note ${noteColorClass} px-4 pt-4 pb-2.5 ${
                              !isFiltering ? 'cursor-grab active:cursor-grabbing' : ''
                            }`}
                          >
                            {workspace.cfg.tape && (
                              <span className="nb-tape" aria-hidden="true" />
                            )}

                            {colId === 'done' && (
                              <svg
                                viewBox="0 0 40 40"
                                aria-hidden="true"
                                className="absolute right-2.5 top-1.5 w-8 h-8 fill-none stroke-[#2e9e5b] stroke-[4] pointer-events-none"
                              >
                                <path
                                  d="M6 22 L16 32 L35 7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="nb-check-path"
                                />
                              </svg>
                            )}

                            <h4
                              className={`nb-hand text-2xl font-bold leading-tight pr-7 break-words ${
                                colId === 'done' ? 'line-through opacity-80' : ''
                              }`}
                            >
                              {task.title}
                            </h4>

                            {/* Inline Note Body Editor */}
                            {editingInlineNoteId === task.id ? (
                              <textarea
                                rows={2}
                                autoFocus
                                value={inlineNoteDraft}
                                placeholder="Write an extra note…"
                                onChange={(e) => setInlineNoteDraft(e.target.value)}
                                onBlur={() => {
                                  updateData(
                                    updateTaskInBoard(
                                      workspace.data,
                                      activeBoard.id,
                                      task.id,
                                      { note: inlineNoteDraft.trim() }
                                    )
                                  );
                                  setEditingInlineNoteId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setEditingInlineNoteId(null);
                                  }
                                }}
                                className="mt-1.5 w-full rounded-md border border-current/40 bg-white/30 px-2 py-1 text-sm focus:outline-none"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingInlineNoteId(task.id);
                                  setInlineNoteDraft(task.note);
                                }}
                                className={`mt-1 block w-full text-left text-sm leading-snug break-words cursor-pointer ${
                                  task.note ? 'opacity-90' : 'opacity-55 italic'
                                }`}
                              >
                                {task.note || '+ add a note'}
                              </button>
                            )}

                            {/* Metadata & Interactive Controls Footer */}
                            <footer className="mt-2.5 pt-1.5 border-t border-current/15 flex items-center justify-between gap-2 text-xs">
                              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleCyclePriority(task)}
                                  aria-label={`Priority ${
                                    KANBAN_PRIORITY_LABELS[task.priority]
                                  }. Tap to change`}
                                  title="Click to cycle priority"
                                  className="px-2 py-0.5 rounded-md border border-current/60 font-bold whitespace-nowrap shrink-0 cursor-pointer hover:bg-black/5 transition-colors"
                                >
                                  {KANBAN_PRIORITY_LABELS[task.priority]}
                                </button>

                                {task.subjectCode && (
                                  <span className="font-mono font-bold opacity-85">
                                    · {task.subjectCode}
                                  </span>
                                )}

                                {task.due && (
                                  <time
                                    dateTime={task.due}
                                    className={`tabular-nums ${
                                      overdue
                                        ? 'font-bold text-rose-700'
                                        : 'opacity-80'
                                    }`}
                                  >
                                    · {overdue ? `overdue ${task.due}` : `due ${task.due}`}
                                  </time>
                                )}
                              </div>

                              <div className="flex items-center gap-0.5 shrink-0">
                                {prevCol && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickMove(task.id, prevCol)}
                                    aria-label={`Move ${task.title} to ${workspace.cfg.cols[prevCol]}`}
                                    title={`Move to ${workspace.cfg.cols[prevCol]}`}
                                    className="p-1.5 rounded-md opacity-70 hover:opacity-100 hover:bg-black/10 transition-colors cursor-pointer"
                                  >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {nextCol && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickMove(task.id, nextCol)}
                                    aria-label={`Move ${task.title} to ${workspace.cfg.cols[nextCol]}`}
                                    title={`Move to ${workspace.cfg.cols[nextCol]}`}
                                    className="p-1.5 rounded-md opacity-70 hover:opacity-100 hover:bg-black/10 transition-colors cursor-pointer"
                                  >
                                    {nextCol === 'done' ? (
                                      <Check className="w-3.5 h-3.5" />
                                    ) : (
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => openEditNoteModal(task)}
                                  aria-label={`Edit ${task.title}`}
                                  title="Edit sticky note"
                                  className="p-1.5 rounded-md opacity-70 hover:opacity-100 hover:bg-black/10 transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(task)}
                                  aria-label={`Delete ${task.title}`}
                                  title="Delete sticky note"
                                  className="p-1.5 rounded-md opacity-70 hover:opacity-100 hover:bg-black/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </footer>
                          </article>
                        );
                      })}

                      {visibleTasks.length === 0 && (
                        <p className="nb-hand py-7 px-3 text-center text-2xl opacity-65">
                          {allColTasks.length > 0
                            ? 'No notes match your search.'
                            : clearedColumns[`${activeBoard.id}_${colId}`]
                            ? 'Page cleared. Nicely done.'
                            : 'Nothing here yet, turn the page and start something.'}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openAddNoteModal(colId)}
                      className="nb-btn-dashed mt-3 w-full rounded-lg py-2 text-xl font-bold whitespace-nowrap shrink-0 cursor-pointer hover:bg-black/[0.04] transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>Add a note</span>
                    </button>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Sticky Note Modal */}
      {modalState.isOpen && (
        <ModalShell
          title={modalState.isNew ? 'New Sticky Note' : 'Edit Sticky Note'}
          subtitle={`Page: ${activeBoard.name} · ${workspace.cfg.cols[modalState.columnId]}`}
          maxWidthClass="max-w-md"
          onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        >
          <form onSubmit={handleSaveModal} className="space-y-4 text-white">
            <label className="block space-y-1.5 text-xs">
              <span className="font-semibold text-white/85">Title *</span>
              <input
                type="text"
                required
                autoFocus
                maxLength={100}
                placeholder="e.g., Revise graph traversal proofs"
                value={modalState.title}
                onChange={(e) =>
                  setModalState((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm"
              />
            </label>

            <label className="block space-y-1.5 text-xs">
              <span className="font-semibold text-white/85">Extra Note (Optional)</span>
              <textarea
                rows={3}
                placeholder="Sub-steps, lecture page numbers, or reminders…"
                value={modalState.note}
                onChange={(e) =>
                  setModalState((prev) => ({ ...prev, note: e.target.value }))
                }
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm"
              />
            </label>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="block space-y-1.5">
                <span className="font-semibold text-white/85">Column</span>
                <select
                  value={modalState.columnId}
                  onChange={(e) =>
                    setModalState((prev) => ({
                      ...prev,
                      columnId: e.target.value as KanbanColumnId,
                    }))
                  }
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-xs bg-[#111827]"
                >
                  {KANBAN_COLUMN_IDS.map((cid) => (
                    <option key={cid} value={cid} className="bg-[#111827]">
                      {workspace.cfg.cols[cid]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="font-semibold text-white/85">Due Date (Optional)</span>
                <input
                  type="date"
                  value={modalState.due}
                  onChange={(e) =>
                    setModalState((prev) => ({ ...prev, due: e.target.value }))
                  }
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-xs"
                />
              </label>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-white/85 block">Priority</span>
              <div className="grid grid-cols-3 gap-2">
                {(['high', 'med', 'low'] as KanbanPriority[]).map((pri) => {
                  const active = modalState.priority === pri;
                  return (
                    <button
                      key={pri}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setModalState((prev) => ({ ...prev, priority: pri }))
                      }
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-accent-500 text-accent-ink border-accent-400'
                          : 'bg-white/[0.04] border-white/[0.1] text-white/75 hover:text-white'
                      }`}
                    >
                      {KANBAN_PRIORITY_LABELS[pri]}
                    </button>
                  );
                })}
              </div>
            </div>

            {subjects.length > 0 && (
              <label className="block space-y-1.5 text-xs">
                <span className="font-semibold text-white/85">
                  Link to Subject (Optional)
                </span>
                <select
                  value={modalState.subjectId}
                  onChange={(e) =>
                    setModalState((prev) => ({ ...prev, subjectId: e.target.value }))
                  }
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-xs bg-[#111827]"
                >
                  <option value="" className="bg-[#111827]">
                    No linked subject
                  </option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id} className="bg-[#111827]">
                      {sub.code} — {sub.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white/80 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold rounded-xl bg-accent-500 hover:bg-accent-400 text-accent-ink transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Save Note
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Customize Notebook Drawer */}
      <NotebookCustomizeDrawer
        open={customizeOpen}
        theme={workspace.theme}
        cfg={workspace.cfg}
        activePageName={activeBoard.name}
        onChangeCfg={updateConfig}
        onRenameActivePage={(newName) =>
          updateData(renameNotebookPage(workspace.data, activeBoard.id, newName))
        }
        onResetAll={() =>
          onChangeWorkspace({
            ...workspace,
            cfg: createDefaultNotebookConfig(),
          })
        }
        onClose={() => setCustomizeOpen(false)}
      />
    </div>
  );
};

import {
  Assignment,
  KanbanColumnId,
  KanbanPriority,
  KanbanTask,
  NotebookBoard,
  NotebookConfig,
  NotebookData,
  NotebookTheme,
  NotebookThemeColors,
  NotebookWorkspaceState,
  Subject,
} from '../types/oggytrack';

export const KANBAN_COLUMN_IDS: KanbanColumnId[] = ['todo', 'doing', 'done'];

export const KANBAN_PRIORITY_LABELS: Record<KanbanPriority, string> = {
  high: 'High',
  med: 'Medium',
  low: 'Low',
};

export const NOTEBOOK_HAND_FONTS: Record<string, string> = {
  Caveat: "'Caveat', cursive",
  'Patrick Hand': "'Patrick Hand', cursive",
  Kalam: "'Kalam', cursive",
  'Gloria Hallelujah': "'Gloria Hallelujah', cursive",
  'Shadows Into Light': "'Shadows Into Light', cursive",
  'Indie Flower': "'Indie Flower', cursive",
};

export const NOTEBOOK_BODY_FONTS: Record<string, string> = {
  Nunito: "'Nunito', 'Plus Jakarta Sans', system-ui, sans-serif",
  'Plus Jakarta Sans': "'Plus Jakarta Sans', system-ui, sans-serif",
  Lora: "'Lora', Georgia, serif",
  'Special Elite': "'Special Elite', monospace",
};

export const NOTEBOOK_DEFAULT_THEME_COLORS: Record<NotebookTheme, NotebookThemeColors> = {
  light: {
    paper: '#f7edd3',
    ink: '#2a2f55',
    lines: '#5a82b4',
    margin: '#d4504c',
    accent: '#3b4a9c',
    high: '#ffd3dc',
    med: '#fff1a6',
    low: '#d3f0df',
  },
  dark: {
    paper: '#1b2238',
    ink: '#ece8da',
    lines: '#c8d7ff',
    margin: '#b85a5a',
    accent: '#ffcf7a',
    high: '#4b3046',
    med: '#4a432c',
    low: '#2b4a3d',
  },
};

export function createNotebookId(prefix: string = 'nb'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createKanbanTask(
  title: string,
  priority: KanbanPriority = 'med',
  note: string = '',
  extras?: Partial<Omit<KanbanTask, 'id' | 'title' | 'priority' | 'note'>> & { id?: string }
): KanbanTask {
  return {
    id: extras?.id || createNotebookId('note'),
    title: title.trim(),
    note: note.trim(),
    priority,
    due: extras?.due || '',
    subjectId: extras?.subjectId,
    subjectCode: extras?.subjectCode,
    sourceAssignmentId: extras?.sourceAssignmentId,
    createdAt: extras?.createdAt || new Date().toISOString(),
  };
}

export function createNotebookBoard(
  name: string,
  todo: KanbanTask[] = [],
  doing: KanbanTask[] = [],
  done: KanbanTask[] = [],
  id?: string
): NotebookBoard {
  return {
    id: id || createNotebookId('page'),
    name: name.trim() || 'Untitled',
    columns: {
      todo,
      doing,
      done,
    },
  };
}

export function createDefaultNotebookConfig(): NotebookConfig {
  return {
    hand: NOTEBOOK_HAND_FONTS.Caveat,
    body: NOTEBOOK_BODY_FONTS.Nunito,
    paper: 'ruled',
    margin: true,
    fs: 1,
    hs: 1,
    tm: 1,
    cr: 3,
    tape: true,
    h24: false,
    sec: true,
    date: true,
    clock: true,
    pad: true,
    motto: 'Write it down, tick it off.',
    ring: '#d9d9d9',
    cols: {
      todo: 'To Do',
      doing: 'In Progress',
      done: 'Done',
    },
    c: {
      light: {},
      dark: {},
    },
  };
}

export function createDefaultNotebookData(subjects: Subject[] = []): NotebookData {
  const firstSub = subjects[0];
  const secondSub = subjects[1];

  const studyBoard = createNotebookBoard(
    'Study',
    [
      createKanbanTask('Revise DSA notes', 'high', 'Arrays and linked lists', {
        id: 'nb_seed_dsa',
        subjectId: firstSub?.id,
        subjectCode: firstSub?.code,
      }),
      createKanbanTask('Finish reading report', 'med', '', {
        id: 'nb_seed_report',
        subjectId: secondSub?.id,
        subjectCode: secondSub?.code,
      }),
    ],
    [],
    [],
    'nb_page_study'
  );

  const projectBoard = createNotebookBoard(
    'Project',
    [
      createKanbanTask('Sketch wireframes', 'med', 'Map core user flows before coding', {
        id: 'nb_seed_wireframes',
      }),
    ],
    [],
    [],
    'nb_page_project'
  );

  const personalBoard = createNotebookBoard(
    'Personal',
    [
      createKanbanTask('Buy ink refills', 'low', '', {
        id: 'nb_seed_ink',
      }),
    ],
    [],
    [],
    'nb_page_personal'
  );

  return {
    boards: [studyBoard, projectBoard, personalBoard],
    activeId: studyBoard.id,
  };
}

export function createDefaultNotebookWorkspace(subjects: Subject[] = []): NotebookWorkspaceState {
  return {
    data: createDefaultNotebookData(subjects),
    cfg: createDefaultNotebookConfig(),
    theme: 'light',
    scribbleDataUrl: null,
    photoDataUrl: null,
  };
}

export function getActiveBoard(data: NotebookData): NotebookBoard {
  return data.boards.find((b) => b.id === data.activeId) || data.boards[0];
}

export function computeNoteTilt(id: string, tiltMultiplier: number = 1): number {
  const charSum = [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const rawDeg = (charSum % 7) - 3; // -3 to +3
  return Number((rawDeg * tiltMultiplier).toFixed(2));
}

export function getReadableNoteInk(hex: string): string {
  const clean = hex.trim().replace(/^#/, '');
  const normalized =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return '#1d2040';
  }
  const num = parseInt(normalized, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? '#1d2040' : '#f2efe4';
}

export interface ResolvedNotebookPalette extends NotebookThemeColors {
  highInk: string;
  medInk: string;
  lowInk: string;
  rule: string;
  soft: string;
  field: string;
}

export function resolveNotebookPalette(
  theme: NotebookTheme,
  cfg: NotebookConfig
): ResolvedNotebookPalette {
  const base = NOTEBOOK_DEFAULT_THEME_COLORS[theme];
  const overrides = cfg.c?.[theme] || {};
  const merged: NotebookThemeColors = {
    paper: overrides.paper || base.paper,
    ink: overrides.ink || base.ink,
    lines: overrides.lines || base.lines,
    margin: overrides.margin || base.margin,
    accent: overrides.accent || base.accent,
    high: overrides.high || base.high,
    med: overrides.med || base.med,
    low: overrides.low || base.low,
  };

  return {
    ...merged,
    highInk: getReadableNoteInk(merged.high),
    medInk: getReadableNoteInk(merged.med),
    lowInk: getReadableNoteInk(merged.low),
    rule: `color-mix(in srgb, ${merged.lines} ${theme === 'dark' ? 18 : 32}%, transparent)`,
    soft: `color-mix(in srgb, ${merged.ink} 68%, ${merged.paper})`,
    field: `color-mix(in srgb, ${merged.paper} 86%, #ffffff)`,
  };
}

export function applyNotebookSkin(
  styleTarget: { setProperty: (name: string, value: string) => void },
  theme: NotebookTheme,
  cfg: NotebookConfig
): ResolvedNotebookPalette {
  const palette = resolveNotebookPalette(theme, cfg);
  styleTarget.setProperty('--nb-hand', cfg.hand);
  styleTarget.setProperty('--nb-body', cfg.body);
  styleTarget.setProperty('--nb-fs', String(cfg.fs));
  styleTarget.setProperty('--nb-hs', String(cfg.hs));
  styleTarget.setProperty('--nb-cr', `${cfg.cr}px`);
  styleTarget.setProperty('--nb-ring', cfg.ring);
  styleTarget.setProperty('--nb-paper', palette.paper);
  styleTarget.setProperty('--nb-ink', palette.ink);
  styleTarget.setProperty('--nb-margin', palette.margin);
  styleTarget.setProperty('--nb-accent', palette.accent);
  styleTarget.setProperty('--nb-high', palette.high);
  styleTarget.setProperty('--nb-med', palette.med);
  styleTarget.setProperty('--nb-low', palette.low);
  styleTarget.setProperty('--nb-high-ink', palette.highInk);
  styleTarget.setProperty('--nb-med-ink', palette.medInk);
  styleTarget.setProperty('--nb-low-ink', palette.lowInk);
  styleTarget.setProperty('--nb-rule', palette.rule);
  styleTarget.setProperty('--nb-soft', palette.soft);
  styleTarget.setProperty('--nb-field', palette.field);
  return palette;
}

export function cycleKanbanPriority(current: KanbanPriority): KanbanPriority {
  if (current === 'high') return 'med';
  if (current === 'med') return 'low';
  return 'high';
}

export function isTaskOverdue(
  task: KanbanTask,
  columnId: KanbanColumnId,
  todayISO: string
): boolean {
  return Boolean(task.due && columnId !== 'done' && task.due < todayISO);
}

export function filterBoardColumnTasks(
  tasks: KanbanTask[],
  query: string,
  priorityFilter: 'all' | KanbanPriority = 'all',
  subjectFilter: string = 'all'
): KanbanTask[] {
  const normalizedQuery = query.trim().toLowerCase();
  return tasks.filter((task) => {
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }
    if (subjectFilter !== 'all' && task.subjectId !== subjectFilter) {
      return false;
    }
    if (!normalizedQuery) return true;
    const haystack = `${task.title} ${task.note} ${task.subjectCode || ''}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function findTaskColumnInBoard(
  board: NotebookBoard,
  taskId: string
): KanbanColumnId | null {
  for (const colId of KANBAN_COLUMN_IDS) {
    if (board.columns[colId].some((t) => t.id === taskId)) {
      return colId;
    }
  }
  return null;
}

export function addTaskToBoard(
  data: NotebookData,
  boardId: string,
  columnId: KanbanColumnId,
  task: KanbanTask
): NotebookData {
  if (!task.title.trim()) return data;
  const cleanTask: KanbanTask = {
    ...task,
    title: task.title.trim(),
    note: task.note.trim(),
  };
  return {
    ...data,
    boards: data.boards.map((board) =>
      board.id === boardId
        ? {
            ...board,
            columns: {
              ...board.columns,
              [columnId]: [cleanTask, ...board.columns[columnId]],
            },
          }
        : board
    ),
  };
}

export function updateTaskInBoard(
  data: NotebookData,
  boardId: string,
  taskId: string,
  patch: Partial<KanbanTask>,
  targetColumnId?: KanbanColumnId
): NotebookData {
  let updated = {
    ...data,
    boards: data.boards.map((board) => {
      if (board.id !== boardId) return board;
      const nextCols: Record<KanbanColumnId, KanbanTask[]> = {
        todo: board.columns.todo.map((t) =>
          t.id === taskId ? { ...t, ...patch, title: (patch.title ?? t.title).trim() || t.title } : t
        ),
        doing: board.columns.doing.map((t) =>
          t.id === taskId ? { ...t, ...patch, title: (patch.title ?? t.title).trim() || t.title } : t
        ),
        done: board.columns.done.map((t) =>
          t.id === taskId ? { ...t, ...patch, title: (patch.title ?? t.title).trim() || t.title } : t
        ),
      };
      return { ...board, columns: nextCols };
    }),
  };

  if (targetColumnId) {
    const targetBoard = updated.boards.find((b) => b.id === boardId);
    if (targetBoard) {
      const currentCol = findTaskColumnInBoard(targetBoard, taskId);
      if (currentCol && currentCol !== targetColumnId) {
        updated = moveTaskInBoard(updated, boardId, taskId, targetColumnId, 0);
      }
    }
  }

  return updated;
}

export function deleteTaskFromBoard(
  data: NotebookData,
  boardId: string,
  taskId: string
): { data: NotebookData; removedTask: KanbanTask | null; removedFromCol: KanbanColumnId | null } {
  let removedTask: KanbanTask | null = null;
  let removedFromCol: KanbanColumnId | null = null;

  const nextBoards = data.boards.map((board) => {
    if (board.id !== boardId) return board;
    const nextCols: Record<KanbanColumnId, KanbanTask[]> = {
      todo: [],
      doing: [],
      done: [],
    };
    for (const colId of KANBAN_COLUMN_IDS) {
      nextCols[colId] = board.columns[colId].filter((task) => {
        if (task.id === taskId) {
          removedTask = task;
          removedFromCol = colId;
          return false;
        }
        return true;
      });
    }
    return { ...board, columns: nextCols };
  });

  return {
    data: { ...data, boards: nextBoards },
    removedTask,
    removedFromCol,
  };
}

export function moveTaskInBoard(
  data: NotebookData,
  boardId: string,
  taskId: string,
  targetCol: KanbanColumnId,
  targetIndex?: number
): NotebookData {
  return {
    ...data,
    boards: data.boards.map((board) => {
      if (board.id !== boardId) return board;
      let movingTask: KanbanTask | null = null;
      const strippedCols: Record<KanbanColumnId, KanbanTask[]> = {
        todo: [...board.columns.todo],
        doing: [...board.columns.doing],
        done: [...board.columns.done],
      };

      for (const colId of KANBAN_COLUMN_IDS) {
        const idx = strippedCols[colId].findIndex((t) => t.id === taskId);
        if (idx >= 0) {
          const [found] = strippedCols[colId].splice(idx, 1);
          movingTask = found;
          break;
        }
      }

      if (!movingTask) return board;

      const destList = strippedCols[targetCol];
      const clampedIndex =
        typeof targetIndex === 'number'
          ? Math.max(0, Math.min(destList.length, targetIndex))
          : destList.length;
      destList.splice(clampedIndex, 0, movingTask);

      return {
        ...board,
        columns: strippedCols,
      };
    }),
  };
}

export function clearColumnInBoard(
  data: NotebookData,
  boardId: string,
  columnId: KanbanColumnId
): { data: NotebookData; clearedTasks: KanbanTask[] } {
  let clearedTasks: KanbanTask[] = [];
  const nextBoards = data.boards.map((board) => {
    if (board.id !== boardId) return board;
    clearedTasks = [...board.columns[columnId]];
    return {
      ...board,
      columns: {
        ...board.columns,
        [columnId]: [],
      },
    };
  });
  return {
    data: { ...data, boards: nextBoards },
    clearedTasks,
  };
}

export function addNotebookPage(
  data: NotebookData,
  name: string = 'New page'
): { data: NotebookData; newBoardId: string } {
  const newBoard = createNotebookBoard(name);
  return {
    newBoardId: newBoard.id,
    data: {
      boards: [...data.boards, newBoard],
      activeId: newBoard.id,
    },
  };
}

export function renameNotebookPage(
  data: NotebookData,
  boardId: string,
  newName: string
): NotebookData {
  const trimmed = newName.trim();
  if (!trimmed) return data;
  return {
    ...data,
    boards: data.boards.map((b) => (b.id === boardId ? { ...b, name: trimmed } : b)),
  };
}

export function tearOutNotebookPage(data: NotebookData, boardId: string): NotebookData {
  if (data.boards.length <= 1) return data;
  const remaining = data.boards.filter((b) => b.id !== boardId);
  if (remaining.length === 0) return data;
  const nextActiveId =
    data.activeId === boardId || !remaining.some((b) => b.id === data.activeId)
      ? remaining[0].id
      : data.activeId;
  return {
    boards: remaining,
    activeId: nextActiveId,
  };
}

export function syncAssignmentsToNotebookBoard(
  data: NotebookData,
  boardId: string,
  assignments: Assignment[]
): { data: NotebookData; addedCount: number } {
  const board = data.boards.find((b) => b.id === boardId);
  if (!board) return { data, addedCount: 0 };

  const existingTasks = [
    ...board.columns.todo,
    ...board.columns.doing,
    ...board.columns.done,
  ];
  const existingAssignmentIds = new Set(
    existingTasks.map((t) => t.sourceAssignmentId).filter(Boolean)
  );
  const existingTitles = new Set(existingTasks.map((t) => t.title.trim().toLowerCase()));

  const newTodo: KanbanTask[] = [];
  const newDoing: KanbanTask[] = [];
  const newDone: KanbanTask[] = [];

  for (const asg of assignments) {
    if (existingAssignmentIds.has(asg.id)) continue;
    if (existingTitles.has(asg.title.trim().toLowerCase())) continue;

    const mappedPriority: KanbanPriority =
      asg.priority === 'urgent' || asg.priority === 'high'
        ? 'high'
        : asg.priority === 'medium'
        ? 'med'
        : 'low';

    const noteParts: string[] = [];
    if (asg.type) noteParts.push(asg.type);
    if (asg.description) noteParts.push(asg.description);

    const card = createKanbanTask(asg.title, mappedPriority, noteParts.join(' — '), {
      due: asg.dueDate,
      subjectId: asg.subjectId,
      subjectCode: asg.subjectCode,
      sourceAssignmentId: asg.id,
    });

    if (asg.status === 'completed' || asg.status === 'submitted') {
      newDone.push(card);
    } else if (asg.status === 'in_progress') {
      newDoing.push(card);
    } else {
      newTodo.push(card);
    }
  }

  const addedCount = newTodo.length + newDoing.length + newDone.length;
  if (addedCount === 0) return { data, addedCount: 0 };

  return {
    addedCount,
    data: {
      ...data,
      boards: data.boards.map((b) =>
        b.id === boardId
          ? {
              ...b,
              columns: {
                todo: [...newTodo, ...b.columns.todo],
                doing: [...newDoing, ...b.columns.doing],
                done: [...newDone, ...b.columns.done],
              },
            }
          : b
      ),
    },
  };
}

export interface NotebookSummaryStats {
  totalBoards: number;
  activeBoardName: string;
  todoCount: number;
  doingCount: number;
  doneCount: number;
  totalOpenCount: number;
  totalDoneCount: number;
  overdueCount: number;
}

export function computeNotebookSummary(
  data: NotebookData,
  todayISO: string
): NotebookSummaryStats {
  const active = getActiveBoard(data);
  let totalOpenCount = 0;
  let totalDoneCount = 0;
  let overdueCount = 0;

  for (const board of data.boards) {
    totalOpenCount += board.columns.todo.length + board.columns.doing.length;
    totalDoneCount += board.columns.done.length;
    for (const t of board.columns.todo) {
      if (isTaskOverdue(t, 'todo', todayISO)) overdueCount++;
    }
    for (const t of board.columns.doing) {
      if (isTaskOverdue(t, 'doing', todayISO)) overdueCount++;
    }
  }

  return {
    totalBoards: data.boards.length,
    activeBoardName: active?.name || 'Study',
    todoCount: active?.columns.todo.length || 0,
    doingCount: active?.columns.doing.length || 0,
    doneCount: active?.columns.done.length || 0,
    totalOpenCount,
    totalDoneCount,
    overdueCount,
  };
}

function sanitizeImportedTask(raw: unknown): KanbanTask | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  if (!title) return null;
  const rawPri = obj.priority;
  const priority: KanbanPriority =
    rawPri === 'high' || rawPri === 'med' || rawPri === 'low' ? rawPri : 'med';

  return {
    id: typeof obj.id === 'string' && obj.id ? obj.id : createNotebookId('note'),
    title,
    note: typeof obj.note === 'string' ? obj.note : '',
    priority,
    due: typeof obj.due === 'string' ? obj.due : '',
    subjectId: typeof obj.subjectId === 'string' ? obj.subjectId : undefined,
    subjectCode: typeof obj.subjectCode === 'string' ? obj.subjectCode : undefined,
    sourceAssignmentId:
      typeof obj.sourceAssignmentId === 'string' ? obj.sourceAssignmentId : undefined,
    createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString(),
  };
}

function sanitizeImportedBoard(raw: unknown): NotebookBoard | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : 'Untitled';
  const cols = (obj.columns && typeof obj.columns === 'object' ? obj.columns : {}) as Record<
    string,
    unknown
  >;

  const parseList = (list: unknown): KanbanTask[] =>
    Array.isArray(list)
      ? list.map(sanitizeImportedTask).filter((t): t is KanbanTask => Boolean(t))
      : [];

  return {
    id: typeof obj.id === 'string' && obj.id ? obj.id : createNotebookId('page'),
    name,
    columns: {
      todo: parseList(cols.todo),
      doing: parseList(cols.doing),
      done: parseList(cols.done),
    },
  };
}

/**
 * Parses either a full NotebookWorkspaceState export OR a raw `nb-data` export
 * from https://notebookanban.netlify.app/ (`{ boards: [...], activeId: "..." }`).
 */
export function parseExternalNotebookJson(rawJson: string): Partial<NotebookWorkspaceState> | null {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') return null;

    const candidateData = parsed.data && Array.isArray(parsed.data.boards) ? parsed.data : parsed;
    if (!Array.isArray(candidateData.boards) || candidateData.boards.length === 0) {
      return null;
    }

    const boards = candidateData.boards
      .map(sanitizeImportedBoard)
      .filter((b: NotebookBoard | null): b is NotebookBoard => Boolean(b));
    if (boards.length === 0) return null;

    const activeId =
      typeof candidateData.activeId === 'string' &&
      boards.some((b: NotebookBoard) => b.id === candidateData.activeId)
        ? candidateData.activeId
        : boards[0].id;

    const result: Partial<NotebookWorkspaceState> = {
      data: { boards, activeId },
    };

    if (parsed.theme === 'light' || parsed.theme === 'dark') {
      result.theme = parsed.theme;
    }

    if (parsed.cfg && typeof parsed.cfg === 'object') {
      const def = createDefaultNotebookConfig();
      result.cfg = {
        ...def,
        ...parsed.cfg,
        cols: { ...def.cols, ...(parsed.cfg.cols || {}) },
        c: {
          light: { ...(parsed.cfg.c?.light || {}) },
          dark: { ...(parsed.cfg.c?.dark || {}) },
        },
      };
    }

    if (typeof parsed.scribbleDataUrl === 'string' || parsed.scribbleDataUrl === null) {
      result.scribbleDataUrl = parsed.scribbleDataUrl;
    }
    if (typeof parsed.photoDataUrl === 'string' || parsed.photoDataUrl === null) {
      result.photoDataUrl = parsed.photoDataUrl;
    }

    return result;
  } catch {
    return null;
  }
}

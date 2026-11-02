import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addNotebookPage,
  addTaskToBoard,
  clearColumnInBoard,
  computeNotebookSummary,
  computeNoteTilt,
  createDefaultNotebookConfig,
  createDefaultNotebookData,
  createKanbanTask,
  cycleKanbanPriority,
  deleteTaskFromBoard,
  filterBoardColumnTasks,
  getReadableNoteInk,
  isTaskOverdue,
  moveTaskInBoard,
  parseExternalNotebookJson,
  renameNotebookPage,
  resolveNotebookPalette,
  syncAssignmentsToNotebookBoard,
  tearOutNotebookPage,
  updateTaskInBoard,
} from './notebookKanban';
import { Assignment } from '../types/oggytrack';

describe('notebookKanban pure logic', () => {
  it('creates default Study, Project, and Personal notebook pages matching notebookanban', () => {
    const data = createDefaultNotebookData();
    assert.equal(data.boards.length, 3);
    assert.deepEqual(
      data.boards.map((b) => b.name),
      ['Study', 'Project', 'Personal']
    );
    assert.equal(data.activeId, data.boards[0].id);
    assert.equal(data.boards[0].columns.todo.length, 2);
    assert.equal(data.boards[0].columns.todo[0].title, 'Revise DSA notes');
  });

  it('cycles sticky note priorities High -> Medium -> Low -> High', () => {
    assert.equal(cycleKanbanPriority('high'), 'med');
    assert.equal(cycleKanbanPriority('med'), 'low');
    assert.equal(cycleKanbanPriority('low'), 'high');
  });

  it('adds, updates, moves across columns, and deletes sticky notes cleanly', () => {
    let data = createDefaultNotebookData();
    const boardId = data.activeId;
    const task = createKanbanTask('Implement B-Tree index', 'high', 'Test split/merge', {
      id: 'task_btree',
      due: '2026-11-10',
      subjectId: 'sub_db',
      subjectCode: 'CS310',
    });

    data = addTaskToBoard(data, boardId, 'todo', task);
    assert.equal(data.boards[0].columns.todo[0].id, 'task_btree');

    data = updateTaskInBoard(
      data,
      boardId,
      'task_btree',
      { note: 'Completed split; testing merge' },
      'doing'
    );
    assert.equal(
      data.boards[0].columns.todo.some((t) => t.id === 'task_btree'),
      false
    );
    assert.equal(data.boards[0].columns.doing[0].id, 'task_btree');
    assert.equal(data.boards[0].columns.doing[0].note, 'Completed split; testing merge');

    data = moveTaskInBoard(data, boardId, 'task_btree', 'done', 0);
    assert.equal(data.boards[0].columns.doing.length, 0);
    assert.equal(data.boards[0].columns.done[0].id, 'task_btree');

    const delRes = deleteTaskFromBoard(data, boardId, 'task_btree');
    assert.equal(delRes.removedFromCol, 'done');
    assert.equal(delRes.removedTask?.title, 'Implement B-Tree index');
    assert.equal(delRes.data.boards[0].columns.done.length, 0);
  });

  it('detects overdue tasks only for open columns (not Done)', () => {
    const task = createKanbanTask('Submit lab sheet', 'high', '', { due: '2026-10-20' });
    assert.equal(isTaskOverdue(task, 'todo', '2026-10-31'), true);
    assert.equal(isTaskOverdue(task, 'doing', '2026-10-31'), true);
    assert.equal(isTaskOverdue(task, 'done', '2026-10-31'), false);
    assert.equal(isTaskOverdue(task, 'todo', '2026-10-15'), false);
  });

  it('filters column tasks by search query, priority, and course subjectId', () => {
    const tasks = [
      createKanbanTask('Revise graph algorithms', 'high', 'Dijkstra & Bellman-Ford', {
        subjectId: 'sub_algo',
        subjectCode: 'CS301',
      }),
      createKanbanTask('Kernel memory paging', 'med', 'Page table walk', {
        subjectId: 'sub_os',
        subjectCode: 'CS304',
      }),
      createKanbanTask('Clean desk', 'low', 'Organize notebooks'),
    ];

    assert.equal(filterBoardColumnTasks(tasks, 'dijkstra', 'all', 'all').length, 1);
    assert.equal(filterBoardColumnTasks(tasks, 'cs304', 'all', 'all').length, 1);
    assert.equal(filterBoardColumnTasks(tasks, '', 'high', 'all').length, 1);
    assert.equal(filterBoardColumnTasks(tasks, '', 'all', 'sub_os').length, 1);
  });

  it('adds, renames, and safely tears out notebook pages without deleting the last page', () => {
    let data = createDefaultNotebookData();
    const added = addNotebookPage(data, 'Exams Prep');
    data = added.data;
    assert.equal(data.boards.length, 4);
    assert.equal(data.activeId, added.newBoardId);

    data = renameNotebookPage(data, added.newBoardId, 'Finals Sprint');
    assert.equal(
      data.boards.find((b) => b.id === added.newBoardId)?.name,
      'Finals Sprint'
    );

    // Tear out until 1 page remains
    while (data.boards.length > 1) {
      data = tearOutNotebookPage(data, data.activeId);
    }
    assert.equal(data.boards.length, 1);
    // Attempting to tear out the final remaining page must be a safe no-op
    const afterLast = tearOutNotebookPage(data, data.boards[0].id);
    assert.equal(afterLast.boards.length, 1);
  });

  it('syncs oggytrack assignments onto a board without creating duplicates', () => {
    const data = createDefaultNotebookData();
    const boardId = data.activeId;
    const sampleAssignments: Assignment[] = [
      {
        id: 'asg_1',
        userId: 'usr_1',
        subjectId: 'sub_algo',
        subjectCode: 'CS301',
        subjectName: 'Algorithms',
        title: 'Dynamic Programming Problem Set',
        description: 'Solve 5 knapsack variants',
        dueDate: '2026-11-05',
        dueTime: '23:59',
        priority: 'urgent',
        status: 'not_started',
        type: 'Homework',
        completionPercent: 0,
        createdAt: '2026-10-30T00:00:00Z',
      },
      {
        id: 'asg_2',
        userId: 'usr_1',
        subjectId: 'sub_os',
        subjectCode: 'CS304',
        subjectName: 'Operating Systems',
        title: 'POSIX Threads Lab',
        dueDate: '2026-11-02',
        dueTime: '18:00',
        priority: 'medium',
        status: 'in_progress',
        type: 'Lab Report',
        completionPercent: 50,
        createdAt: '2026-10-30T00:00:00Z',
      },
    ];

    const firstSync = syncAssignmentsToNotebookBoard(data, boardId, sampleAssignments);
    assert.equal(firstSync.addedCount, 2);
    assert.equal(firstSync.data.boards[0].columns.todo[0].title, 'Dynamic Programming Problem Set');
    assert.equal(firstSync.data.boards[0].columns.todo[0].priority, 'high');
    assert.equal(firstSync.data.boards[0].columns.doing[0].title, 'POSIX Threads Lab');

    // Re-syncing identical assignments adds 0 duplicates
    const secondSync = syncAssignmentsToNotebookBoard(
      firstSync.data,
      boardId,
      sampleAssignments
    );
    assert.equal(secondSync.addedCount, 0);
  });

  it('parses standalone notebookanban nb-data JSON as well as full workspace exports', () => {
    const rawNbData = JSON.stringify({
      boards: [
        {
          id: 'b_custom',
          name: 'Hackathon',
          columns: {
            todo: [{ id: 't1', title: 'Build API', note: 'Express routes', priority: 'high', due: '2026-11-01' }],
            doing: [],
            done: [{ id: 't2', title: 'Setup repo', note: '', priority: 'low', due: '' }],
          },
        },
      ],
      activeId: 'b_custom',
    });

    const parsed = parseExternalNotebookJson(rawNbData);
    assert.ok(parsed?.data);
    assert.equal(parsed?.data?.boards[0].name, 'Hackathon');
    assert.equal(parsed?.data?.boards[0].columns.todo[0].title, 'Build API');
    assert.equal(parsed?.data?.boards[0].columns.done[0].title, 'Setup repo');

    const summary = computeNotebookSummary(parsed!.data!, '2026-11-05');
    assert.equal(summary.totalOpenCount, 1);
    assert.equal(summary.totalDoneCount, 1);
    assert.equal(summary.overdueCount, 1);

    const cleared = clearColumnInBoard(parsed!.data!, 'b_custom', 'done');
    assert.equal(cleared.clearedTasks.length, 1);
    assert.equal(cleared.data.boards[0].columns.done.length, 0);
  });

  it('computes readable sticky note ink and deterministic tilt angles', () => {
    assert.equal(getReadableNoteInk('#fff1a6'), '#1d2040');
    assert.equal(getReadableNoteInk('#2b4a3d'), '#f2efe4');
    const cfg = createDefaultNotebookConfig();
    const darkPalette = resolveNotebookPalette('dark', cfg);
    assert.equal(darkPalette.medInk, '#f2efe4');
    assert.equal(computeNoteTilt('note_abc', 0), 0);
  });
});

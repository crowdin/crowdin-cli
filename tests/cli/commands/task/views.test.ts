import { describe, expect, test } from 'bun:test';
import type { TasksModel } from '@crowdin/crowdin-api-client';
import { taskVerboseView, taskView } from '@/cli/commands/task/views.ts';

describe('task views', () => {
  const createTask = (overrides: Partial<TasksModel.Task> = {}): TasksModel.Task =>
    ({ id: 11, title: 'First task', targetLanguageId: 'fr', ...overrides }) as TasksModel.Task;

  test('renders id, language and title', () => {
    expect(taskView.text(createTask())).toBe('#11 fr First task');
    expect(taskView.plain?.(createTask())).toBe('11 First task');
  });

  test('renders status, words and deadline when verbose', () => {
    const task = createTask({ status: 'todo' as TasksModel.Status, wordsCount: 42, deadline: '2026-09-01' });

    expect(taskVerboseView.text(task)).toBe('#11 fr First task todo 42 2026-09-01');
  });

  test('renders NoDueDate for a task without a deadline', () => {
    const task = createTask({ status: 'todo' as TasksModel.Status, wordsCount: 42 });

    expect(taskVerboseView.text(task)).toBe('#11 fr First task todo 42 NoDueDate');
  });

  test('ignores verbose in plain, as Java TaskListAction does', () => {
    const task = createTask({ status: 'todo' as TasksModel.Status, wordsCount: 42 });

    expect(taskVerboseView.plain?.(task)).toBe('11 First task');
  });
});

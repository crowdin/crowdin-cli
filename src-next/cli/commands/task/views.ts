import type { TaskRecord } from '@/cli/services/TaskService.ts';
import { colors } from '@/cli/utils/colors.ts';
import type { View } from '@/cli/utils/output.ts';

// Java message.task.list / message.task.list.verbose. Plain ignores the verbose flag,
// as Java's TaskListAction does, and 'NoDueDate' stays display-only.
export const taskView: View<TaskRecord> = {
  text: (task) => `${colors.yellow(`#${task.id}`)} ${colors.green(task.targetLanguageId ?? '')} ${task.title}`,
  plain: (task) => `${task.id} ${task.title}`,
  keys: ['id', 'targetLanguageId', 'title'],
};

export const taskVerboseView: View<TaskRecord> = {
  text: (task) =>
    `${colors.yellow(`#${task.id}`)} ${colors.green(task.targetLanguageId ?? '')} ${task.title} ${colors.red(
      task.status ?? '',
    )} ${colors.red(String(task.wordsCount ?? ''))} ${colors.blue(task.deadline ? String(task.deadline) : 'NoDueDate')}`,
  plain: taskView.plain,
  keys: ['id', 'targetLanguageId', 'title', 'status', 'wordsCount', 'deadline'],
};

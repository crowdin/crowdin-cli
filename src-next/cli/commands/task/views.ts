import type { TaskRecord } from '@/cli/services/TaskService.ts';
import type { View } from '@/cli/utils/output.ts';

// Java message.task.list / message.task.list.verbose. Plain ignores the verbose flag,
// as Java's TaskListAction does, and 'NoDueDate' stays display-only.
export const taskView: View<TaskRecord> = {
  text: (task) => `#${task.id} ${task.targetLanguageId ?? ''} ${task.title}`,
  plain: (task) => `${task.id} ${task.title}`,
};

export const taskVerboseView: View<TaskRecord> = {
  text: (task) =>
    `#${task.id} ${task.targetLanguageId ?? ''} ${task.title} ${task.status ?? ''} ${task.wordsCount ?? ''} ${
      task.deadline ? String(task.deadline) : 'NoDueDate'
    }`,
  plain: taskView.plain,
};

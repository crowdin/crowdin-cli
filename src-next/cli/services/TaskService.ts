import type { Client, TasksModel } from '@crowdin/crowdin-api-client';
import { toCliError } from '@/cli/errors/CliError.ts';

export type TaskStatus = TasksModel.Status;
export type TaskRecord = TasksModel.Task;

export class TaskService {
  constructor(
    private client: Client,
    private projectId: number,
  ) {}

  async list(status?: TaskStatus): Promise<TaskRecord[]> {
    try {
      const response = await this.client.tasksApi.withFetchAll().listTasks(this.projectId, {
        ...(status ? { status } : {}),
      });

      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, 'Failed to list tasks');
    }
  }

  async add(request: TasksModel.CreateTaskRequest): Promise<TaskRecord> {
    try {
      const response = await this.client.tasksApi.addTask(this.projectId, request);

      return response.data;
    } catch (error) {
      throw toCliError(error, 'Task was not added');
    }
  }
}

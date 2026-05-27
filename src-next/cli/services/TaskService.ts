import type { Client } from '@crowdin/crowdin-api-client';
import CliError, { toCliError } from '@/cli/errors/CliError.ts';

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'closed';

export interface TaskRecord {
  id: number;
  title: string;
  targetLanguageId?: string;
  status?: string;
  wordsCount?: number;
  deadline?: string | Date | null;
  assignees?: Array<{ id?: number }>;
}

export class TaskService {
  constructor(
    private client: Client,
    private projectId: number,
  ) {}

  async list(status?: TaskStatus): Promise<TaskRecord[]> {
    try {
      const response = await (this.client as any).tasksApi.withFetchAll().listTasks(this.projectId, {
        ...(status ? { status } : {}),
      });

      return this.normalizeTaskListResponse(response?.data);
    } catch (error) {
      throw toCliError(error, 'Failed to list tasks');
    }
  }

  async add(request: Record<string, unknown>): Promise<TaskRecord> {
    try {
      const response = await (this.client as any).tasksApi.addTask(this.projectId, request);

      return response.data as TaskRecord;
    } catch (error) {
      throw toCliError(error, 'Task was not added');
    }
  }

  async resolveFileIds(paths: string[], branchName?: string): Promise<{ fileIds: number[]; missingPaths: string[] }> {
    let branchId: number | undefined;

    if (branchName && branchName !== 'none') {
      const branches = await this.client.sourceFilesApi.listProjectBranches(this.projectId, {
        name: branchName,
        limit: 500,
      });
      const branch = branches.data.find((entry) => entry.data.name === branchName);

      if (!branch) {
        throw new CliError(
          "The branch with the specified name doesn't exist in the project. Try specifying another branch name",
        );
      }

      branchId = branch.data.id;
    }

    const files = await this.client.sourceFilesApi.listProjectFiles(this.projectId, {
      ...(branchId ? { branchId } : {}),
      limit: 500,
    });
    const fileIdsByPath = new Map(files.data.map((file) => [this.normalizePath(file.data.path), file.data.id]));
    const fileIds: number[] = [];
    const missingPaths: string[] = [];

    for (const rawPath of paths) {
      const normalizedPath = this.normalizePath(rawPath);
      const fileId = fileIdsByPath.get(normalizedPath);

      if (fileId === undefined) {
        missingPaths.push(rawPath);
        continue;
      }

      fileIds.push(fileId);
    }

    return {
      fileIds: Array.from(new Set(fileIds)),
      missingPaths,
    };
  }

  private normalizeTaskListResponse(data: unknown): TaskRecord[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((entry) => {
      if (entry && typeof entry === 'object' && 'data' in entry) {
        return (entry as { data: TaskRecord }).data;
      }

      return entry as TaskRecord;
    });
  }

  private normalizePath(value: string): string {
    const normalizedValue = value.replaceAll('\\', '/').replace(/^\/+/, '');

    return `/${normalizedValue}`;
  }
}

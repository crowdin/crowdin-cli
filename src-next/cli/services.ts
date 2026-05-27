import { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import type { Config } from '@/lib/config.ts';
import { CommentService } from '@/cli/services/CommentService.ts';
import { ProjectService } from '@/cli/services/ProjectService.ts';
import { StorageService } from '@/cli/services/StorageService.ts';
import { StringService } from '@/cli/services/StringService.ts';
import { TaskService } from '@/cli/services/TaskService.ts';
import type { Output } from '@/cli/utils/output.ts';
import { buildUserAgent } from '@/cli/utils/userAgent.ts';

export type GetApiClient = (command: Command) => Promise<Client>;
export type GetConfig = (command: Command) => Promise<Config>;
export type GetOutput = (command: Command) => Output;
export type GetCommentService = (command: Command) => Promise<CommentService>;
export type GetProjectService = (command: Command) => Promise<ProjectService>;
export type GetStorageService = (command: Command) => Promise<StorageService>;
export type GetStringService = (command: Command) => Promise<StringService>;
export type GetTaskService = (command: Command) => Promise<TaskService>;

export function createGetApiClient(getConfig: GetConfig) {
  let cachedClient: Client | undefined;

  return async (command: Command): Promise<Client> => {
    if (cachedClient) {
      return cachedClient;
    }

    const config = await getConfig(command);
    cachedClient = new Client({ token: config.apiToken }, { userAgent: buildUserAgent() });

    return cachedClient;
  };
}

export function createGetProjectService(
  getApiClient: GetApiClient,
  getOutput: GetOutput,
  getConfig: GetConfig,
) {
  let cachedService: ProjectService | undefined;

  return async (command: Command): Promise<ProjectService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const output = getOutput(command);
    const config = await getConfig(command);
    cachedService = new ProjectService(apiClient, output, config.projectId);

    return cachedService;
  };
}

export function createGetCommentService(getApiClient: GetApiClient, getConfig: GetConfig) {
  let cachedService: CommentService | undefined;

  return async (command: Command): Promise<CommentService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const config = await getConfig(command);
    cachedService = new CommentService(apiClient, config.projectId);

    return cachedService;
  };
}

export function createGetStorageService(getApiClient: GetApiClient) {
  let cachedService: StorageService | undefined;

  return async (command: Command): Promise<StorageService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    cachedService = new StorageService(apiClient);

    return cachedService;
  };
}

export function createGetStringService(getApiClient: GetApiClient, getConfig: GetConfig) {
  let cachedService: StringService | undefined;

  return async (command: Command): Promise<StringService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const config = await getConfig(command);
    cachedService = new StringService(apiClient, config.projectId);

    return cachedService;
  };
}

export function createGetTaskService(getApiClient: GetApiClient, getConfig: GetConfig) {
  let cachedService: TaskService | undefined;

  return async (command: Command): Promise<TaskService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const config = await getConfig(command);
    cachedService = new TaskService(apiClient, config.projectId);

    return cachedService;
  };
}

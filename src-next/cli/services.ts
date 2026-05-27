import { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import type { Config } from '@/lib/config.ts';
import { ProjectService } from '@/cli/services/ProjectService.ts';
import { StorageService } from '@/cli/services/StorageService.ts';
import type { Output } from '@/cli/utils/output.ts';
import { buildUserAgent } from '@/cli/utils/userAgent.ts';

export type GetApiClient = (command: Command) => Promise<Client>;
export type GetConfig = (command: Command) => Promise<Config>;
export type GetOutput = (command: Command) => Output;
export type GetProjectService = (command: Command) => Promise<ProjectService>;
export type GetStorageService = (command: Command) => Promise<StorageService>;

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

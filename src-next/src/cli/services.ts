import type { Command } from 'commander';
import Client from '../lib/api/client.ts';
import type { Config } from '../lib/config.ts';
import { ProjectService } from './services/ProjectService.ts';
import { StorageService } from './services/StorageService.ts';
import type { Output } from './utils/output.ts';

export function createGetApiClient(getConfig: (command: Command) => Promise<Config>) {
  let cachedClient: Client | undefined;

  return async (command: Command): Promise<Client> => {
    if (cachedClient) {
      return cachedClient;
    }

    const config = await getConfig(command);
    cachedClient = new Client({ token: config.apiToken });

    return cachedClient;
  };
}

export function createGetProjectService(
  getApiClient: (command: Command) => Promise<Client>,
  getOutput: (command: Command) => Output,
  getConfig: (command: Command) => Promise<Config>,
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

export function createGetStorageService(
  getApiClient: (command: Command) => Promise<Client>,
) {
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

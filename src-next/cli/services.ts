import { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import ValidationError from '@/cli/errors/ValidationError.ts';
import { AppService } from '@/cli/services/AppService.ts';
import { BranchService } from '@/cli/services/BranchService.ts';
import { BundleService } from '@/cli/services/BundleService.ts';
import { CommentService } from '@/cli/services/CommentService.ts';
import { DirectoryService } from '@/cli/services/DirectoryService.ts';
import { DistributionService } from '@/cli/services/DistributionService.ts';
import { FileService } from '@/cli/services/FileService.ts';
import { GlossaryService } from '@/cli/services/GlossaryService.ts';
import { LabelService } from '@/cli/services/LabelService.ts';
import { LanguageService } from '@/cli/services/LanguageService.ts';
import { ProgressService } from '@/cli/services/ProgressService.ts';
import { ProjectService } from '@/cli/services/ProjectService.ts';
import { ScreenshotService } from '@/cli/services/ScreenshotService.ts';
import { StorageService } from '@/cli/services/StorageService.ts';
import { StringService } from '@/cli/services/StringService.ts';
import { TaskService } from '@/cli/services/TaskService.ts';
import { TmService } from '@/cli/services/TmService.ts';
import { TranslationService } from '@/cli/services/TranslationService.ts';
import type { Output } from '@/cli/utils/output.ts';
import { proxyUrlFromEnv } from '@/cli/utils/proxy.ts';
import { buildUserAgent } from '@/cli/utils/userAgent.ts';
import type { Config, ProjectConfig } from '@/lib/config.ts';
import { buildCredentials } from '@/lib/organization/credentials.ts';

export type GetApiClient = (command: Command) => Promise<Client>;
export type GetConfig = (command: Command) => Promise<Config>;
export type GetProjectConfig = (command: Command) => Promise<ProjectConfig>;
export type GetOutput = (command: Command) => Output;
export type GetBranchService = (command: Command) => Promise<BranchService>;
export type GetCommentService = (command: Command) => Promise<CommentService>;
export type GetDirectoryService = (command: Command) => Promise<DirectoryService>;
export type GetDistributionService = (command: Command) => Promise<DistributionService>;
export type GetFileService = (command: Command) => Promise<FileService>;
export type GetLabelService = (command: Command) => Promise<LabelService>;
export type GetProgressService = (command: Command) => Promise<ProgressService>;
export type GetProjectService = (command: Command) => Promise<ProjectService>;
export type GetStorageService = (command: Command) => Promise<StorageService>;
export type GetStringService = (command: Command) => Promise<StringService>;
export type GetTaskService = (command: Command) => Promise<TaskService>;
export type GetBundleService = (command: Command) => Promise<BundleService>;
export type GetAppService = (command: Command) => Promise<AppService>;
export type GetScreenshotService = (command: Command) => Promise<ScreenshotService>;
export type GetTranslationService = (command: Command) => Promise<TranslationService>;
export type GetLanguageService = (command: Command) => Promise<LanguageService>;
export type GetTmService = (command: Command) => Promise<TmService>;
export type GetGlossaryService = (command: Command) => Promise<GlossaryService>;

export function createGetApiClient(getConfig: GetConfig) {
  let cachedClient: Client | undefined;

  return async (command: Command): Promise<Client> => {
    if (cachedClient) {
      return cachedClient;
    }

    const config = await getConfig(command);

    if (!config.apiToken) {
      throw new ValidationError('API token is missing. Set it via --token, an identity file, or configuration.');
    }

    // Proxy parity with the Java CLI: HTTP_PROXY_HOST/PORT/USER/PASSWORD env vars.
    // Bun's fetch honors HTTPS_PROXY/HTTP_PROXY (incl. credentials in the URL), so we
    // translate the custom vars into the standard ones and force the fetch HTTP client.
    const proxy = proxyUrlFromEnv();

    if (proxy) {
      process.env.HTTPS_PROXY ??= proxy;
      process.env.HTTP_PROXY ??= proxy;
    }

    // biome-ignore format: manual formatting looks better
    cachedClient = new Client(
      buildCredentials(config.apiToken, config.baseUrl),
      {
        userAgent: buildUserAgent(),
        ...(proxy ? { httpClientType: 'fetch' as const } : {}),
      },
    );

    return cachedClient;
  };
}

export function createGetProjectService(
  getApiClient: GetApiClient,
  getOutput: GetOutput,
  getProjectConfig: GetProjectConfig,
) {
  let cachedService: ProjectService | undefined;

  return async (command: Command): Promise<ProjectService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const output = getOutput(command);
    const config = await getProjectConfig(command);
    cachedService = new ProjectService(apiClient, output, config.projectId);

    return cachedService;
  };
}

export function createGetCommentService(getApiClient: GetApiClient, getProjectConfig: GetProjectConfig) {
  let cachedService: CommentService | undefined;

  return async (command: Command): Promise<CommentService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const config = await getProjectConfig(command);
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

export function createGetStringService(getApiClient: GetApiClient, getProjectConfig: GetProjectConfig) {
  let cachedService: StringService | undefined;

  return async (command: Command): Promise<StringService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const config = await getProjectConfig(command);
    cachedService = new StringService(apiClient, config.projectId);

    return cachedService;
  };
}

export function createGetTaskService(getApiClient: GetApiClient, getProjectConfig: GetProjectConfig) {
  let cachedService: TaskService | undefined;

  return async (command: Command): Promise<TaskService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const config = await getProjectConfig(command);
    cachedService = new TaskService(apiClient, config.projectId);

    return cachedService;
  };
}

export function createGetBundleService(getApiClient: GetApiClient, getProjectConfig: GetProjectConfig) {
  let cachedService: BundleService | undefined;

  return async (command: Command): Promise<BundleService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const config = await getProjectConfig(command);
    cachedService = new BundleService(apiClient, config.projectId);

    return cachedService;
  };
}

export function createGetAppService(getApiClient: GetApiClient) {
  let cachedService: AppService | undefined;

  return async (command: Command): Promise<AppService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);

    cachedService = new AppService(apiClient);

    return cachedService;
  };
}

export function createGetScreenshotService(getApiClient: GetApiClient, getProjectConfig: GetProjectConfig) {
  let cachedService: ScreenshotService | undefined;

  return async (command: Command): Promise<ScreenshotService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const config = await getProjectConfig(command);
    cachedService = new ScreenshotService(apiClient, config.projectId);

    return cachedService;
  };
}

export function createGetDistributionService(getApiClient: GetApiClient, getProjectConfig: GetProjectConfig) {
  let cachedService: DistributionService | undefined;

  return async (command: Command): Promise<DistributionService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const config = await getProjectConfig(command);
    cachedService = new DistributionService(apiClient, config.projectId);

    return cachedService;
  };
}

export function createGetBranchService(getApiClient: GetApiClient, getProjectConfig: GetProjectConfig) {
  let cachedService: BranchService | undefined;

  return async (command: Command): Promise<BranchService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const config = await getProjectConfig(command);
    cachedService = new BranchService(apiClient, config.projectId);

    return cachedService;
  };
}

export function createGetDirectoryService(getApiClient: GetApiClient, getProjectConfig: GetProjectConfig) {
  let cachedService: DirectoryService | undefined;

  return async (command: Command): Promise<DirectoryService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const config = await getProjectConfig(command);
    cachedService = new DirectoryService(apiClient, config.projectId);

    return cachedService;
  };
}

export function createGetFileService(
  getApiClient: GetApiClient,
  getOutput: GetOutput,
  getProjectConfig: GetProjectConfig,
) {
  let cachedService: FileService | undefined;

  return async (command: Command): Promise<FileService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const output = getOutput(command);
    const config = await getProjectConfig(command);
    cachedService = new FileService(apiClient, output, config.projectId);

    return cachedService;
  };
}

export function createGetLabelService(getApiClient: GetApiClient, getProjectConfig: GetProjectConfig) {
  let cachedService: LabelService | undefined;

  return async (command: Command): Promise<LabelService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const config = await getProjectConfig(command);
    cachedService = new LabelService(apiClient, config.projectId);

    return cachedService;
  };
}

export function createGetProgressService(
  getApiClient: GetApiClient,
  getOutput: GetOutput,
  getProjectConfig: GetProjectConfig,
) {
  let cachedService: ProgressService | undefined;

  return async (command: Command): Promise<ProgressService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const output = getOutput(command);
    const config = await getProjectConfig(command);
    cachedService = new ProgressService(apiClient, output, config.projectId);

    return cachedService;
  };
}

export function createGetLanguageService(getApiClient: GetApiClient) {
  let cachedService: LanguageService | undefined;

  return async (command: Command): Promise<LanguageService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    cachedService = new LanguageService(apiClient);

    return cachedService;
  };
}

export function createGetTmService(getApiClient: GetApiClient, getOutput: GetOutput) {
  let cachedService: TmService | undefined;

  return async (command: Command): Promise<TmService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const output = getOutput(command);
    cachedService = new TmService(apiClient, output);

    return cachedService;
  };
}

export function createGetGlossaryService(getApiClient: GetApiClient, getOutput: GetOutput) {
  let cachedService: GlossaryService | undefined;

  return async (command: Command): Promise<GlossaryService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const output = getOutput(command);
    cachedService = new GlossaryService(apiClient, output);

    return cachedService;
  };
}

export function createGetTranslationService(
  getApiClient: GetApiClient,
  getOutput: GetOutput,
  getProjectConfig: GetProjectConfig,
) {
  let cachedService: TranslationService | undefined;

  return async (command: Command): Promise<TranslationService> => {
    if (cachedService) {
      return cachedService;
    }

    const apiClient = await getApiClient(command);
    const output = getOutput(command);
    const config = await getProjectConfig(command);
    cachedService = new TranslationService(apiClient, output, config.projectId);

    return cachedService;
  };
}

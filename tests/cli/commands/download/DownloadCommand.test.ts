import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import DownloadCommand from '@/cli/commands/download/DownloadCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { BranchService } from '@/cli/services/BranchService.ts';
import { FileService } from '@/cli/services/FileService.ts';
import { ProjectService } from '@/cli/services/ProjectService.ts';
import { TranslationService } from '@/cli/services/TranslationService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';
import type { Config } from '@/lib/config.ts';

const config: Config = {
  projectId: 123,
  apiToken: 'a'.repeat(80),
  basePath: '.',
  baseUrl: 'https://api.crowdin.com',
  preserveHierarchy: true,
  files: [
    {
      source: '/resources/en/*.json',
      translation: '/resources/%locale%/%original_file_name%',
    },
  ],
};

describe('DownloadCommand', () => {
  let tempDir: string;
  let commandContext: Command & { args?: string[] };
  let apiClient: Client;
  let output: Output;
  let projectService: ProjectService;
  let branchService: BranchService;
  let fileService: FileService;
  let translationService: TranslationService;
  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    format: 'json',
  };

  type DownloadTestOptions = GlobalOptions & {
    branch?: string;
    language?: string[];
    excludeLanguage?: string[];
    pseudo?: boolean;
    skipUntranslatedStrings?: boolean;
    skipUntranslatedFiles?: boolean;
    exportOnlyApproved?: boolean;
    keepArchive?: boolean;
    all?: boolean;
    dryRun?: boolean;
    tree?: boolean;
    ignoreMatch?: boolean;
    reviewed?: boolean;
  };

  const createCommandContext = (options: DownloadTestOptions, args: string[] = []) => {
    return {
      optsWithGlobals: () => options,
      args,
    } as unknown as Command & { args?: string[] };
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-download-command-'));

    apiClient = new Client({ token: config.apiToken });
    output = createOutput(globalOptions);
    projectService = new ProjectService(apiClient, output, config.projectId);
    branchService = new BranchService(apiClient, config.projectId);
    fileService = new FileService(apiClient, output, config.projectId);
    translationService = new TranslationService(apiClient, output, config.projectId);

    commandContext = createCommandContext(globalOptions);

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(async () => {
    mock.restore();
    await rm(tempDir, { recursive: true, force: true });
  });

  const createDownloadCommand = () => {
    return new DownloadCommand(
      async (command: Command) => ({
        ...config,
        basePath: tempDir,
      }),
      () => output,
      async () => projectService,
      async () => branchService,
      async () => fileService,
      async () => translationService,
    );
  };

  describe('translations', () => {
    test('downloads translations and extracts archive', async () => {
      const downloadCommand = createDownloadCommand();
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          targetLanguages: [{ id: 'fr' }, { id: 'de' }],
        },
      } as never);
      spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(apiClient.translationsApi, 'checkBuildStatus').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(translationService, 'getTranslationDownloadUrl').mockResolvedValue('https://example.test/translations.zip');
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('fake-zip-content'));

      mock.module('adm-zip', () => {
        return {
          default: class {
            constructor() {}
            extractAllTo() {}
          },
        };
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {});
      expect(translationService.getTranslationDownloadUrl).toHaveBeenCalledWith(buildId);
    });

    test('fails when language and exclude-language are both specified', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          targetLanguages: [{ id: 'fr' }, { id: 'de' }],
        },
      } as never);

      commandContext = createCommandContext({
        ...globalOptions,
        language: ['fr'],
        excludeLanguage: ['de'],
      });

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        new CliError("Options '--language' and '--exclude-language' can't be used together"),
      );
    });

    test('fails when language does not exist in project', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          targetLanguages: [{ id: 'fr' }],
        },
      } as never);

      commandContext = createCommandContext({
        ...globalOptions,
        language: ['es'],
      });

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        new CliError('Language es does not exist in project'),
      );
    });

    test('excludes specified languages', async () => {
      const downloadCommand = createDownloadCommand();
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          targetLanguages: [{ id: 'fr' }, { id: 'de' }, { id: 'es' }],
        },
      } as never);
      spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(apiClient.translationsApi, 'checkBuildStatus').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(translationService, 'getTranslationDownloadUrl').mockResolvedValue('https://example.test/translations.zip');
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('fake-zip-content'));

      mock.module('adm-zip', () => {
        return {
          default: class {
            constructor() {}
            extractAllTo() {}
          },
        };
      });

      commandContext = createCommandContext({
        ...globalOptions,
        excludeLanguage: ['de'],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {
        targetLanguageIds: ['fr', 'es'],
      });
    });

    test('builds pseudo translations', async () => {
      const downloadCommand = createDownloadCommand();
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          targetLanguages: [{ id: 'fr' }, { id: 'de' }],
        },
      } as never);
      spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(apiClient.translationsApi, 'checkBuildStatus').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(translationService, 'getTranslationDownloadUrl').mockResolvedValue('https://example.test/translations.zip');
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('fake-zip-content'));

      mock.module('adm-zip', () => {
        return {
          default: class {
            constructor() {}
            extractAllTo() {}
          },
        };
      });

      commandContext = createCommandContext({
        ...globalOptions,
        pseudo: true,
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {
        pseudo: true,
        branchId: undefined,
      });
    });

    test('passes build options to API', async () => {
      const downloadCommand = createDownloadCommand();
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          targetLanguages: [{ id: 'fr' }, { id: 'de' }],
        },
      } as never);
      spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(apiClient.translationsApi, 'checkBuildStatus').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(translationService, 'getTranslationDownloadUrl').mockResolvedValue('https://example.test/translations.zip');
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('fake-zip-content'));

      mock.module('adm-zip', () => {
        return {
          default: class {
            constructor() {}
            extractAllTo() {}
          },
        };
      });

      commandContext = createCommandContext({
        ...globalOptions,
        language: ['fr'],
        skipUntranslatedStrings: true,
        skipUntranslatedFiles: true,
        exportOnlyApproved: true,
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {
        targetLanguageIds: ['fr'],
        skipUntranslatedStrings: true,
        skipUntranslatedFiles: true,
        exportApprovedOnly: true,
      });
    });

    test('handles dry-run mode', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          targetLanguages: [{ id: 'fr' }, { id: 'de' }],
        },
      } as never);
      const listFiles = spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/docs/readme.md' } }, { data: { id: 2, path: '/docs/changelog.md' } }],
      } as never);
      const buildProject = spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({} as never);

      commandContext = createCommandContext({
        ...globalOptions,
        dryRun: true,
      });

      await downloadCommand.translationsAction(commandContext);

      expect(listFiles).toHaveBeenCalledTimes(1);
      expect(buildProject).not.toHaveBeenCalled();
    });

    test('filters by branch', async () => {
      const downloadCommand = createDownloadCommand();
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          targetLanguages: [{ id: 'fr' }],
        },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({
        data: [{ data: { id: 55, name: 'develop' } }],
      } as never);
      spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(apiClient.translationsApi, 'checkBuildStatus').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(translationService, 'getTranslationDownloadUrl').mockResolvedValue('https://example.test/translations.zip');
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('fake-zip-content'));

      mock.module('adm-zip', () => {
        return {
          default: class {
            constructor() {}
            extractAllTo() {}
          },
        };
      });

      commandContext = createCommandContext({
        ...globalOptions,
        branch: 'develop',
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {
        branchId: 55,
      });
    });

    test('fails when branch not found', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          targetLanguages: [{ id: 'fr' }],
        },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({
        data: [],
      } as never);

      commandContext = createCommandContext({
        ...globalOptions,
        branch: 'nonexistent',
      });

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        new CliError('Branch nonexistent not found'),
      );
    });

    test('saves archive to basePath when keepArchive is true', async () => {
      const downloadCommand = createDownloadCommand();
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          targetLanguages: [{ id: 'fr' }],
        },
      } as never);
      spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(apiClient.translationsApi, 'checkBuildStatus').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(translationService, 'getTranslationDownloadUrl').mockResolvedValue('https://example.test/translations.zip');
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('zip-content'));
      mock.module('adm-zip', () => ({
        default: class {
          constructor() {}
          extractAllTo() {}
        },
      }));

      commandContext = createCommandContext({ ...globalOptions, keepArchive: true });

      await downloadCommand.translationsAction(commandContext);

      const savedArchive = Bun.file(join(tempDir, 'crowdin-translations.zip'));
      expect(await savedArchive.exists()).toBe(true);
    });

    test('throws when translations build fails', async () => {
      const downloadCommand = createDownloadCommand();
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          targetLanguages: [{ id: 'fr' }],
        },
      } as never);
      spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({
        data: { id: buildId, status: 'inProgress', progress: 0 },
      } as never);
      spyOn(apiClient.translationsApi, 'checkBuildStatus').mockResolvedValue({
        data: { id: buildId, status: 'failed', progress: 0 },
      } as never);

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        new CliError('Translations build failed'),
      );
    });
  });

  describe('sources', () => {
    test('downloads source files', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/docs/readme.md' } }],
      } as never);
      const getDownloadUrlSpy = spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue(
        'https://example.test/readme.md',
      );
      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response('source content'));

      await downloadCommand.sourcesAction(commandContext);

      expect(getDownloadUrlSpy).toHaveBeenCalledWith(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://example.test/readme.md');

      const writtenFile = await Bun.file(join(tempDir, 'docs', 'readme.md')).text();
      expect(writtenFile).toBe('source content');
    });

    test('handles dry-run mode for sources', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      const listFiles = spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/docs/readme.md' } }],
      } as never);
      const getDownloadUrl = spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue('https://example.test');

      commandContext = createCommandContext({
        ...globalOptions,
        dryRun: true,
      });

      await downloadCommand.sourcesAction(commandContext);

      expect(listFiles).toHaveBeenCalledTimes(1);
      expect(getDownloadUrl).not.toHaveBeenCalled();
    });

    test('filters sources by branch', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({
        data: [{ data: { id: 55, name: 'main' } }],
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [],
      } as never);

      commandContext = createCommandContext({
        ...globalOptions,
        branch: 'main',
      });

      await downloadCommand.sourcesAction(commandContext);

      expect(apiClient.sourceFilesApi.listProjectFiles).toHaveBeenCalledWith(123, {
        branchId: 55,
      });
    });

    test('fails when branch not found for sources', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({
        data: [],
      } as never);

      commandContext = createCommandContext({
        ...globalOptions,
        branch: 'nonexistent',
      });

      expect(downloadCommand.sourcesAction(commandContext)).rejects.toThrow(
        new CliError('Branch nonexistent not found'),
      );
    });

    test('downloads reviewed source files', async () => {
      const downloadCommand = createDownloadCommand();
      const buildId = 77;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/strings.xml' } }],
      } as never);
      const buildReviewedSpy = spyOn(fileService, 'buildReviewedSources').mockResolvedValue({
        data: { id: buildId },
      } as never);
      const downloadUrlSpy = spyOn(fileService, 'getReviewedSourcesDownloadUrl').mockResolvedValue(
        'https://example.test/reviewed.zip',
      );
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('zip-content'));
      mock.module('adm-zip', () => ({
        default: class {
          constructor() {}
          extractAllTo() {}
        },
      }));

      commandContext = createCommandContext({ ...globalOptions, reviewed: true });

      await downloadCommand.sourcesAction(commandContext);

      expect(buildReviewedSpy).toHaveBeenCalledWith(undefined);
      expect(downloadUrlSpy).toHaveBeenCalledWith(buildId);
    });

    test('throws when reviewed sources build fails', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [],
      } as never);
      spyOn(fileService, 'buildReviewedSources').mockRejectedValue(new CliError('Reviewed sources build failed'));

      commandContext = createCommandContext({ ...globalOptions, reviewed: true });

      expect(downloadCommand.sourcesAction(commandContext)).rejects.toThrow(
        new CliError('Reviewed sources build failed'),
      );
    });

    test('propagates API errors via toCliError for source download', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/strings.xml' } }],
      } as never);
      spyOn(fileService, 'getSourceFileDownloadUrl').mockRejectedValue(new Error('Network error'));

      expect(downloadCommand.sourcesAction(commandContext)).rejects.toThrow('Failed to download strings.xml');
    });
  });
});

import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import DownloadCommand from '@/cli/commands/download/DownloadCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { BranchService } from '@/cli/services/BranchService.ts';
import { FileService } from '@/cli/services/FileService.ts';
import { ProjectService } from '@/cli/services/ProjectService.ts';
import { TranslationService } from '@/cli/services/TranslationService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';
import type { Config, ProjectConfig } from '@/lib/config.ts';

const config: ProjectConfig = {
  projectId: 123,
  apiToken: 'a'.repeat(80),
  basePath: '.',
  baseUrl: 'https://api.crowdin.com',
  preserveHierarchy: true,
  ignoreHiddenFiles: true,
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
    output: 'json',
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
    dryrun?: boolean;
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

    apiClient = new Client({ token: config.apiToken ?? '' });
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

  const createDownloadCommand = (configOverrides: Partial<Config> = {}) => {
    return new DownloadCommand(
      async (command: Command) => ({
        ...config,
        basePath: tempDir,
        ...configOverrides,
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
          languageMapping: {},
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
            getEntries() {
              return [];
            }
          },
        };
      });

      await expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        "Couldn't find any file to download",
      );

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {});
      expect(translationService.getTranslationDownloadUrl).toHaveBeenCalledWith(buildId);
    });

    test('fails when language and exclude-language are both specified', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
          targetLanguages: [{ id: 'fr' }, { id: 'de' }],
        },
      } as never);

      commandContext = createCommandContext({
        ...globalOptions,
        language: ['fr'],
        excludeLanguage: ['de'],
      });

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        new CliError("The '--language' and '--exclude-language' options can't be used simultaneously"),
      );
    });

    test('fails when both skip-untranslated flags are passed', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
          targetLanguages: [{ id: 'fr' }],
        },
      } as never);

      commandContext = createCommandContext({
        ...globalOptions,
        skipUntranslatedStrings: true,
        skipUntranslatedFiles: true,
      });

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        new CliError('You cannot skip strings and files at the same time. Please use one of these parameters instead.'),
      );
    });

    test('fails when language does not exist in project', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
          targetLanguages: [{ id: 'fr' }],
        },
      } as never);

      commandContext = createCommandContext({
        ...globalOptions,
        language: ['es'],
      });

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        new CliError("Language 'es' doesn't exist in the project. Try specifying another language code"),
      );
    });

    test('excludes specified languages', async () => {
      const downloadCommand = createDownloadCommand();
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
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
            getEntries() {
              return [];
            }
          },
        };
      });

      commandContext = createCommandContext({
        ...globalOptions,
        excludeLanguage: ['de'],
      });

      await expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        "Couldn't find any file to download",
      );

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
          languageMapping: {},
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
            getEntries() {
              return [];
            }
          },
        };
      });

      commandContext = createCommandContext({
        ...globalOptions,
        pseudo: true,
      });

      await expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        "Couldn't find any file to download",
      );

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {
        pseudo: true,
        branchId: undefined,
      });
    });

    test('maps pseudo_localization config into the pseudo build request', async () => {
      const downloadCommand = createDownloadCommand({
        pseudoLocalization: {
          length_correction: 10,
          prefix: '[',
          suffix: ']',
          character_transformation: 'cyrillic',
        },
      });
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
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
            getEntries() {
              return [];
            }
          },
        };
      });

      commandContext = createCommandContext({
        ...globalOptions,
        pseudo: true,
      });

      await expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        "Couldn't find any file to download",
      );

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {
        pseudo: true,
        branchId: undefined,
        lengthTransformation: 10,
        prefix: '[',
        suffix: ']',
        charTransformation: 'cyrillic',
      });
    });

    test('builds for config export_languages when no language option is given', async () => {
      const downloadCommand = createDownloadCommand({ exportLanguages: ['fr', 'es'] });
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
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
            getEntries() {
              return [];
            }
          },
        };
      });

      await expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        "Couldn't find any file to download",
      );

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {
        targetLanguageIds: ['fr', 'es'],
      });
    });

    test('subtracts exclude-language from config export_languages', async () => {
      const downloadCommand = createDownloadCommand({ exportLanguages: ['fr', 'es', 'de'] });
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
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
            getEntries() {
              return [];
            }
          },
        };
      });

      commandContext = createCommandContext({
        ...globalOptions,
        excludeLanguage: ['de'],
      });

      await expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        "Couldn't find any file to download",
      );

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {
        targetLanguageIds: ['fr', 'es'],
      });
    });

    test('--language overrides config export_languages', async () => {
      const downloadCommand = createDownloadCommand({ exportLanguages: ['fr', 'es'] });
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
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
            getEntries() {
              return [];
            }
          },
        };
      });

      commandContext = createCommandContext({
        ...globalOptions,
        language: ['de'],
      });

      await expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        "Couldn't find any file to download",
      );

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {
        targetLanguageIds: ['de'],
      });
    });

    test('fails when config export_language does not exist in project', async () => {
      const downloadCommand = createDownloadCommand({ exportLanguages: ['xx'] });

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
          targetLanguages: [{ id: 'fr' }],
        },
      } as never);

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        new CliError("Language 'xx' doesn't exist in the project. Try specifying another language code"),
      );
    });

    test('accepts the in-context pseudo language as a valid project language', async () => {
      const downloadCommand = createDownloadCommand();
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
          targetLanguages: [{ id: 'fr' }],
          inContextPseudoLanguage: { id: 'qa-pseudo' },
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
            getEntries() {
              return [];
            }
          },
        };
      });

      commandContext = createCommandContext({
        ...globalOptions,
        language: ['qa-pseudo'],
      });

      // The in-context pseudo language is part of getProjectLanguages(true), so it validates and builds.
      await expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        "Couldn't find any file to download",
      );

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {
        targetLanguageIds: ['qa-pseudo'],
      });
    });

    test('passes build options to API', async () => {
      const downloadCommand = createDownloadCommand();
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
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
            getEntries() {
              return [];
            }
          },
        };
      });

      commandContext = createCommandContext({
        ...globalOptions,
        language: ['fr'],
        skipUntranslatedFiles: true,
        exportOnlyApproved: true,
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {
        targetLanguageIds: ['fr'],
        skipUntranslatedFiles: true,
        exportApprovedOnly: true,
      });
    });

    test('handles dry-run mode', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
          targetLanguages: [{ id: 'fr', locale: 'fr', twoLettersCode: 'fr', threeLettersCode: 'fre', name: 'French' }],
        },
      } as never);
      const buildProject = spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({} as never);
      // Dry-run now always loads the server file map to filter excluded target languages (Java parity).
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({ data: [] } as never);
      const logSpy = spyOn(output, 'log');
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');

      commandContext = createCommandContext({
        ...globalOptions,
        output: 'text',
        dryrun: true,
      });

      await downloadCommand.translationsAction(commandContext);

      // Dry-run lists resolved translation destination paths, not raw server source paths.
      expect(logSpy).toHaveBeenCalledWith('resources/fr/messages.json');
      expect(buildProject).not.toHaveBeenCalled();
    });

    test('dry-run skips target languages excluded server-side for a source file', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
          targetLanguages: [
            { id: 'fr', locale: 'fr', twoLettersCode: 'fr', threeLettersCode: 'fre', name: 'French' },
            { id: 'de', locale: 'de', twoLettersCode: 'de', threeLettersCode: 'ger', name: 'German' },
          ],
        },
      } as never);
      spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({} as never);
      // Server marks French as excluded for this file -> it must not appear in the listing.
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/resources/en/messages.json', excludedTargetLanguages: ['fr'] } }],
      } as never);
      const logSpy = spyOn(output, 'log');
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');

      commandContext = createCommandContext({
        ...globalOptions,
        output: 'text',
        dryrun: true,
      });

      await downloadCommand.translationsAction(commandContext);

      expect(logSpy).toHaveBeenCalledWith('resources/de/messages.json');
      expect(logSpy).not.toHaveBeenCalledWith('resources/fr/messages.json');
    });

    test('filters by branch', async () => {
      const downloadCommand = createDownloadCommand();
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
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
            getEntries() {
              return [];
            }
          },
        };
      });

      commandContext = createCommandContext({
        ...globalOptions,
        branch: 'develop',
      });

      await expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        "Couldn't find any file to download",
      );

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {
        branchId: 55,
      });
    });

    test('fails when branch not found', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
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
          languageMapping: {},
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
          getEntries() {
            return [];
          }
        },
      }));

      commandContext = createCommandContext({ ...globalOptions, keepArchive: true });

      await expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        "Couldn't find any file to download",
      );

      const savedArchive = Bun.file(join(tempDir, 'crowdin-translations.zip'));
      expect(await savedArchive.exists()).toBe(true);
    });

    test('warns and aborts when translations build fails', async () => {
      const downloadCommand = createDownloadCommand();
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
          targetLanguages: [{ id: 'fr' }],
        },
      } as never);
      spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({
        data: { id: buildId, status: 'inProgress', progress: 0 },
      } as never);
      spyOn(apiClient.translationsApi, 'checkBuildStatus').mockResolvedValue({
        data: { id: buildId, status: 'failed', progress: 0 },
      } as never);
      const warningSpy = spyOn(output, 'warning');

      // Build failure warns and aborts gracefully (Java ProjectBuildFailedException parity).
      await downloadCommand.translationsAction(commandContext);

      expect(warningSpy).toHaveBeenCalledWith("Didn't manage to build translations");
    });
  });

  describe('translations map-and-copy', () => {
    const buildId = 999;

    const language = (id: string, locale: string) =>
      ({
        id,
        name: id,
        locale,
        twoLettersCode: id,
        threeLettersCode: id,
        osxCode: '',
        osxLocale: '',
      }) as never;

    const createCommandFor = (customConfig: ProjectConfig) =>
      new DownloadCommand(
        async () => ({ ...customConfig, basePath: tempDir }),
        () => output,
        async () => projectService,
        async () => branchService,
        async () => fileService,
        async () => translationService,
      );

    const mockBuildAndDownload = (targetLanguages: unknown[]) => {
      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123, languageMapping: {}, targetLanguages },
      } as never);
      spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(apiClient.translationsApi, 'checkBuildStatus').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(translationService, 'getTranslationDownloadUrl').mockResolvedValue('https://example.test/translations.zip');
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('zip-content'));
    };

    const mockZipEntries = (entries: { entryName: string; content: string }[]) => {
      mock.module('adm-zip', () => ({
        default: class {
          constructor() {}
          getEntries() {
            return entries.map((entry) => ({
              entryName: entry.entryName,
              isDirectory: entry.entryName.endsWith('/'),
              getData: () => Buffer.from(entry.content),
            }));
          }
        },
      }));
    };

    test('maps archive entries to config translation paths', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      mockZipEntries([{ entryName: 'resources/fr-FR/messages.json', content: 'translated fr' }]);

      const downloadCommand = createCommandFor({
        ...config,
        files: [{ source: '/resources/en/*.json', translation: '/resources/%locale%/%original_file_name%' }],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(await Bun.file(join(tempDir, 'resources/fr-FR/messages.json')).text()).toBe('translated fr');
    });

    test('applies translation_replace to the local path but not the archive key', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      mockZipEntries([{ entryName: 'resources/fr-FR/messages.json', content: 'translated fr' }]);

      const downloadCommand = createCommandFor({
        ...config,
        files: [
          {
            source: '/resources/en/*.json',
            translation: '/resources/%locale%/%original_file_name%',
            translation_replace: { resources: 'i18n' },
          },
        ],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(await Bun.file(join(tempDir, 'i18n/fr-FR/messages.json')).text()).toBe('translated fr');
    });

    test('applies per-file languages_mapping to the local path but not the archive key', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      mockZipEntries([{ entryName: 'out/fr-FR/messages.json', content: 'translated fr' }]);

      const downloadCommand = createCommandFor({
        ...config,
        files: [
          {
            source: '/resources/en/*.json',
            translation: '/out/%locale%/%original_file_name%',
            languages_mapping: { locale: { fr: 'french' } },
          },
        ],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(await Bun.file(join(tempDir, 'out/french/messages.json')).text()).toBe('translated fr');
    });

    test('applies dest to the archive key', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      mockZipEntries([{ entryName: 'server/sub/messages.json', content: 'translated fr' }]);

      const downloadCommand = createCommandFor({
        ...config,
        files: [
          {
            source: '/resources/en/*.json',
            translation: '/translated/%original_path%',
            dest: '/server/sub/%original_file_name%',
          },
        ],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(await Bun.file(join(tempDir, 'translated/resources/en/messages.json')).text()).toBe('translated fr');
    });

    test('skips archive entries with no config mapping', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({ data: [] } as never);
      mockZipEntries([
        { entryName: 'resources/fr-FR/messages.json', content: 'translated' },
        { entryName: 'unrelated/file.json', content: 'noise' },
      ]);

      const downloadCommand = createCommandFor({
        ...config,
        files: [{ source: '/resources/en/*.json', translation: '/resources/%locale%/%original_file_name%' }],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(await Bun.file(join(tempDir, 'unrelated/file.json')).exists()).toBe(false);
    });

    test('warns about omitted translations grouped by their project source', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [
          {
            data: {
              id: 2,
              path: '/resources/en/other.json',
              exportOptions: { exportPattern: '/resources/%locale%/%original_file_name%' },
            },
          },
        ],
      } as never);
      mockZipEntries([
        { entryName: 'resources/fr-FR/messages.json', content: 'translated' },
        { entryName: 'resources/fr-FR/other.json', content: 'omitted' },
      ]);
      const warningSpy = spyOn(output, 'warning');
      const logSpy = spyOn(output, 'log');

      const downloadCommand = createCommandFor({
        ...config,
        files: [{ source: '/resources/en/messages.json', translation: '/resources/%locale%/%original_file_name%' }],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(warningSpy).toHaveBeenCalledWith(expect.stringContaining("don't match the current project configuration"));
      expect(logSpy).toHaveBeenCalledWith('\t- resources/en/other.json (1)');
      expect(await Bun.file(join(tempDir, 'resources/fr-FR/other.json')).exists()).toBe(false);
    });

    test('lists omitted translations under each source when verbose', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [
          {
            data: {
              id: 2,
              path: '/resources/en/other.json',
              exportOptions: { exportPattern: '/resources/%locale%/%original_file_name%' },
            },
          },
        ],
      } as never);
      mockZipEntries([
        { entryName: 'resources/fr-FR/messages.json', content: 'translated' },
        { entryName: 'resources/fr-FR/other.json', content: 'omitted' },
      ]);
      const logSpy = spyOn(output, 'log');

      commandContext = createCommandContext({ ...globalOptions, verbose: true });

      const downloadCommand = createCommandFor({
        ...config,
        files: [{ source: '/resources/en/messages.json', translation: '/resources/%locale%/%original_file_name%' }],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(logSpy).toHaveBeenCalledWith('\t\t- resources/fr-FR/other.json');
    });

    test('warns about omitted translations with no project source', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({ data: [] } as never);
      mockZipEntries([
        { entryName: 'resources/fr-FR/messages.json', content: 'translated' },
        { entryName: 'unrelated/file.json', content: 'noise' },
      ]);
      const warningSpy = spyOn(output, 'warning');
      const logSpy = spyOn(output, 'log');

      const downloadCommand = createCommandFor({
        ...config,
        files: [{ source: '/resources/en/messages.json', translation: '/resources/%locale%/%original_file_name%' }],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(warningSpy).toHaveBeenCalledWith(expect.stringContaining('missing respective sources'));
      expect(logSpy).toHaveBeenCalledWith('\t- unrelated/file.json');
    });

    test('--ignore-match suppresses omitted-file reporting', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      const listFiles = spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({ data: [] } as never);
      mockZipEntries([
        { entryName: 'resources/fr-FR/messages.json', content: 'translated' },
        { entryName: 'unrelated/file.json', content: 'noise' },
      ]);
      const warningSpy = spyOn(output, 'warning');

      commandContext = createCommandContext({ ...globalOptions, ignoreMatch: true });

      const downloadCommand = createCommandFor({
        ...config,
        files: [{ source: '/resources/en/messages.json', translation: '/resources/%locale%/%original_file_name%' }],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(listFiles).not.toHaveBeenCalled();
      expect(warningSpy).not.toHaveBeenCalled();
    });

    test('--all downloads server source files absent locally', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [
          { data: { id: 1, path: '/resources/en/messages.json' } },
          { data: { id: 2, path: '/resources/en/other.json' } },
        ],
      } as never);
      mockZipEntries([{ entryName: 'resources/fr-FR/other.json', content: 'server-only' }]);

      commandContext = createCommandContext({ ...globalOptions, all: true });

      const downloadCommand = createCommandFor({
        ...config,
        files: [{ source: '/resources/en/*.json', translation: '/resources/%locale%/%original_file_name%' }],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(await Bun.file(join(tempDir, 'resources/fr-FR/other.json')).text()).toBe('server-only');
    });

    test('--all skips server source files matching an ignore pattern', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [
          { data: { id: 1, path: '/resources/en/messages.json' } },
          { data: { id: 2, path: '/resources/en/secret.json' } },
        ],
      } as never);
      mockZipEntries([
        { entryName: 'resources/fr-FR/messages.json', content: 'kept' },
        { entryName: 'resources/fr-FR/secret.json', content: 'ignored' },
      ]);

      commandContext = createCommandContext({ ...globalOptions, all: true, ignoreMatch: true });

      const downloadCommand = createCommandFor({
        ...config,
        files: [
          {
            source: '/resources/en/*.json',
            translation: '/resources/%locale%/%original_file_name%',
            ignore: ['/resources/en/secret.json'],
          },
        ],
      });

      await downloadCommand.translationsAction(commandContext);

      // secret.json is server-only and matches the ignore pattern, so it is not mapped/written;
      // the local messages.json source is still downloaded.
      expect(await Bun.file(join(tempDir, 'resources/fr-FR/messages.json')).text()).toBe('kept');
      expect(await Bun.file(join(tempDir, 'resources/fr-FR/secret.json')).exists()).toBe(false);
    });

    test('pseudo maps all target languages, ignoring export_languages', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR'), language('de', 'de-DE')]);
      mockZipEntries([
        { entryName: 'resources/fr-FR/messages.json', content: 'fr' },
        { entryName: 'resources/de-DE/messages.json', content: 'de' },
      ]);

      commandContext = createCommandContext({ ...globalOptions, pseudo: true });

      const downloadCommand = createCommandFor({
        ...config,
        exportLanguages: ['fr'],
        files: [{ source: '/resources/en/*.json', translation: '/resources/%locale%/%original_file_name%' }],
      });

      await downloadCommand.translationsAction(commandContext);

      // export_languages would narrow to fr, but pseudo uses every target language.
      expect(await Bun.file(join(tempDir, 'resources/fr-FR/messages.json')).text()).toBe('fr');
      expect(await Bun.file(join(tempDir, 'resources/de-DE/messages.json')).text()).toBe('de');
    });

    test('--all warns when preserve_hierarchy is disabled', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({ data: [] } as never);
      mockZipEntries([{ entryName: 'resources/fr-FR/messages.json', content: 'translated' }]);
      const warningSpy = spyOn(output, 'warning');

      commandContext = createCommandContext({ ...globalOptions, all: true });

      const downloadCommand = createCommandFor({
        ...config,
        preserveHierarchy: false,
        files: [{ source: '/resources/en/*.json', translation: '/resources/%locale%/%original_file_name%' }],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(warningSpy).toHaveBeenCalledWith(
        expect.stringContaining("'preserve_hierarchy' parameter is set to 'false'"),
      );
    });

    test('issues one build per distinct export-option combo and maps each group from its archive', async () => {
      await Bun.write(join(tempDir, 'resources/en/a.json'), '{}');
      await Bun.write(join(tempDir, 'resources/en/b.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      mockZipEntries([
        { entryName: 'resources/fr-FR/a.json', content: 'a-fr' },
        { entryName: 'resources/fr-FR/b.json', content: 'b-fr' },
      ]);

      commandContext = createCommandContext({ ...globalOptions, ignoreMatch: true });

      const downloadCommand = createCommandFor({
        ...config,
        files: [
          {
            source: '/resources/en/a.json',
            translation: '/resources/%locale%/%original_file_name%',
            skip_untranslated_files: true,
          },
          {
            source: '/resources/en/b.json',
            translation: '/resources/%locale%/%original_file_name%',
            export_only_approved: true,
          },
        ],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledTimes(2);
      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, { skipUntranslatedFiles: true });
      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, { exportApprovedOnly: true });
      expect(await Bun.file(join(tempDir, 'resources/fr-FR/a.json')).text()).toBe('a-fr');
      expect(await Bun.file(join(tempDir, 'resources/fr-FR/b.json')).text()).toBe('b-fr');
    });

    test('shares a single build when all files have the same export combo', async () => {
      await Bun.write(join(tempDir, 'resources/en/a.json'), '{}');
      await Bun.write(join(tempDir, 'resources/en/b.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      mockZipEntries([{ entryName: 'resources/fr-FR/a.json', content: 'a-fr' }]);

      commandContext = createCommandContext({ ...globalOptions, ignoreMatch: true });

      const downloadCommand = createCommandFor({
        ...config,
        files: [
          {
            source: '/resources/en/a.json',
            translation: '/resources/%locale%/%original_file_name%',
            skip_untranslated_files: true,
          },
          {
            source: '/resources/en/b.json',
            translation: '/resources/%locale%/%original_file_name%',
            skip_untranslated_files: true,
          },
        ],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledTimes(1);
      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, { skipUntranslatedFiles: true });
    });

    test('maps export_only_approved to exportWithMinApprovalsCount on enterprise', async () => {
      spyOn(projectService, 'isEnterprise').mockReturnValue(true);
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      mockZipEntries([{ entryName: 'resources/fr-FR/messages.json', content: 'translated' }]);

      const downloadCommand = createCommandFor({
        ...config,
        files: [
          {
            source: '/resources/en/*.json',
            translation: '/resources/%locale%/%original_file_name%',
            export_only_approved: true,
          },
        ],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, { exportWithMinApprovalsCount: 1 });
    });

    test('sends export_strings_that_passed_workflow on enterprise', async () => {
      spyOn(projectService, 'isEnterprise').mockReturnValue(true);
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      mockZipEntries([{ entryName: 'resources/fr-FR/messages.json', content: 'translated' }]);

      const downloadCommand = createCommandFor({
        ...config,
        files: [
          {
            source: '/resources/en/*.json',
            translation: '/resources/%locale%/%original_file_name%',
            export_strings_that_passed_workflow: true,
          },
        ],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {
        exportStringsThatPassedWorkflow: true,
      });
    });

    test('warns and omits passed-workflow export on non-enterprise', async () => {
      spyOn(projectService, 'isEnterprise').mockReturnValue(false);
      const warningSpy = spyOn(output, 'warning');
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      mockZipEntries([{ entryName: 'resources/fr-FR/messages.json', content: 'translated' }]);

      const downloadCommand = createCommandFor({
        ...config,
        files: [
          {
            source: '/resources/en/*.json',
            translation: '/resources/%locale%/%original_file_name%',
            export_strings_that_passed_workflow: true,
          },
        ],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(warningSpy).toHaveBeenCalledWith(
        'Exporting strings that passed workflow is supported only for Crowdin Enterprise',
      );
      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {});
    });

    test('CLI flag overrides per-file config, forcing a single combo', async () => {
      await Bun.write(join(tempDir, 'resources/en/a.json'), '{}');
      await Bun.write(join(tempDir, 'resources/en/b.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      mockZipEntries([
        { entryName: 'resources/fr-FR/a.json', content: 'a-fr' },
        { entryName: 'resources/fr-FR/b.json', content: 'b-fr' },
      ]);

      // One file sets skip_untranslated_files, the other doesn't — normally two combos. The CLI
      // flag forces skip_untranslated_files=true on both, collapsing them into a single build.
      commandContext = createCommandContext({ ...globalOptions, ignoreMatch: true, skipUntranslatedFiles: true });

      const downloadCommand = createCommandFor({
        ...config,
        files: [
          { source: '/resources/en/a.json', translation: '/resources/%locale%/%original_file_name%' },
          {
            source: '/resources/en/b.json',
            translation: '/resources/%locale%/%original_file_name%',
            skip_untranslated_files: true,
          },
        ],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledTimes(1);
      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, { skipUntranslatedFiles: true });
    });
  });

  describe('translations validations', () => {
    test('rejects string-based projects', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          type: ProjectsGroupsModel.Type.STRINGS_BASED,
          languageMapping: {},
          targetLanguages: [{ id: 'fr' }],
        },
      } as never);
      const buildProject = spyOn(apiClient.translationsApi, 'buildProject');

      await expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        'File management is not available for string-based projects',
      );
      expect(buildProject).not.toHaveBeenCalled();
    });

    test('warns and returns when the user lacks manager access', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123, targetLanguages: [{ id: 'fr' }] },
      } as never);
      const buildProject = spyOn(apiClient.translationsApi, 'buildProject');
      const warningSpy = spyOn(output, 'warning');

      await downloadCommand.translationsAction(commandContext);

      expect(warningSpy).toHaveBeenCalledWith(expect.stringContaining('manager or developer role'));
      expect(buildProject).not.toHaveBeenCalled();
    });

    test('warns instead of erroring on no files when skip-untranslated-files is set', async () => {
      const downloadCommand = createDownloadCommand();
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123, languageMapping: {}, targetLanguages: [{ id: 'fr' }] },
      } as never);
      spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(apiClient.translationsApi, 'checkBuildStatus').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(translationService, 'getTranslationDownloadUrl').mockResolvedValue('https://example.test/translations.zip');
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('zip'));
      mock.module('adm-zip', () => ({
        default: class {
          constructor() {}
          getEntries() {
            return [];
          }
        },
      }));
      const warningSpy = spyOn(output, 'warning');

      commandContext = createCommandContext({ ...globalOptions, skipUntranslatedFiles: true });

      await downloadCommand.translationsAction(commandContext);

      expect(warningSpy).toHaveBeenCalledWith(expect.stringContaining("Couldn't find any file to download"));
    });
  });

  describe('sources', () => {
    test('rejects string-based projects', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123, type: ProjectsGroupsModel.Type.STRINGS_BASED },
      } as never);
      const listFiles = spyOn(apiClient.sourceFilesApi, 'listProjectFiles');

      await expect(downloadCommand.sourcesAction(commandContext)).rejects.toThrow(
        'File management is not available for string-based projects',
      );
      expect(listFiles).not.toHaveBeenCalled();
    });

    test('downloads source files', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/resources/en/messages.json' } }],
      } as never);
      const getDownloadUrlSpy = spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue(
        'https://example.test/messages.json',
      );
      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response('source content'));

      await downloadCommand.sourcesAction(commandContext);

      expect(getDownloadUrlSpy).toHaveBeenCalledWith(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://example.test/messages.json');

      const writtenFile = await Bun.file(join(tempDir, 'resources', 'en', 'messages.json')).text();
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
        dryrun: true,
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
        recursion: '1',
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
        data: { id: 123, sourceLanguageId: 'en' },
      } as never);
      spyOn(projectService, 'isEnterprise').mockReturnValue(true);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/resources/en/messages.json' } }],
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
          getEntries() {
            return [];
          }
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
        data: { id: 123, sourceLanguageId: 'en' },
      } as never);
      spyOn(projectService, 'isEnterprise').mockReturnValue(true);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/resources/en/messages.json' } }],
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
        data: [{ data: { id: 1, path: '/resources/en/strings.json' } }],
      } as never);
      spyOn(fileService, 'getSourceFileDownloadUrl').mockRejectedValue(new Error('Network error'));

      expect(downloadCommand.sourcesAction(commandContext)).rejects.toThrow(
        'Failed to download resources/en/strings.json',
      );
    });

    test('does not download project files that do not match a config pattern', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [
          { data: { id: 1, path: '/resources/en/messages.json' } },
          { data: { id: 2, path: '/unrelated/notes.txt' } },
        ],
      } as never);
      const getDownloadUrlSpy = spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue(
        'https://example.test/messages.json',
      );
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('source content'));

      await downloadCommand.sourcesAction(commandContext);

      expect(getDownloadUrlSpy).toHaveBeenCalledTimes(1);
      expect(getDownloadUrlSpy).toHaveBeenCalledWith(1);
      expect(await Bun.file(join(tempDir, 'unrelated', 'notes.txt')).exists()).toBe(false);
    });

    test('with manager access, filters out files whose export pattern does not match the translation', async () => {
      const downloadCommand = createDownloadCommand();

      // languageMapping marks manager access, enabling the export-pattern compatibility filter.
      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123, languageMapping: {} },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [
          {
            data: {
              id: 1,
              path: '/resources/en/messages.json',
              exportOptions: { exportPattern: '/%locale%/%original_file_name%' },
            },
          },
          {
            data: {
              id: 2,
              path: '/resources/en/strings.json',
              exportOptions: { exportPattern: '/somewhere-else/strings.json' },
            },
          },
        ],
      } as never);
      const getDownloadUrlSpy = spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue(
        'https://example.test/messages.json',
      );
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('source content'));

      await downloadCommand.sourcesAction(commandContext);

      // Only file 1's export pattern is a suffix of the config translation, so file 2 is skipped.
      expect(getDownloadUrlSpy).toHaveBeenCalledTimes(1);
      expect(getDownloadUrlSpy).toHaveBeenCalledWith(1);
    });

    test('skips source files matching an ignore pattern', async () => {
      const downloadCommand = new DownloadCommand(
        async () => ({
          ...config,
          basePath: tempDir,
          files: [
            {
              source: '/resources/en/*.json',
              translation: '/%locale%/%original_file_name%',
              ignore: ['/resources/en/secret.json'],
            },
          ],
        }),
        () => output,
        async () => projectService,
        async () => branchService,
        async () => fileService,
        async () => translationService,
      );

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [
          { data: { id: 1, path: '/resources/en/messages.json' } },
          { data: { id: 2, path: '/resources/en/secret.json' } },
        ],
      } as never);
      const getDownloadUrlSpy = spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue(
        'https://example.test/messages.json',
      );
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('source content'));

      await downloadCommand.sourcesAction(commandContext);

      expect(getDownloadUrlSpy).toHaveBeenCalledTimes(1);
      expect(getDownloadUrlSpy).toHaveBeenCalledWith(1);
    });

    test('applies dest directly when source has ** and dest has no wildcard', async () => {
      const downloadCommand = new DownloadCommand(
        async () => ({
          ...config,
          basePath: tempDir,
          files: [
            {
              source: '/resources/**/*.json',
              translation: '/%locale%/%original_file_name%',
              dest: '/uploaded/%original_file_name%',
            },
          ],
        }),
        () => output,
        async () => projectService,
        async () => branchService,
        async () => fileService,
        async () => translationService,
      );

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/uploaded/messages.json' } }],
      } as never);
      spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue('https://example.test/messages.json');
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('dest content'));

      await downloadCommand.sourcesAction(commandContext);

      // Branch (a): dest applied directly with placeholders resolved.
      expect(await Bun.file(join(tempDir, 'uploaded', 'messages.json')).text()).toBe('dest content');
    });

    test('derives dest from the source pattern via replaceUnaryAsterisk when source has no **', async () => {
      const downloadCommand = new DownloadCommand(
        async () => ({
          ...config,
          basePath: tempDir,
          files: [
            {
              source: '/resources/en/*.json',
              translation: '/%locale%/%original_file_name%',
              dest: '/uploaded/%original_file_name%',
            },
          ],
        }),
        () => output,
        async () => projectService,
        async () => branchService,
        async () => fileService,
        async () => translationService,
      );

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/uploaded/messages.json' } }],
      } as never);
      spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue('https://example.test/messages.json');
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('source content'));

      await downloadCommand.sourcesAction(commandContext);

      // Else branch: the filename segment is substituted into the source pattern, so the file lands
      // at its source-side location (mirrors Java's replaceUnaryAsterisk).
      expect(await Bun.file(join(tempDir, 'resources', 'en', 'messages.json')).text()).toBe('source content');
    });

    test('warns when a config pattern matches no project files', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/unrelated/notes.txt' } }],
      } as never);
      const getDownloadUrlSpy = spyOn(fileService, 'getSourceFileDownloadUrl');
      const warningSpy = spyOn(output, 'warning');

      await downloadCommand.sourcesAction(commandContext);

      expect(warningSpy).toHaveBeenCalledWith(expect.stringContaining('No sources found for'));
      expect(getDownloadUrlSpy).not.toHaveBeenCalled();
    });

    test('warns about preserve_hierarchy being disabled', async () => {
      const downloadCommand = new DownloadCommand(
        async () => ({ ...config, basePath: tempDir, preserveHierarchy: false }),
        () => output,
        async () => projectService,
        async () => branchService,
        async () => fileService,
        async () => translationService,
      );

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({ data: [] } as never);
      const warningSpy = spyOn(output, 'warning');

      await downloadCommand.sourcesAction(commandContext);

      expect(warningSpy).toHaveBeenCalledWith(
        expect.stringContaining("'preserve_hierarchy' parameter is set to 'false'"),
      );
    });

    test('--reviewed warns and returns for non-enterprise projects before loading the project', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(projectService, 'isEnterprise').mockReturnValue(false);
      // The enterprise guard runs before the project is fetched (Java ordering), so loadProject and
      // the build are never reached.
      const loadProjectSpy = spyOn(projectService, 'loadProject');
      const buildReviewedSpy = spyOn(fileService, 'buildReviewedSources');
      const warningSpy = spyOn(output, 'warning');

      commandContext = createCommandContext({ ...globalOptions, reviewed: true });

      await downloadCommand.sourcesAction(commandContext);

      expect(warningSpy).toHaveBeenCalledWith('Operation is available only for Crowdin Enterprise');
      expect(loadProjectSpy).not.toHaveBeenCalled();
      expect(buildReviewedSpy).not.toHaveBeenCalled();
    });

    test('--reviewed extracts matched files from the source-language-REV directory', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123, sourceLanguageId: 'en' },
      } as never);
      spyOn(projectService, 'isEnterprise').mockReturnValue(true);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/resources/en/messages.json' } }],
      } as never);
      spyOn(fileService, 'buildReviewedSources').mockResolvedValue({ data: { id: 77 } } as never);
      spyOn(fileService, 'getReviewedSourcesDownloadUrl').mockResolvedValue('https://example.test/reviewed.zip');
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('zip-content'));
      mock.module('adm-zip', () => ({
        default: class {
          constructor() {}
          getEntries() {
            return [
              {
                entryName: 'en-REV/resources/en/messages.json',
                isDirectory: false,
                getData: () => Buffer.from('reviewed content'),
              },
              {
                entryName: 'en-REV/unrelated/other.json',
                isDirectory: false,
                getData: () => Buffer.from('noise'),
              },
            ];
          }
        },
      }));

      commandContext = createCommandContext({ ...globalOptions, reviewed: true });

      await downloadCommand.sourcesAction(commandContext);

      expect(await Bun.file(join(tempDir, 'resources/en/messages.json')).text()).toBe('reviewed content');
      expect(await Bun.file(join(tempDir, 'unrelated/other.json')).exists()).toBe(false);
    });
  });
});

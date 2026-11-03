import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { Client } from '@crowdin/crowdin-api-client';
import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import DownloadCommand from '@/cli/commands/download/DownloadCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { BranchService } from '@/cli/services/BranchService.ts';
import type { FileService } from '@/cli/services/FileService.ts';
import type { ProjectService } from '@/cli/services/ProjectService.ts';
import type { TranslationService } from '@/cli/services/TranslationService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';
import type { Config, ProjectConfig } from '@/lib/config.ts';
import {
  config,
  createCommandContext,
  createDownloadServices,
  globalOptions,
  respondWithZip,
} from './downloadTestHelpers.ts';

describe('DownloadTranslationsCommand', () => {
  let tempDir: string;
  let commandContext: Command & { args?: string[] };
  let apiClient: Client;
  let output: Output;
  let projectService: ProjectService;
  let branchService: BranchService;
  let fileService: FileService;
  let translationService: TranslationService;

  beforeEach(async () => {
    ({ tempDir, apiClient, output, projectService, branchService, fileService, translationService } =
      await createDownloadServices());
    commandContext = createCommandContext(globalOptions);
  });

  afterEach(async () => {
    mock.restore();
    await rm(tempDir, { recursive: true, force: true });
  });

  const createDownloadCommand = (configOverrides: Partial<Config> = {}) => {
    return new DownloadCommand(
      async () => ({
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
      respondWithZip();

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow("Couldn't find any file to download");

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
      respondWithZip();

      commandContext = createCommandContext({
        ...globalOptions,
        excludeLanguage: ['de'],
      });

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow("Couldn't find any file to download");

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
      respondWithZip();

      commandContext = createCommandContext({
        ...globalOptions,
        pseudo: true,
      });

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow("Couldn't find any file to download");

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
      respondWithZip();

      commandContext = createCommandContext({
        ...globalOptions,
        pseudo: true,
      });

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow("Couldn't find any file to download");

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
      respondWithZip();

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow("Couldn't find any file to download");

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
      respondWithZip();

      commandContext = createCommandContext({
        ...globalOptions,
        excludeLanguage: ['de'],
      });

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow("Couldn't find any file to download");

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
      respondWithZip();

      commandContext = createCommandContext({
        ...globalOptions,
        language: ['de'],
      });

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow("Couldn't find any file to download");

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
      respondWithZip();

      commandContext = createCommandContext({
        ...globalOptions,
        language: ['qa-pseudo'],
      });

      // The in-context pseudo language is part of getProjectLanguages(true), so it validates and builds.
      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow("Couldn't find any file to download");

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
      respondWithZip();

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
      // Dry-run now always loads the server file map to filter excluded target languages.
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({ data: [] } as never);
      const listSpy = spyOn(output, 'list');
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');

      commandContext = createCommandContext({
        ...globalOptions,
        output: 'text',
        dryrun: true,
      });

      await downloadCommand.translationsAction(commandContext);

      // Dry-run lists resolved translation destination paths, not raw server source paths.
      expect(listSpy.mock.calls[0]?.[0]).toEqual(['resources/fr/messages.json']);
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
      const listSpy = spyOn(output, 'list');
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');

      commandContext = createCommandContext({
        ...globalOptions,
        output: 'text',
        dryrun: true,
      });

      await downloadCommand.translationsAction(commandContext);

      expect(listSpy.mock.calls[0]?.[0]).toEqual(['resources/de/messages.json']);
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
      respondWithZip();

      commandContext = createCommandContext({
        ...globalOptions,
        branch: 'develop',
      });

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow("Couldn't find any file to download");

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
        new CliError("Project doesn't contain the 'nonexistent' branch"),
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
      respondWithZip();

      commandContext = createCommandContext({ ...globalOptions, keepArchive: true });

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow("Couldn't find any file to download");

      const savedArchive = Bun.file(join(tempDir, 'crowdin-translations.zip'));
      expect(await savedArchive.exists()).toBe(true);
    });

    test('rejects when translations build fails', async () => {
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

      // A build failure (or any other build-step error, e.g. a transient 5xx) must propagate and
      // fail the process (#1102) instead of being swallowed into a warning with a 0 exit code.
      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow('Translations build failed');
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
      respondWithZip();
    };

    const mockZipEntries = (entries: { entryName: string; content: string }[]) => {
      respondWithZip(entries);
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
            // %original_path% is the source file's parent directory, so the file name is added here.
            translation: '/translated/%original_path%/%original_file_name%',
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
      // The list prints through log(), which only text renders.
      output = createOutput({ ...globalOptions, output: 'text' });
      commandContext = createCommandContext({ ...globalOptions, output: 'text' });
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

    test.each(['json', 'toon', 'plain'])('skips the omitted-file report with --output %s', async (format) => {
      output = createOutput({ ...globalOptions, output: format });
      commandContext = createCommandContext({ ...globalOptions, output: format });
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

      expect(warningSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
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
      output = createOutput({ ...globalOptions, output: 'text' });
      const logSpy = spyOn(output, 'log');

      commandContext = createCommandContext({ ...globalOptions, output: 'text', verbose: true });

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
      output = createOutput({ ...globalOptions, output: 'text' });
      commandContext = createCommandContext({ ...globalOptions, output: 'text' });
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

    test('reports only what every build omitted', async () => {
      await Bun.write(join(tempDir, 'resources/en/a.json'), '{}');
      await Bun.write(join(tempDir, 'resources/en/b.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: ['a', 'b', 'other'].map((name, index) => ({
          data: {
            id: index + 1,
            path: `/resources/en/${name}.json`,
            exportOptions: { exportPattern: '/resources/%locale%/%original_file_name%' },
          },
        })),
      } as never);
      // Each build maps only its own file group, so it omits the other group's file too.
      respondWithZip(
        [
          { entryName: 'resources/fr-FR/a.json', content: 'a' },
          { entryName: 'resources/fr-FR/b.json', content: 'b' },
          { entryName: 'resources/fr-FR/other.json', content: 'other' },
          { entryName: 'unrelated/both.json', content: 'both' },
          { entryName: 'unrelated/first.json', content: 'first' },
        ],
        [
          { entryName: 'resources/fr-FR/a.json', content: 'a' },
          { entryName: 'resources/fr-FR/b.json', content: 'b' },
          { entryName: 'resources/fr-FR/other.json', content: 'other' },
          { entryName: 'unrelated/both.json', content: 'both' },
          { entryName: 'unrelated/second.json', content: 'second' },
        ],
      );
      output = createOutput({ ...globalOptions, output: 'text' });
      commandContext = createCommandContext({ ...globalOptions, output: 'text' });
      const logSpy = spyOn(output, 'log');

      const downloadCommand = createCommandFor({
        ...config,
        files: [
          {
            source: '/resources/en/a.json',
            translation: '/resources/%locale%/%original_file_name%',
            skip_untranslated_files: false,
          },
          { source: '/resources/en/b.json', translation: '/resources/%locale%/%original_file_name%' },
        ],
      });

      await downloadCommand.translationsAction(commandContext);

      const logged = logSpy.mock.calls.map(([line]) => line);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledTimes(2);
      expect(logged.filter((line) => String(line).startsWith('\t- '))).toEqual([
        '\t- resources/en/other.json (1)',
        '\t- unrelated/both.json',
      ]);
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

    test('sends explicit false export options so project settings are overridden', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      mockZipEntries([{ entryName: 'resources/fr-FR/messages.json', content: 'translated' }]);

      const downloadCommand = createCommandFor({
        ...config,
        files: [
          {
            source: '/resources/en/*.json',
            translation: '/resources/%locale%/%original_file_name%',
            skip_untranslated_strings: false,
            skip_untranslated_files: false,
            export_only_approved: false,
          },
        ],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {
        skipUntranslatedStrings: false,
        skipUntranslatedFiles: false,
        exportApprovedOnly: false,
      });
    });

    test('omits export options that are not set in the config', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      mockZipEntries([{ entryName: 'resources/fr-FR/messages.json', content: 'translated' }]);

      const downloadCommand = createCommandFor({
        ...config,
        files: [{ source: '/resources/en/*.json', translation: '/resources/%locale%/%original_file_name%' }],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {});
    });

    test('keeps an explicit false and an unset option as separate builds', async () => {
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
            skip_untranslated_files: false,
          },
          {
            source: '/resources/en/b.json',
            translation: '/resources/%locale%/%original_file_name%',
          },
        ],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledTimes(2);
      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, { skipUntranslatedFiles: false });
      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {});
    });

    test('maps export_only_approved: false to zero required approvals on enterprise', async () => {
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
            export_only_approved: false,
          },
        ],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, { exportWithMinApprovalsCount: 0 });
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

    test('--no- CLI flags override per-file config set to true', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      mockZipEntries([{ entryName: 'resources/fr-FR/messages.json', content: 'translated' }]);

      commandContext = createCommandContext({
        ...globalOptions,
        skipUntranslatedStrings: false,
        skipUntranslatedFiles: false,
        exportOnlyApproved: false,
      });

      const downloadCommand = createCommandFor({
        ...config,
        files: [
          {
            source: '/resources/en/*.json',
            translation: '/resources/%locale%/%original_file_name%',
            skip_untranslated_strings: true,
            export_only_approved: true,
          },
        ],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {
        skipUntranslatedStrings: false,
        skipUntranslatedFiles: false,
        exportApprovedOnly: false,
      });
    });

    test('CLI flags override per-file config set to false', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      mockZipEntries([{ entryName: 'resources/fr-FR/messages.json', content: 'translated' }]);

      commandContext = createCommandContext({
        ...globalOptions,
        skipUntranslatedFiles: true,
        exportOnlyApproved: true,
      });

      const downloadCommand = createCommandFor({
        ...config,
        files: [
          {
            source: '/resources/en/*.json',
            translation: '/resources/%locale%/%original_file_name%',
            skip_untranslated_files: false,
            export_only_approved: false,
          },
        ],
      });

      await downloadCommand.translationsAction(commandContext);

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, {
        skipUntranslatedFiles: true,
        exportApprovedOnly: true,
      });
    });

    test('--no-export-only-approved sends zero required approvals on enterprise', async () => {
      spyOn(projectService, 'isEnterprise').mockReturnValue(true);
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);
      mockZipEntries([{ entryName: 'resources/fr-FR/messages.json', content: 'translated' }]);

      commandContext = createCommandContext({ ...globalOptions, exportOnlyApproved: false });

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

      expect(apiClient.translationsApi.buildProject).toHaveBeenCalledWith(123, { exportWithMinApprovalsCount: 0 });
    });

    test('rejects a CLI skip flag that conflicts with the opposite skip option in config', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      mockBuildAndDownload([language('fr', 'fr-FR')]);

      commandContext = createCommandContext({ ...globalOptions, skipUntranslatedStrings: true });

      const downloadCommand = createCommandFor({
        ...config,
        files: [
          {
            source: '/resources/en/*.json',
            translation: '/resources/%locale%/%original_file_name%',
            skip_untranslated_files: true,
          },
        ],
      });

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        'You cannot skip strings and files at the same time. Please use one of these parameters instead.',
      );
      expect(apiClient.translationsApi.buildProject).not.toHaveBeenCalled();
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

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow(
        'File management is not available for string-based projects',
      );
      expect(buildProject).not.toHaveBeenCalled();
    });

    test('fails with a forbidden exit code when the user lacks manager access', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123, targetLanguages: [{ id: 'fr' }] },
      } as never);
      const buildProject = spyOn(apiClient.translationsApi, 'buildProject');
      const errorSpy = spyOn(output, 'error');

      // globalOptions is json, so this takes the machine-format branch.
      expect(downloadCommand.translationsAction(commandContext)).rejects.toMatchObject({ exitCode: 103 });
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('manager or developer role'));
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
      respondWithZip();
      const warningSpy = spyOn(output, 'warning');

      commandContext = createCommandContext({ ...globalOptions, skipUntranslatedFiles: true });

      await downloadCommand.translationsAction(commandContext);

      expect(warningSpy).toHaveBeenCalledWith(expect.stringContaining("Couldn't find any file to download"));
    });

    test('errors on no files when --no-skip-untranslated-files overrides the project setting', async () => {
      const downloadCommand = createDownloadCommand();
      const buildId = 999;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123, languageMapping: {}, targetLanguages: [{ id: 'fr' }], skipUntranslatedFiles: true },
      } as never);
      spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(apiClient.translationsApi, 'checkBuildStatus').mockResolvedValue({
        data: { id: buildId, status: 'finished', progress: 100 },
      } as never);
      spyOn(translationService, 'getTranslationDownloadUrl').mockResolvedValue('https://example.test/translations.zip');
      respondWithZip();

      commandContext = createCommandContext({ ...globalOptions, skipUntranslatedFiles: false });

      expect(downloadCommand.translationsAction(commandContext)).rejects.toThrow("Couldn't find any file to download");
    });
  });

  describe('machine-format summary', () => {
    const summary = () => {
      const calls = (console.log as ReturnType<typeof mock>).mock.calls;
      return JSON.parse(String(calls.at(-1)?.[0]));
    };

    const downloadTranslationsOf = async (entries: { entryName: string; content: string }[], options = {}) => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
          targetLanguages: [{ id: 'fr', locale: 'fr', twoLettersCode: 'fr', threeLettersCode: 'fre', name: 'French' }],
        },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({ data: [] } as never);
      spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({
        data: { id: 1, status: 'finished', progress: 100 },
      } as never);
      spyOn(apiClient.translationsApi, 'checkBuildStatus').mockResolvedValue({
        data: { id: 1, status: 'finished', progress: 100 },
      } as never);
      spyOn(translationService, 'getTranslationDownloadUrl').mockResolvedValue('https://example.test/t.zip');
      respondWithZip(entries);

      await downloadCommand.translationsAction(
        createCommandContext({ ...globalOptions, ignoreMatch: true, ...options }),
      );
    };

    test('stays quiet in text, which already prints a line per file', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      const list = spyOn(output, 'list');

      await downloadTranslationsOf([{ entryName: 'resources/fr/messages.json', content: 'x' }], { output: 'text' });

      expect(list).not.toHaveBeenCalled();
    });

    test('drops the skips in plain, which cannot carry the action', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      const list = spyOn(output, 'list');

      await downloadTranslationsOf(
        [
          { entryName: 'resources/fr/messages.json', content: 'x' },
          { entryName: 'stray/unmapped.json', content: 'y' },
        ],
        { output: 'plain' },
      );

      expect(list.mock.calls.at(-1)?.[0]).toEqual([{ path: 'resources/fr/messages.json', action: 'downloaded' }]);
    });

    // 'Archive saved to …' goes through success(), which is text-only, so the kept archive joins
    // the summary instead — otherwise --keep-archive leaves no trace in a machine format.
    test('carries the kept archive in the summary', async () => {
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');
      const list = spyOn(output, 'list');

      await downloadTranslationsOf([{ entryName: 'resources/fr/messages.json', content: 'x' }], {
        output: 'plain',
        keepArchive: true,
      });

      expect(list.mock.calls.at(-1)?.[0]).toEqual([
        { path: 'resources/fr/messages.json', action: 'downloaded' },
        { path: 'crowdin-translations.zip', action: 'downloaded' },
      ]);
      expect(await Bun.file(join(tempDir, 'crowdin-translations.zip')).exists()).toBe(true);
    });

    // An archive entry with no config mapping was reported only as prose, so machine consumers
    // could not tell it had been left on the floor.
    test('records an unmapped archive entry as skipped', async () => {
      const downloadCommand = createDownloadCommand();

      // The archive-to-local mapping is built from local sources, so one has to exist on disk.
      await Bun.write(join(tempDir, 'resources/en/messages.json'), '{}');

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: {
          id: 123,
          languageMapping: {},
          targetLanguages: [{ id: 'fr', locale: 'fr', twoLettersCode: 'fr', threeLettersCode: 'fre', name: 'French' }],
        },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({ data: [] } as never);
      spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({
        data: { id: 1, status: 'finished', progress: 100 },
      } as never);
      spyOn(apiClient.translationsApi, 'checkBuildStatus').mockResolvedValue({
        data: { id: 1, status: 'finished', progress: 100 },
      } as never);
      spyOn(translationService, 'getTranslationDownloadUrl').mockResolvedValue('https://example.test/t.zip');
      respondWithZip([
        { entryName: 'resources/fr/messages.json', content: 'mapped' },
        { entryName: 'stray/unmapped.json', content: 'unmapped' },
      ]);

      await downloadCommand.translationsAction(createCommandContext({ ...globalOptions, ignoreMatch: true }));

      expect(summary()).toEqual([
        { path: 'resources/fr/messages.json', action: 'downloaded', reason: null },
        { path: 'stray/unmapped.json', action: 'skipped', reason: 'no matching configuration' },
      ]);
    });
  });
});

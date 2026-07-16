import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import AutoTranslateCommand from '@/cli/commands/auto-translate/AutoTranslateCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { BranchService } from '@/cli/services/BranchService.ts';
import { FileService } from '@/cli/services/FileService.ts';
import { LabelService } from '@/cli/services/LabelService.ts';
import { ProjectService } from '@/cli/services/ProjectService.ts';
import { TranslationService } from '@/cli/services/TranslationService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

type AutoTranslateTestOptions = GlobalOptions & {
  language?: string[];
  excludeLanguage?: string[];
  file?: string[];
  method?: string;
  engineId?: number;
  branch?: string;
  directory?: string;
  autoApproveOption?: string;
  duplicateTranslations?: boolean;
  skipApprovedTranslations?: boolean;
  scope?: string;
  priority?: string;
  translationModifiedBefore?: string;
  replaceTranslationsOption?: string;
  resetApprovalStatus?: boolean;
  translateWithPerfectMatchOnly?: boolean;
  label?: string[];
  excludeLabel?: string[];
  sourceLanguage?: string;
  aiPrompt?: number;
};

const globalOptions: GlobalOptions = {
  verbose: false,
  config: '',
  colors: false,
  progress: false,
  output: 'json',
};

const createCommandContext = (options: AutoTranslateTestOptions) => {
  return {
    optsWithGlobals: () => options,
    args: [],
  } as unknown as Command;
};

const finishedStatus = { identifier: '121', status: 'finished', progress: 100 };

const filesBasedProject = {
  data: {
    id: 123,
    type: ProjectsGroupsModel.Type.FILES_BASED,
    targetLanguages: [{ id: 'ua' }, { id: 'en' }, { id: 'fr' }],
  },
};

const stringsBasedProject = {
  data: {
    id: 123,
    type: ProjectsGroupsModel.Type.STRINGS_BASED,
    targetLanguages: [{ id: 'ua' }, { id: 'en' }],
  },
};

const projectFiles = {
  data: [
    { data: { id: 101, path: '/first.po', branchId: 81, directoryId: 61 } },
    { data: { id: 102, path: '/src/second.po', branchId: 81, directoryId: 61 } },
  ],
};

describe('AutoTranslateCommand', () => {
  let commandContext: Command;
  let apiClient: Client;
  let output: Output;
  let projectService: ProjectService;
  let branchService: BranchService;
  let fileService: FileService;
  let labelService: LabelService;
  let translationService: TranslationService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    output = createOutput(globalOptions);
    projectService = new ProjectService(apiClient, output, 123);
    branchService = new BranchService(apiClient, 123);
    fileService = new FileService(apiClient, output, 123);
    labelService = new LabelService(apiClient, 123);
    translationService = new TranslationService(apiClient, output, 123);

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
  });

  const createCommand = () => {
    return new AutoTranslateCommand(
      () => output,
      async () => projectService,
      async () => branchService,
      async () => fileService,
      async () => labelService,
      async () => translationService,
    );
  };

  test('auto-translates the specified file with labels on a files-based project', async () => {
    const command = createCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      method: 'tm',
      language: ['ua'],
      file: ['first.po'],
      branch: 'main',
      label: ['label_1'],
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
    spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue(projectFiles as never);
    spyOn(labelService, 'list').mockResolvedValue([{ id: 91, title: 'label_1' }] as never);
    const preTranslate = spyOn(translationService, 'preTranslate').mockResolvedValue(finishedStatus as never);

    await command.defaultAction(commandContext);

    expect(branchService.getBranch).toHaveBeenCalledWith('main');
    expect(preTranslate).toHaveBeenCalledTimes(1);
    const request = preTranslate.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(request.languageIds).toEqual(['ua']);
    expect(request.fileIds).toEqual([101]);
    expect(request.labelIds).toEqual([91]);
    expect(request.method).toBe('tm');
  });

  test('auto-translates all files in a directory', async () => {
    const command = createCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      method: 'tm',
      language: ['ua'],
      directory: 'src',
      branch: 'main',
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
    spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue(projectFiles as never);
    const preTranslate = spyOn(translationService, 'preTranslate').mockResolvedValue(finishedStatus as never);

    await command.defaultAction(commandContext);

    const request = preTranslate.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(request.fileIds).toEqual([102]);
    expect(request.languageIds).toEqual(['ua']);
  });

  test('auto-translates all project files when no file or directory is given', async () => {
    const command = createCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      method: 'tm',
      language: ['ua'],
      branch: 'main',
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
    spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue(projectFiles as never);
    const preTranslate = spyOn(translationService, 'preTranslate').mockResolvedValue(finishedStatus as never);

    await command.defaultAction(commandContext);

    const request = preTranslate.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(request.fileIds).toEqual([101, 102]);
  });

  test('auto-translates a strings-based project using branch ids', async () => {
    const command = createCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      method: 'tm',
      language: ['ua'],
      branch: 'main',
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(stringsBasedProject as never);
    spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
    const preTranslate = spyOn(translationService, 'preTranslate').mockResolvedValue(finishedStatus as never);

    await command.defaultAction(commandContext);

    const request = preTranslate.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(request.branchIds).toEqual([81]);
    expect(request.languageIds).toEqual(['ua']);
    expect(request.fileIds).toBeUndefined();
  });

  test('filters languages by MT supported languages when method is mt and language is all', async () => {
    const command = createCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      method: 'mt',
      engineId: 1,
      branch: 'main',
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
    spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue(projectFiles as never);
    spyOn(translationService, 'getMtSupportedLanguageIds').mockResolvedValue(['ua', 'fr']);
    const preTranslate = spyOn(translationService, 'preTranslate').mockResolvedValue(finishedStatus as never);

    await command.defaultAction(commandContext);

    const request = preTranslate.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(request.languageIds).toEqual(['ua', 'fr']);
    expect(request.engineId).toBe(1);
  });

  test('excludes the specified languages', async () => {
    const command = createCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      method: 'tm',
      excludeLanguage: ['en'],
      branch: 'main',
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
    spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue(projectFiles as never);
    const preTranslate = spyOn(translationService, 'preTranslate').mockResolvedValue(finishedStatus as never);

    await command.defaultAction(commandContext);

    const request = preTranslate.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(request.languageIds).toEqual(['ua', 'fr']);
  });

  test('warns and ignores auto-approve-option when method is mt', async () => {
    const command = createCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      method: 'mt',
      engineId: 1,
      autoApproveOption: 'all',
      branch: 'main',
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
    spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue(projectFiles as never);
    spyOn(translationService, 'getMtSupportedLanguageIds').mockResolvedValue(['ua', 'en', 'fr']);
    const warning = spyOn(output, 'warning').mockImplementation(() => {});
    const preTranslate = spyOn(translationService, 'preTranslate').mockResolvedValue(finishedStatus as never);

    await command.defaultAction(commandContext);

    expect(warning).toHaveBeenCalledWith("'--auto-approve-option' is used only for the TM Auto-Translation method");
    const request = preTranslate.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(request.autoApproveOption).toBeUndefined();
  });

  test('maps auto-approve-option to the API value for tm method', async () => {
    const command = createCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      method: 'tm',
      autoApproveOption: 'perfect-match-only',
      branch: 'main',
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
    spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue(projectFiles as never);
    const preTranslate = spyOn(translationService, 'preTranslate').mockResolvedValue(finishedStatus as never);

    await command.defaultAction(commandContext);

    const request = preTranslate.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(request.autoApproveOption).toBe('perfectMatchOnly');
  });

  test('passes the extended auto-translation request fields', async () => {
    const command = createCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      method: 'tm',
      language: ['ua'],
      branch: 'main',
      scope: 'all',
      priority: 'high',
      skipApprovedTranslations: true,
      resetApprovalStatus: true,
      translationModifiedBefore: '2026-01-01T00:00:00Z',
      sourceLanguage: 'en',
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
    spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue(projectFiles as never);
    const preTranslate = spyOn(translationService, 'preTranslate').mockResolvedValue(finishedStatus as never);

    await command.defaultAction(commandContext);

    const request = preTranslate.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(request.scope).toBe('all');
    expect(request.priority).toBe('high');
    expect(request.skipApprovedTranslations).toBe(true);
    expect(request.resetApprovalStatus).toBe(true);
    expect(request.translationModifiedBefore).toBe('2026-01-01T00:00:00Z');
    expect(request.sourceLanguageId).toBe('en');
    expect('translateUntranslatedOnly' in request).toBe(false);
  });

  test('maps replace-translations-option to the API value', async () => {
    const command = createCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      method: 'tm',
      branch: 'main',
      replaceTranslationsOption: 'auto-translated',
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
    spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue(projectFiles as never);
    const preTranslate = spyOn(translationService, 'preTranslate').mockResolvedValue(finishedStatus as never);

    await command.defaultAction(commandContext);

    const request = preTranslate.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(request.replaceTranslationsOption).toBe('autoTranslated');
  });

  test('resolves exclude-label titles to excludeLabelIds', async () => {
    const command = createCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      method: 'tm',
      branch: 'main',
      label: ['label_1'],
      excludeLabel: ['label_2'],
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
    spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue(projectFiles as never);
    spyOn(labelService, 'list').mockResolvedValue([
      { id: 91, title: 'label_1' },
      { id: 92, title: 'label_2' },
    ] as never);
    const preTranslate = spyOn(translationService, 'preTranslate').mockResolvedValue(finishedStatus as never);

    await command.defaultAction(commandContext);

    const request = preTranslate.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(request.labelIds).toEqual([91]);
    expect(request.excludeLabelIds).toEqual([92]);
  });

  test('passes the extended request fields for strings-based projects', async () => {
    const command = createCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      method: 'tm',
      branch: 'main',
      scope: 'translated',
      priority: 'low',
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(stringsBasedProject as never);
    spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
    const preTranslate = spyOn(translationService, 'preTranslate').mockResolvedValue(finishedStatus as never);

    await command.defaultAction(commandContext);

    const request = preTranslate.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(request.branchIds).toEqual([81]);
    expect(request.scope).toBe('translated');
    expect(request.priority).toBe('low');
    expect('translateUntranslatedOnly' in request).toBe(false);
  });

  test('warns about missing labels but still auto-translates', async () => {
    const command = createCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      method: 'tm',
      branch: 'main',
      label: ['label_1', 'missing'],
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
    spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue(projectFiles as never);
    spyOn(labelService, 'list').mockResolvedValue([{ id: 91, title: 'label_1' }] as never);
    const warning = spyOn(output, 'warning').mockImplementation(() => {});
    const preTranslate = spyOn(translationService, 'preTranslate').mockResolvedValue(finishedStatus as never);

    await command.defaultAction(commandContext);

    expect(warning).toHaveBeenCalledWith("The 'missing' label is missing in the Crowdin project");
    const request = preTranslate.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(request.labelIds).toEqual([91]);
  });

  test('prints a verbose auto-translation report', async () => {
    const command = createCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      output: 'text',
      verbose: true,
      method: 'tm',
      branch: 'main',
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
    spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue(projectFiles as never);
    spyOn(translationService, 'preTranslate').mockResolvedValue(finishedStatus as never);
    spyOn(translationService, 'getPreTranslationReport').mockResolvedValue({
      preTranslateType: 'tm',
      languages: [
        {
          id: 'ua',
          files: [{ id: 101, statistics: { phrases: 5, words: 12 } }],
          skipped: { duplicate: 2 },
        },
      ],
    } as never);
    const log = spyOn(output, 'log').mockImplementation(() => {});

    await command.defaultAction(commandContext);

    expect(translationService.getPreTranslationReport).toHaveBeenCalledWith('121');
    expect(log).toHaveBeenCalledWith('\t- files: 1');
    expect(log).toHaveBeenCalledWith('\t- phrases: 5');
    expect(log).toHaveBeenCalledWith('\t- words: 12');
    expect(log).toHaveBeenCalledWith('\t- skipped: 2');
  });

  describe('validation', () => {
    test("throws when both '--file' and '--directory' are given", async () => {
      const command = createCommand();
      commandContext = createCommandContext({
        ...globalOptions,
        method: 'tm',
        file: ['first.po'],
        directory: 'src',
      });

      expect(command.defaultAction(commandContext)).rejects.toThrow(
        new CliError("Either '--file' or '--directory' can be specified"),
      );
    });

    test("throws when both '--language' and '--exclude-language' are given", async () => {
      const command = createCommand();
      commandContext = createCommandContext({
        ...globalOptions,
        method: 'tm',
        language: ['ua'],
        excludeLanguage: ['en'],
      });

      expect(command.defaultAction(commandContext)).rejects.toThrow(
        new CliError("The '--language' and '--exclude-language' options can't be used simultaneously"),
      );
    });

    test("throws when mt method is used without '--engine-id'", async () => {
      const command = createCommand();
      commandContext = createCommandContext({ ...globalOptions, method: 'mt' });

      expect(command.defaultAction(commandContext)).rejects.toThrow(
        new CliError("Machine Translation should be used with the '--engine-id' parameter"),
      );
    });

    test("throws when '--translate-with-perfect-match-only' is used with a non-tm method", async () => {
      const command = createCommand();
      commandContext = createCommandContext({
        ...globalOptions,
        method: 'ai',
        aiPrompt: 5,
        translateWithPerfectMatchOnly: true,
      });

      expect(command.defaultAction(commandContext)).rejects.toThrow(
        new CliError("'--translate-with-perfect-match-only' only works with the TM auto-translation method"),
      );
    });

    test("throws when ai method is used without '--ai-prompt'", async () => {
      const command = createCommand();
      commandContext = createCommandContext({ ...globalOptions, method: 'ai' });

      expect(command.defaultAction(commandContext)).rejects.toThrow(
        new CliError("AI should be used with the '--ai-prompt' parameter"),
      );
    });

    test('throws when method is missing', async () => {
      const command = createCommand();
      commandContext = createCommandContext({ ...globalOptions });

      expect(command.defaultAction(commandContext)).rejects.toThrow(
        new CliError("Missing required option '--method'. Supported values: mt, tm, ai"),
      );
    });

    test('throws when method is invalid', async () => {
      const command = createCommand();
      commandContext = createCommandContext({ ...globalOptions, method: 'invalid' });

      expect(command.defaultAction(commandContext)).rejects.toThrow(
        new CliError("Invalid value for '--method'. Supported values: mt, tm, ai"),
      );
    });

    test('throws when auto-approve-option is invalid', async () => {
      const command = createCommand();
      commandContext = createCommandContext({ ...globalOptions, method: 'tm', autoApproveOption: 'wrong' });

      expect(command.defaultAction(commandContext)).rejects.toThrow(
        new CliError(
          "Wrong '--auto-approve-option' parameter. Supported values: all, except-auto-substituted, perfect-match-only, none",
        ),
      );
    });

    test('throws when replace-translations-option is invalid', async () => {
      const command = createCommand();
      commandContext = createCommandContext({ ...globalOptions, method: 'tm', replaceTranslationsOption: 'wrong' });

      expect(command.defaultAction(commandContext)).rejects.toThrow(
        new CliError("Wrong '--replace-translations-option' parameter. Supported values: none, auto-translated, all"),
      );
    });

    test('throws when specified languages do not exist in the project', async () => {
      const command = createCommand();
      commandContext = createCommandContext({ ...globalOptions, method: 'tm', language: ['xx'], branch: 'main' });

      spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);

      expect(command.defaultAction(commandContext)).rejects.toThrow(
        new CliError("Language(s) 'xx' doesn't exist in the project. Try specifying another language code(s)"),
      );
    });

    test('throws when a strings-based project receives file arguments', async () => {
      const command = createCommand();
      commandContext = createCommandContext({ ...globalOptions, method: 'tm', file: ['first.po'], branch: 'main' });

      spyOn(projectService, 'loadProject').mockResolvedValue(stringsBasedProject as never);

      expect(command.defaultAction(commandContext)).rejects.toThrow(
        new CliError('File management is not available for string-based projects'),
      );
    });

    test('throws when a strings-based project has no branch', async () => {
      const command = createCommand();
      commandContext = createCommandContext({ ...globalOptions, method: 'tm' });

      spyOn(projectService, 'loadProject').mockResolvedValue(stringsBasedProject as never);

      expect(command.defaultAction(commandContext)).rejects.toThrow(
        new CliError('Branch is required for string-based projects'),
      );
    });

    test('throws when the branch does not exist on a files-based project', async () => {
      const command = createCommand();
      commandContext = createCommandContext({ ...globalOptions, method: 'tm', branch: 'missing' });

      spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
      spyOn(branchService, 'getBranch').mockResolvedValue(undefined as never);

      expect(command.defaultAction(commandContext)).rejects.toThrow(
        new CliError("Branch 'missing' doesn't exist in the project"),
      );
    });

    test('throws when a single specified file is not found', async () => {
      const command = createCommand();
      commandContext = createCommandContext({ ...globalOptions, method: 'tm', file: ['missing.po'], branch: 'main' });

      spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
      spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
      spyOn(fileService, 'loadProjectFiles').mockResolvedValue(projectFiles as never);

      expect(command.defaultAction(commandContext)).rejects.toThrow(
        new CliError("Project doesn't contain the '/missing.po' file"),
      );
    });

    test('throws when no files are found to auto-translate', async () => {
      const command = createCommand();
      commandContext = createCommandContext({ ...globalOptions, method: 'tm', branch: 'main' });

      spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
      spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
      spyOn(fileService, 'loadProjectFiles').mockResolvedValue({ data: [] } as never);

      expect(command.defaultAction(commandContext)).rejects.toThrow(
        new CliError("Couldn't find any files to Auto-Translate in the current project"),
      );
    });

    test('warns for missing files and fails after auto-translating the found ones', async () => {
      const command = createCommand();
      commandContext = createCommandContext({
        ...globalOptions,
        method: 'tm',
        file: ['first.po', 'missing.po'],
        branch: 'main',
      });

      spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
      spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
      spyOn(fileService, 'loadProjectFiles').mockResolvedValue(projectFiles as never);
      const warning = spyOn(output, 'warning').mockImplementation(() => {});
      const preTranslate = spyOn(translationService, 'preTranslate').mockResolvedValue(finishedStatus as never);

      const error = await command.defaultAction(commandContext).catch((thrown) => thrown);

      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).message).toBe('Some of the specified files were not found in the project');
      expect(warning).toHaveBeenCalledWith("Project doesn't contain the '/missing.po' file");
      expect(preTranslate).toHaveBeenCalled();
    });

    test('propagates API errors from the auto-translation service', async () => {
      const command = createCommand();
      commandContext = createCommandContext({ ...globalOptions, method: 'tm', branch: 'main' });

      spyOn(projectService, 'loadProject').mockResolvedValue(filesBasedProject as never);
      spyOn(branchService, 'getBranch').mockResolvedValue({ id: 81, name: 'main' } as never);
      spyOn(fileService, 'loadProjectFiles').mockResolvedValue(projectFiles as never);
      spyOn(translationService, 'preTranslate').mockRejectedValue(
        new CliError('Failed to auto-translate the project. Please contact our support team for help'),
      );

      expect(command.defaultAction(commandContext)).rejects.toThrow(
        new CliError('Failed to auto-translate the project. Please contact our support team for help'),
      );
    });
  });
});

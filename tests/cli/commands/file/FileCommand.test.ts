import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import FileCommand from '@/cli/commands/file/FileCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { BranchService } from '@/cli/services/BranchService.ts';
import { DirectoryService } from '@/cli/services/DirectoryService.ts';
import { FileService } from '@/cli/services/FileService.ts';
import { LabelService } from '@/cli/services/LabelService.ts';
import { ProjectService } from '@/cli/services/ProjectService.ts';
import { StorageService } from '@/cli/services/StorageService.ts';
import { StringService } from '@/cli/services/StringService.ts';
import { TranslationService } from '@/cli/services/TranslationService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';
import type { ProjectConfig } from '@/lib/config.ts';

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

describe('FileCommand', () => {
  let tempDir: string;
  let commandContext: Command & { args?: string[] };
  let apiClient: Client;
  let output: Output;
  let projectService: ProjectService;
  let storageService: StorageService;
  let directoryService: DirectoryService;
  let fileService: FileService;
  let labelService: LabelService;
  let branchService: BranchService;
  let translationService: TranslationService;
  let stringService: StringService;

  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    output: 'json',
  };

  type FileTestOptions = GlobalOptions & {
    basePath?: string;
    dest?: string;
    type?: string;
    parserVersion?: string;
    label?: string[];
    branch?: string;
    tree?: boolean;
    noAutoUpdate?: boolean;
    cleanupMode?: boolean;
    updateStrings?: boolean;
    context?: string;
    language?: string;
    xliff?: boolean;
  };

  const createCommandContext = (options: FileTestOptions, args: string[] = []) => {
    return {
      optsWithGlobals: () => options,
      args,
    } as unknown as Command & { args?: string[] };
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-file-command-'));

    apiClient = new Client({ token: config.apiToken ?? '' });
    output = createOutput(globalOptions);
    projectService = new ProjectService(apiClient, output, config.projectId);
    storageService = new StorageService(apiClient);
    directoryService = new DirectoryService(apiClient, config.projectId);
    fileService = new FileService(apiClient, output, config.projectId);
    labelService = new LabelService(apiClient, config.projectId);
    branchService = new BranchService(apiClient, config.projectId);
    translationService = new TranslationService(apiClient, output, config.projectId);
    stringService = new StringService(apiClient, config.projectId);

    commandContext = createCommandContext(globalOptions);

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(async () => {
    mock.restore();
    await rm(tempDir, { recursive: true, force: true });
  });

  const createFileCommand = () => {
    return new FileCommand(
      async (command: Command) => ({
        ...config,
        basePath:
          (command as unknown as { optsWithGlobals: () => FileTestOptions }).optsWithGlobals().basePath || tempDir,
      }),
      () => output,
      async () => projectService,
      async () => storageService,
      async () => directoryService,
      async () => fileService,
      async () => labelService,
      async () => branchService,
      async () => translationService,
      async () => stringService,
    );
  };

  test('delegates default action to command help', async () => {
    const fileCommand = createFileCommand();
    const help = mock(() => {});
    const helpCommand = { help, optsWithGlobals: () => ({}) } as unknown as Command;

    await fileCommand.defaultAction(helpCommand);

    expect(help).toHaveBeenCalledTimes(1);
  });

  test('lists project files', async () => {
    const fileCommand = createFileCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: { id: 123 },
    } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue({
      data: [{ data: { id: 1, path: '/docs/readme.md' } }, { data: { id: 2, path: '/docs/changelog.md' } }],
    } as never);

    await fileCommand.listAction(commandContext);

    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify(
        [
          { id: 1, path: 'docs/readme.md' },
          { id: 2, path: 'docs/changelog.md' },
        ],
        null,
        2,
      ),
    );
  });

  test('lists files under the given branch', async () => {
    const fileCommand = createFileCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue({ data: { id: 123 } } as never);

    const resolveBranchId = spyOn(branchService, 'resolveBranchId').mockResolvedValue(5);
    const loadProjectFiles = spyOn(fileService, 'loadProjectFiles').mockResolvedValue({ data: [] } as never);

    commandContext = createCommandContext({ ...globalOptions, branch: 'feature' });

    await fileCommand.listAction(commandContext);

    expect(resolveBranchId).toHaveBeenCalledWith('feature');
    expect(loadProjectFiles).toHaveBeenCalledWith(5);
  });

  test('renders a tree view with --tree', async () => {
    const textOutput = createOutput({ ...globalOptions, output: 'text' });
    const fileCommand = new FileCommand(
      async () => ({ ...config, basePath: tempDir }),
      () => textOutput,
      async () => projectService,
      async () => storageService,
      async () => directoryService,
      async () => fileService,
      async () => labelService,
      async () => branchService,
      async () => translationService,
      async () => stringService,
    );

    spyOn(projectService, 'loadProject').mockResolvedValue({ data: { id: 123 } } as never);
    spyOn(branchService, 'resolveBranchId').mockResolvedValue(undefined);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue({
      data: [{ data: { id: 1, path: '/docs/readme.md' } }],
    } as never);

    await fileCommand.listAction(createCommandContext({ ...globalOptions, output: 'text', tree: true }));

    const logged = (console.log as unknown as ReturnType<typeof mock>).mock.calls.map((call) => call[0]);

    expect(logged).toContain('.');
    expect(logged.some((line: string) => line.includes('docs'))).toBe(true);
    expect(logged.some((line: string) => line.includes('readme.md'))).toBe(true);
  });

  test('--tree is ignored under a machine --output so the format stays parseable', async () => {
    const jsonOutput = createOutput({ ...globalOptions, output: 'json' });
    const tableSpy = spyOn(jsonOutput, 'table');
    const fileCommand = new FileCommand(
      async () => ({ ...config, basePath: tempDir }),
      () => jsonOutput,
      async () => projectService,
      async () => storageService,
      async () => directoryService,
      async () => fileService,
      async () => labelService,
      async () => branchService,
      async () => translationService,
      async () => stringService,
    );

    spyOn(projectService, 'loadProject').mockResolvedValue({ data: { id: 123 } } as never);
    spyOn(branchService, 'resolveBranchId').mockResolvedValue(undefined);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue({
      data: [{ data: { id: 1, path: '/docs/readme.md' } }],
    } as never);

    await fileCommand.listAction(createCommandContext({ ...globalOptions, output: 'json', tree: true }));

    expect(tableSpy).toHaveBeenCalled();
    const logged = (console.log as unknown as ReturnType<typeof mock>).mock.calls.map((call) => call[0]);
    expect(logged.some((line: string) => typeof line === 'string' && line.includes('╰─'))).toBe(false);
  });

  test('uploads file and creates nested directories', async () => {
    const fileCommand = createFileCommand();
    const localFilePath = join(tempDir, 'readme.json');

    await Bun.write(localFilePath, '{"hello":"world"}');

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: { id: 123 },
    } as never);

    const createDirectory = spyOn(apiClient.sourceFilesApi, 'createDirectory');
    createDirectory
      .mockResolvedValueOnce({ data: { id: 10 } } as never)
      .mockResolvedValueOnce({ data: { id: 20 } } as never);
    const addStorage = spyOn(storageService, 'addStorage').mockResolvedValue({
      data: { id: 99 },
    } as never);

    spyOn(fileService, 'loadProjectFiles').mockResolvedValue({ data: [] } as never);
    spyOn(directoryService, 'loadProjectDirectories').mockResolvedValue([] as never);

    const createFile = spyOn(apiClient.sourceFilesApi, 'createFile').mockResolvedValue({ data: { id: 777 } } as never);

    commandContext = createCommandContext(
      {
        ...globalOptions,
        output: 'json',
        dest: 'nested/translations/remote.json',
        type: 'json',
        parserVersion: '2',
      },
      [localFilePath],
    );

    await fileCommand.uploadAction(commandContext);

    expect(createDirectory).toHaveBeenNthCalledWith(1, 123, {
      name: 'nested',
      directoryId: undefined,
      branchId: undefined,
    });
    expect(createDirectory).toHaveBeenNthCalledWith(2, 123, {
      name: 'translations',
      directoryId: 10,
      branchId: undefined,
    });
    expect(addStorage).toHaveBeenCalledWith(
      expect.any(Object), // Bun.file object
    );
    expect(createFile).toHaveBeenCalledWith(123, {
      storageId: 99,
      name: 'remote.json',
      directoryId: 20,
      branchId: undefined,
      type: 'json',
      parserVersion: 2,
      context: undefined,
      excludedTargetLanguages: undefined,
      attachLabelIds: undefined,
    });
  });

  test('resolves and attaches label ids when uploading with --label', async () => {
    const fileCommand = createFileCommand();
    const localFilePath = join(tempDir, 'remote.json');

    await Bun.write(localFilePath, '{}');

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({ data: { id: 123 } } as never);
    spyOn(storageService, 'addStorage').mockResolvedValue({ data: { id: 99 } } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue({ data: [] } as never);

    const resolveLabelIds = spyOn(labelService, 'resolveLabelIds').mockResolvedValue([7, 8]);
    const createFile = spyOn(apiClient.sourceFilesApi, 'createFile').mockResolvedValue({ data: { id: 777 } } as never);

    commandContext = createCommandContext({ ...globalOptions, dest: 'remote.json', label: ['ui', 'web'] }, [
      localFilePath,
    ]);

    await fileCommand.uploadAction(commandContext);

    expect(resolveLabelIds).toHaveBeenCalledWith(['ui', 'web']);
    expect(createFile).toHaveBeenCalledWith(123, expect.objectContaining({ attachLabelIds: [7, 8] }));
  });

  test('does not resolve labels when --label is absent', async () => {
    const fileCommand = createFileCommand();
    const localFilePath = join(tempDir, 'remote.json');

    await Bun.write(localFilePath, '{}');

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({ data: { id: 123 } } as never);
    spyOn(storageService, 'addStorage').mockResolvedValue({ data: { id: 99 } } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue({ data: [] } as never);

    const resolveLabelIds = spyOn(labelService, 'resolveLabelIds');

    spyOn(apiClient.sourceFilesApi, 'createFile').mockResolvedValue({ data: { id: 777 } } as never);

    commandContext = createCommandContext({ ...globalOptions, dest: 'remote.json' }, [localFilePath]);

    await fileCommand.uploadAction(commandContext);

    expect(resolveLabelIds).not.toHaveBeenCalled();
  });

  test('requires file type when parser version provided', async () => {
    const fileCommand = createFileCommand();
    const localFilePath = join(tempDir, 'example.json');

    await Bun.write(localFilePath, '{}');

    commandContext = createCommandContext({ ...globalOptions, parserVersion: '2' }, [localFilePath]);

    expect(fileCommand.uploadAction(commandContext)).rejects.toThrow(
      new CliError("'--type' is required for '--parser-version' option"),
    );
  });

  test('rejects a missing local file', async () => {
    const fileCommand = createFileCommand();

    commandContext = createCommandContext({ ...globalOptions }, [join(tempDir, 'nope.json')]);

    expect(fileCommand.uploadAction(commandContext)).rejects.toThrow(/not found/);
  });

  test('rejects a directory as the upload file', async () => {
    const fileCommand = createFileCommand();

    commandContext = createCommandContext({ ...globalOptions }, [tempDir]);

    expect(fileCommand.uploadAction(commandContext)).rejects.toThrow(new CliError('The specified file is a directory'));
  });

  test('updates an existing file instead of creating it', async () => {
    const fileCommand = createFileCommand();
    const localFilePath = join(tempDir, 'remote.json');

    await Bun.write(localFilePath, '{}');

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({ data: { id: 123 } } as never);
    spyOn(storageService, 'addStorage').mockResolvedValue({ data: { id: 99 } } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue({
      data: [{ data: { id: 42, path: '/remote.json' } }],
    } as never);

    const updateProjectFile = spyOn(fileService, 'updateProjectFile').mockResolvedValue(undefined as never);
    const createFile = spyOn(apiClient.sourceFilesApi, 'createFile');

    commandContext = createCommandContext({ ...globalOptions, dest: 'remote.json' }, [localFilePath]);

    await fileCommand.uploadAction(commandContext);

    expect(updateProjectFile).toHaveBeenCalledWith(
      42,
      99,
      localFilePath,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect(createFile).not.toHaveBeenCalled();
  });

  test('skips an existing file when --no-auto-update is set', async () => {
    const fileCommand = createFileCommand();
    const localFilePath = join(tempDir, 'remote.json');

    await Bun.write(localFilePath, '{}');

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({ data: { id: 123 } } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue({
      data: [{ data: { id: 42, path: '/remote.json' } }],
    } as never);

    const updateProjectFile = spyOn(fileService, 'updateProjectFile');
    const addStorage = spyOn(storageService, 'addStorage');

    commandContext = createCommandContext({ ...globalOptions, dest: 'remote.json', noAutoUpdate: true }, [
      localFilePath,
    ]);

    await fileCommand.uploadAction(commandContext);

    expect(updateProjectFile).not.toHaveBeenCalled();
    expect(addStorage).not.toHaveBeenCalled();
  });

  test('uploads strings for a strings-based project', async () => {
    const fileCommand = createFileCommand();
    const localFilePath = join(tempDir, 'strings.csv');

    await Bun.write(localFilePath, 'key,text');

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: { id: 123, type: ProjectsGroupsModel.Type.STRINGS_BASED },
    } as never);
    spyOn(branchService, 'getOrCreateBranch').mockResolvedValue({ id: 7 } as never);
    spyOn(storageService, 'addStorage').mockResolvedValue({ data: { id: 99 } } as never);

    const uploadStrings = spyOn(stringService, 'uploadStrings').mockResolvedValue({
      data: { status: 'finished', identifier: 'abc' },
    } as never);

    commandContext = createCommandContext(
      { ...globalOptions, branch: 'main', dest: 'strings.csv', cleanupMode: true, updateStrings: true },
      [localFilePath],
    );

    await fileCommand.uploadAction(commandContext);

    expect(uploadStrings).toHaveBeenCalledWith({
      branchId: 7,
      storageId: 99,
      labelIds: undefined,
      cleanupMode: true,
      updateStrings: true,
    });
  });

  test('requires a branch for strings-based upload', async () => {
    const fileCommand = createFileCommand();
    const localFilePath = join(tempDir, 'strings.csv');

    await Bun.write(localFilePath, 'key,text');

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: { id: 123, type: ProjectsGroupsModel.Type.STRINGS_BASED },
    } as never);

    commandContext = createCommandContext({ ...globalOptions, dest: 'strings.csv' }, [localFilePath]);

    expect(fileCommand.uploadAction(commandContext)).rejects.toThrow(
      new CliError('Branch is required for string-based projects'),
    );
  });

  test('rejects --context for a strings-based project', async () => {
    const fileCommand = createFileCommand();
    const localFilePath = join(tempDir, 'strings.csv');

    await Bun.write(localFilePath, 'key,text');

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: { id: 123, type: ProjectsGroupsModel.Type.STRINGS_BASED },
    } as never);

    commandContext = createCommandContext({ ...globalOptions, dest: 'strings.csv', context: 'some context' }, [
      localFilePath,
    ]);

    expect(fileCommand.uploadAction(commandContext)).rejects.toThrow(/only available for file-based projects/);
  });

  test('imports translations for a source file when --language is set', async () => {
    const fileCommand = createFileCommand();
    const localFilePath = join(tempDir, 'uk.json');

    await Bun.write(localFilePath, '{}');

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: { id: 123, languageMapping: {}, targetLanguages: [{ id: 'uk' }], type: 0 },
    } as never);
    spyOn(storageService, 'addStorage').mockResolvedValue({ data: { id: 99 } } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue({
      data: [{ data: { id: 40, path: '/main.json' } }],
    } as never);

    const importProjectTranslation = spyOn(translationService, 'importProjectTranslation').mockResolvedValue({
      data: { identifier: 'import-1', status: 'finished', progress: 100 },
    } as never);

    commandContext = createCommandContext({ ...globalOptions, language: 'uk', dest: 'main.json' }, [localFilePath]);

    await fileCommand.uploadAction(commandContext);

    expect(importProjectTranslation).toHaveBeenCalledWith(99, 40, ['uk'], localFilePath);
  });

  // The import is queued server-side, so Java waits for the status to finish before reporting the
  // file as uploaded (executeAsyncAction). Without the poll a failed import still reports success.
  test('polls the import status and reports progress when uploading a translation', async () => {
    const fileCommand = createFileCommand();
    const localFilePath = join(tempDir, 'main.json');

    await Bun.write(localFilePath, '{}');

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: { id: 123, languageMapping: {}, targetLanguages: [{ id: 'uk' }], type: 0 },
    } as never);
    spyOn(storageService, 'addStorage').mockResolvedValue({ data: { id: 99 } } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue({
      data: [{ data: { id: 40, path: '/main.json' } }],
    } as never);
    spyOn(translationService, 'importProjectTranslation').mockResolvedValue({
      data: { identifier: 'import-1', status: 'created', progress: 0 },
    } as never);

    const statuses = [
      { data: { identifier: 'import-1', status: 'in_progress', progress: 50 } },
      { data: { identifier: 'import-1', status: 'finished', progress: 100 } },
    ];
    const status = spyOn(translationService, 'getImportTranslationsStatus').mockImplementation(
      async () => statuses.shift() as never,
    );
    const log = spyOn(output, 'log');

    commandContext = createCommandContext({ ...globalOptions, language: 'uk', dest: 'main.json' }, [localFilePath]);

    await fileCommand.uploadAction(commandContext);

    expect(status).toHaveBeenCalledWith('import-1');
    expect(status).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith(`Importing translations for file '${localFilePath}'`);
    // Java prints the percent lines here regardless of --verbose, identifier only when verbose.
    expect(log).toHaveBeenCalledWith(`Importing translations for file '${localFilePath}' (50%)`);
    expect(log).not.toHaveBeenCalledWith(`Importing translations for file '${localFilePath}' (50%) (import-1)`);
  });

  test('fails the translation upload when the import status reports failure', async () => {
    const fileCommand = createFileCommand();
    const localFilePath = join(tempDir, 'main.json');

    await Bun.write(localFilePath, '{}');

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: { id: 123, languageMapping: {}, targetLanguages: [{ id: 'uk' }], type: 0 },
    } as never);
    spyOn(storageService, 'addStorage').mockResolvedValue({ data: { id: 99 } } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue({
      data: [{ data: { id: 40, path: '/main.json' } }],
    } as never);
    spyOn(translationService, 'importProjectTranslation').mockResolvedValue({
      data: { identifier: 'import-1', status: 'failed', progress: 0 },
    } as never);

    const success = spyOn(output, 'success');

    commandContext = createCommandContext({ ...globalOptions, language: 'uk', dest: 'main.json' }, [localFilePath]);

    expect(fileCommand.uploadAction(commandContext)).rejects.toThrow(
      `Failed to upload the translation file '${localFilePath}'. Please contact our support team for help`,
    );
    expect(success).not.toHaveBeenCalled();
  });

  test('imports an xliff translation without resolving a source file', async () => {
    const fileCommand = createFileCommand();
    const localFilePath = join(tempDir, 'offline.xliff');

    await Bun.write(localFilePath, '<xliff/>');

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: { id: 123, languageMapping: {}, targetLanguages: [{ id: 'uk' }], type: 0 },
    } as never);
    spyOn(storageService, 'addStorage').mockResolvedValue({ data: { id: 99 } } as never);

    const importXliff = spyOn(translationService, 'importXliffTranslation').mockResolvedValue({
      data: { identifier: 'import-1', status: 'finished', progress: 100 },
    } as never);

    commandContext = createCommandContext({ ...globalOptions, language: 'uk', xliff: true }, [localFilePath]);

    await fileCommand.uploadAction(commandContext);

    expect(importXliff).toHaveBeenCalledWith(99, ['uk'], localFilePath);
  });

  test('requires --language for an xliff upload', async () => {
    const fileCommand = createFileCommand();
    const localFilePath = join(tempDir, 'offline.xliff');

    await Bun.write(localFilePath, '<xliff/>');

    commandContext = createCommandContext({ ...globalOptions, xliff: true }, [localFilePath]);

    expect(fileCommand.uploadAction(commandContext)).rejects.toThrow(/required for offline translation file/);
  });

  test('rejects --dest together with --xliff', async () => {
    const fileCommand = createFileCommand();
    const localFilePath = join(tempDir, 'offline.xliff');

    await Bun.write(localFilePath, '<xliff/>');

    commandContext = createCommandContext({ ...globalOptions, xliff: true, language: 'uk', dest: 'x.json' }, [
      localFilePath,
    ]);

    expect(fileCommand.uploadAction(commandContext)).rejects.toThrow(/can not be used for offline translation file/);
  });

  test('rejects a language missing from the project', async () => {
    const fileCommand = createFileCommand();
    const localFilePath = join(tempDir, 'uk.json');

    await Bun.write(localFilePath, '{}');

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: { id: 123, languageMapping: {}, targetLanguages: [{ id: 'de' }], type: 0 },
    } as never);

    commandContext = createCommandContext({ ...globalOptions, language: 'uk', dest: 'main.json' }, [localFilePath]);

    expect(fileCommand.uploadAction(commandContext)).rejects.toThrow(/doesn't exist in the project/);
  });

  test('downloads file into destination directory', async () => {
    const fileCommand = createFileCommand();
    const destinationDir = join(tempDir, 'downloads');

    await mkdir(destinationDir, { recursive: true });

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: { id: 123, languageMapping: {} },
    } as never);
    spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
      data: [{ data: { id: 40, path: '/docs/readme.md' } }],
    } as never);
    spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue('https://example.test/readme.md');
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response('downloaded content'));

    commandContext = createCommandContext({ ...globalOptions, dest: 'downloads' }, ['docs/readme.md']);

    await fileCommand.downloadAction(commandContext);

    expect(await Bun.file(join(destinationDir, 'readme.md')).text()).toBe('downloaded content');
  });

  test('downloads a source file to its own path when --dest is omitted', async () => {
    const fileCommand = createFileCommand();

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: { id: 123, languageMapping: {} },
    } as never);
    spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
      data: [{ data: { id: 40, path: '/docs/readme.md' } }],
    } as never);
    spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue('https://example.test/readme.md');
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response('downloaded content'));

    commandContext = createCommandContext({ ...globalOptions }, ['docs/readme.md']);

    await fileCommand.downloadAction(commandContext);

    // Must land at basePath/docs/readme.md, not the doubled docs/readme.md/readme.md.
    expect(await Bun.file(join(tempDir, 'docs/readme.md')).text()).toBe('downloaded content');
  });

  test('skips source download for a string-based project', async () => {
    const fileCommand = createFileCommand();

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: { id: 123, languageMapping: {}, type: ProjectsGroupsModel.Type.STRINGS_BASED },
    } as never);

    const getUrl = spyOn(fileService, 'getSourceFileDownloadUrl');

    commandContext = createCommandContext({ ...globalOptions }, ['docs/readme.md']);

    await fileCommand.downloadAction(commandContext);

    expect(getUrl).not.toHaveBeenCalled();
  });

  test('skips source download without manager access', async () => {
    const fileCommand = createFileCommand();

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({ data: { id: 123 } } as never);

    const getUrl = spyOn(fileService, 'getSourceFileDownloadUrl');

    commandContext = createCommandContext({ ...globalOptions }, ['docs/readme.md']);

    await fileCommand.downloadAction(commandContext);

    expect(getUrl).not.toHaveBeenCalled();
  });

  test('skips delete for a string-based project', async () => {
    const deleteProjectFile = mock(async () => undefined);
    const mockFileService = {
      loadProjectFiles: mock(async () => ({ data: [] })),
      deleteProjectFile,
    };
    const fileCommand = new FileCommand(
      async () => ({ ...config, basePath: tempDir }),
      () => output,
      async () => projectService as never,
      async () => storageService,
      async () => directoryService,
      async () => mockFileService as never,
      async () => labelService,
      async () => branchService,
      async () => translationService,
      async () => stringService,
    );

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: { id: 123, type: ProjectsGroupsModel.Type.STRINGS_BASED },
    } as never);

    commandContext = createCommandContext(globalOptions, ['docs/readme.md']);

    await fileCommand.deleteAction(commandContext);

    expect(deleteProjectFile).not.toHaveBeenCalled();
  });

  test('downloads file translations for a single language', async () => {
    const fileCommand = createFileCommand();

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: {
        id: 123,
        languageMapping: {},
        targetLanguages: [{ id: 'uk', locale: 'uk-UA', name: 'Ukrainian' }],
        type: 0,
      },
    } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue({
      data: [{ data: { id: 40, path: '/main.json', name: 'main.json' } }],
    } as never);

    const build = spyOn(translationService, 'buildProjectFileTranslation').mockResolvedValue(
      'https://example.test/uk.json',
    );

    spyOn(globalThis, 'fetch').mockResolvedValue(new Response('translated'));

    commandContext = createCommandContext({ ...globalOptions, language: 'uk' }, ['main.json']);

    await fileCommand.downloadAction(commandContext);

    expect(build).toHaveBeenCalledWith(40, 'uk');
    expect(await Bun.file(join(tempDir, 'uk/main.json')).text()).toBe('translated');
  });

  test('resolves language placeholders in --dest for translation download', async () => {
    const fileCommand = createFileCommand();

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: {
        id: 123,
        languageMapping: {},
        targetLanguages: [{ id: 'uk', locale: 'uk-UA', name: 'Ukrainian' }],
        type: 0,
      },
    } as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue({
      data: [{ data: { id: 40, path: '/main.json', name: 'main.json' } }],
    } as never);
    spyOn(translationService, 'buildProjectFileTranslation').mockResolvedValue('https://example.test/uk.json');
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response('translated'));

    commandContext = createCommandContext({ ...globalOptions, language: 'uk', dest: 'out/%locale%' }, ['main.json']);

    await fileCommand.downloadAction(commandContext);

    expect(await Bun.file(join(tempDir, 'out/uk-UA/main.json')).text()).toBe('translated');
  });

  test('rejects an unknown language on translation download', async () => {
    const fileCommand = createFileCommand();

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: { id: 123, languageMapping: {}, targetLanguages: [{ id: 'de' }], type: 0 },
    } as never);

    commandContext = createCommandContext({ ...globalOptions, language: 'uk' }, ['main.json']);

    expect(fileCommand.downloadAction(commandContext)).rejects.toThrow(/doesn't exist in the project/);
  });

  test('skips translation download for a string-based project', async () => {
    const fileCommand = createFileCommand();

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: {
        id: 123,
        languageMapping: {},
        targetLanguages: [{ id: 'uk' }],
        type: ProjectsGroupsModel.Type.STRINGS_BASED,
      },
    } as never);

    const build = spyOn(translationService, 'buildProjectFileTranslation');

    commandContext = createCommandContext({ ...globalOptions, language: 'uk' }, ['main.json']);

    await fileCommand.downloadAction(commandContext);

    expect(build).not.toHaveBeenCalled();
  });

  test('deletes matching project file', async () => {
    const deleteProjectFile = mock(async () => undefined);
    const mockFileService = {
      loadProjectFiles: mock(async () => ({
        data: [{ data: { id: 55, path: '/docs/readme.md' } }],
      })),
      deleteProjectFile,
    };
    const fileCommand = new FileCommand(
      async (command: Command) => ({ ...config, basePath: tempDir }),
      () => output,
      async () => projectService as never,
      async () => storageService,
      async () => directoryService,
      async () => mockFileService as never,
      async () => labelService,
      async () => branchService,
      async () => translationService,
      async () => stringService,
    );

    spyOn(projectService, 'loadProject').mockResolvedValue({ data: { id: 123 } } as never);

    commandContext = createCommandContext(globalOptions, ['docs/readme.md']);

    await fileCommand.deleteAction(commandContext);

    expect(deleteProjectFile).toHaveBeenCalledWith(55, '/docs/readme.md');
  });

  test('deletes a file scoped to a branch', async () => {
    const deleteProjectFile = mock(async () => undefined);
    const loadProjectFiles = mock(async () => ({
      data: [{ data: { id: 55, path: '/docs/readme.md' } }],
    }));
    const mockFileService = { loadProjectFiles, deleteProjectFile };
    const fileCommand = new FileCommand(
      async () => ({ ...config, basePath: tempDir }),
      () => output,
      async () => projectService as never,
      async () => storageService,
      async () => directoryService,
      async () => mockFileService as never,
      async () => labelService,
      async () => branchService,
      async () => translationService,
      async () => stringService,
    );

    spyOn(projectService, 'loadProject').mockResolvedValue({ data: { id: 123 } } as never);
    spyOn(branchService, 'resolveBranchId').mockResolvedValue(9);

    commandContext = createCommandContext({ ...globalOptions, branch: 'feature' }, ['docs/readme.md']);

    await fileCommand.deleteAction(commandContext);

    expect(loadProjectFiles).toHaveBeenCalledWith(9);
    expect(deleteProjectFile).toHaveBeenCalledWith(55, '/docs/readme.md');
  });
});

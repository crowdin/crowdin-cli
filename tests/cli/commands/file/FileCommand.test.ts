import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import FileCommand from '@/cli/commands/file/FileCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { DirectoryService } from '@/cli/services/DirectoryService.ts';
import { FileService } from '@/cli/services/FileService.ts';
import { ProjectService } from '@/cli/services/ProjectService.ts';
import { StorageService } from '@/cli/services/StorageService.ts';
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

describe('FileCommand', () => {
  let tempDir: string;
  let commandContext: Command & { args?: string[] };
  let apiClient: Client;
  let output: Output;
  let projectService: ProjectService;
  let storageService: StorageService;
  let directoryService: DirectoryService;
  let fileService: FileService;
  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    format: 'json',
  };

  type FileTestOptions = GlobalOptions & {
    basePath?: string;
    dest?: string;
    type?: string;
    parserVersion?: string;
  };

  const createCommandContext = (options: FileTestOptions, args: string[] = []) => {
    return {
      optsWithGlobals: () => options,
      args,
    } as unknown as Command & { args?: string[] };
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-file-command-'));

    apiClient = new Client({ token: config.apiToken });
    output = createOutput(globalOptions);
    projectService = new ProjectService(apiClient, output, config.projectId);
    storageService = new StorageService(apiClient);
    directoryService = new DirectoryService(apiClient, config.projectId);
    fileService = new FileService(apiClient, output, config.projectId);

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
          { id: 1, path: '/docs/readme.md' },
          { id: 2, path: '/docs/changelog.md' },
        ],
        null,
        2,
      ),
    );
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
    const createFile = spyOn(apiClient.sourceFilesApi, 'createFile').mockResolvedValue({ data: { id: 777 } } as never);

    commandContext = createCommandContext(
      {
        ...globalOptions,
        format: 'json',
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
      name: 'nested/translations/remote.json',
      directoryId: 20,
      type: 'json',
      parserVersion: 2,
    });
  });

  test('requires file type when parser version provided', async () => {
    const fileCommand = createFileCommand();

    commandContext = createCommandContext({ ...globalOptions, parserVersion: '2' }, ['example.json']);

    expect(fileCommand.uploadAction(commandContext)).rejects.toThrow(
      new CliError('Type is required for parser version'),
    );
  });

  test('downloads file into destination directory', async () => {
    const fileCommand = createFileCommand();
    const destinationDir = join(tempDir, 'downloads');

    await mkdir(destinationDir, { recursive: true });

    spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
      data: { id: 123 },
    } as never);
    spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
      data: [{ data: { id: 40, path: 'docs/readme.md' } }],
    } as never);
    spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue('https://example.test/readme.md');
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response('downloaded content'));

    commandContext = createCommandContext({ ...globalOptions, dest: 'downloads' }, ['docs/readme.md']);

    await fileCommand.downloadAction(commandContext);

    expect(await Bun.file(join(destinationDir, 'readme.md')).text()).toBe('downloaded content');
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
    );

    spyOn(projectService, 'loadProject').mockResolvedValue({ data: { id: 123 } } as never);
    commandContext = createCommandContext(globalOptions, ['docs/readme.md']);

    await fileCommand.deleteAction(commandContext);

    expect(deleteProjectFile).toHaveBeenCalledWith(55, '/docs/readme.md');
  });
});

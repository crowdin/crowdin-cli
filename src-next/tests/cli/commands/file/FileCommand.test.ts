import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Command } from 'commander';
import FileCommand from '../../../../src/cli/commands/file/FileCommand.ts';
import CliError from '../../../../src/cli/errors/CliError.ts';
import { ProjectService } from '../../../../src/cli/services/ProjectService.ts';
import { createOutput, type Output } from '../../../../src/cli/utils/output.ts';
import Client from '../../../../src/lib/api/client.ts';
import type { Config } from '../../../../src/lib/config.ts';
import { StorageService } from '../../../../src/cli/services/StorageService.ts';

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

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-file-command-'));

    apiClient = new Client({ token: config.apiToken });
    output = createOutput('json');
    projectService = new ProjectService(apiClient, output, config.projectId);
    storageService = new StorageService(apiClient);

    commandContext = {
      optsWithGlobals: () => ({ format: 'json' }),
      args: [],
    } as Command & { args?: string[] };

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
        basePath: (command.optsWithGlobals() as any).basePath || tempDir,
      }),
      () => output,
      async () => projectService,
      async () => storageService,
      async () => apiClient,
    );
  };

  test('delegates default action to command help', async () => {
    const fileCommand = createFileCommand();
    const help = mock(() => {});
    const helpCommand = { help, optsWithGlobals: () => ({}) } as Command;

    await fileCommand.defaultAction(helpCommand);

    expect(help).toHaveBeenCalledTimes(1);
  });

  test('lists project files', async () => {
    const fileCommand = createFileCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: { id: 123 },
    } as never);
    spyOn(projectService, 'loadProjectFiles').mockResolvedValue({
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

    spyOn(apiClient, 'getProject').mockResolvedValue({
      data: { id: 123 },
    } as never);
    const createProjectDirectory = spyOn(apiClient, 'createProjectDirectory');
    createProjectDirectory.mockResolvedValueOnce({ data: { id: 10 } } as never)
      .mockResolvedValueOnce({ data: { id: 20 } } as never);
    const addStorage = spyOn(storageService, 'addStorage').mockResolvedValue({
      data: { id: 99 },
    } as never);
    const addProjectFile = spyOn(apiClient, 'addProjectFile').mockResolvedValue({ data: { id: 777 } } as never);

    commandContext = {
      ...commandContext,
      optsWithGlobals: () => ({
        format: 'json',
        dest: 'nested/translations/remote.json',
        type: 'json',
        parserVersion: '2',
      }),
      args: [localFilePath],
    } as Command & { args?: string[] };

    await fileCommand.uploadAction(commandContext);

    expect(createProjectDirectory).toHaveBeenNthCalledWith(1, 123, 'nested', undefined);
    expect(createProjectDirectory).toHaveBeenNthCalledWith(2, 123, 'translations', 10);
    expect(addStorage).toHaveBeenCalledWith(
      expect.any(Object), // Bun.file object
    );
    expect(addProjectFile).toHaveBeenCalledWith(123, 99, 'nested/translations/remote.json', 20, undefined, 'json', 2);
  });

  test('requires file type when parser version provided', async () => {
    const fileCommand = createFileCommand();

    commandContext = {
      ...commandContext,
      optsWithGlobals: () => ({ format: 'json', parserVersion: '2' }),
      args: ['example.json'],
    } as Command & { args?: string[] };

    expect(fileCommand.uploadAction(commandContext)).rejects.toThrow(
      new CliError('Type is required for parser version')
    );
  });

  test('downloads file into destination directory', async () => {
    const fileCommand = createFileCommand();
    const destinationDir = join(tempDir, 'downloads');

    await mkdir(destinationDir, { recursive: true });

    spyOn(apiClient, 'getProject').mockResolvedValue({
      data: { id: 123 },
    } as never);
    spyOn(apiClient, 'listProjectFiles').mockResolvedValue({
      data: [{ data: { id: 40, path: 'docs/readme.md' } }],
    } as never);
    spyOn(apiClient, 'downloadProjectFile').mockResolvedValue({
      data: { url: 'https://example.test/readme.md' },
    } as never);
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response('downloaded content'));

    commandContext = {
      ...commandContext,
      optsWithGlobals: () => ({ format: 'json', dest: 'downloads' }),
      args: ['docs/readme.md'],
    } as Command & { args?: string[] };

    await fileCommand.downloadAction(commandContext);

    expect(await Bun.file(join(destinationDir, 'readme.md')).text()).toBe('downloaded content');
  });

  test('deletes matching project file', async () => {
    const fileCommand = createFileCommand();

    spyOn(apiClient, 'getProject').mockResolvedValue({
      data: { id: 123 },
    } as never);
    spyOn(apiClient, 'listProjectFiles').mockResolvedValue({
      data: [{ data: { id: 55, path: '/docs/readme.md' } }],
    } as never);
    const deleteProjectFile = spyOn(apiClient, 'deleteProjectFile').mockResolvedValue(undefined as never);

    commandContext = {
      ...commandContext,
      optsWithGlobals: () => ({ format: 'json' }),
      args: ['docs/readme.md'],
    } as Command & { args?: string[] };

    await fileCommand.deleteAction(commandContext);

    expect(deleteProjectFile).toHaveBeenCalledWith(123, 55);
  });
});

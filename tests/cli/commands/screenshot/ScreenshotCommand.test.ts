import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ScreenshotsModel } from '@crowdin/crowdin-api-client';
import type { BunFile } from 'bun';
import type { Command } from 'commander';
import ScreenshotCommand from '@/cli/commands/screenshot/ScreenshotCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { ProjectService } from '@/cli/services/ProjectService.ts';
import type { ScreenshotService } from '@/cli/services/ScreenshotService.ts';
import type { StorageService } from '@/cli/services/StorageService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

describe('ScreenshotCommand', () => {
  let output: Output;
  let tempDirectory: string;
  let screenshotService: {
    list: ReturnType<typeof mock<ScreenshotService['list']>>;
    findByName: ReturnType<typeof mock<ScreenshotService['findByName']>>;
    get: ReturnType<typeof mock<ScreenshotService['get']>>;
    upload: ReturnType<typeof mock<ScreenshotService['upload']>>;
    update: ReturnType<typeof mock<ScreenshotService['update']>>;
    replaceTags: ReturnType<typeof mock<ScreenshotService['replaceTags']>>;
    delete: ReturnType<typeof mock<ScreenshotService['delete']>>;
    isAutoTagInProgressError: ReturnType<typeof mock<ScreenshotService['isAutoTagInProgressError']>>;
  };
  let projectService: {
    branch: {
      getBranch: ReturnType<typeof mock<ProjectService['branch']['getBranch']>>;
    };
    loadProjectFiles: ReturnType<typeof mock<ProjectService['loadProjectFiles']>>;
    directory: {
      loadProjectDirectories: ReturnType<typeof mock<ProjectService['directory']['loadProjectDirectories']>>;
    };
    label: {
      resolveLabelIds: ReturnType<typeof mock<ProjectService['label']['resolveLabelIds']>>;
    };
  };
  let storageService: {
    addStorage: ReturnType<typeof mock<StorageService['addStorage']>>;
  };
  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    format: 'json',
  };

  const createCommandContext = (
    globalCommandOptions: unknown,
    args: string[] = [],
    commandOptions: unknown = globalCommandOptions,
  ) => {
    return {
      optsWithGlobals: () => globalCommandOptions,
      opts: () => commandOptions,
      args,
      help: mock(() => {}),
    } as unknown as Command;
  };

  const createScreenshotCommand = () => {
    return new ScreenshotCommand(
      () => output,
      async () => screenshotService as unknown as ScreenshotService,
      async () => projectService as unknown as ProjectService,
      async () => storageService as unknown as StorageService,
    );
  };

  const createScreenshot = (id: number, name: string, tagsCount = 0): ScreenshotsModel.Screenshot => ({
    id,
    userId: 1,
    url: `https://example.com/${name}`,
    webUrl: `https://crowdin.com/screenshots/${id}`,
    name,
    size: {
      width: 100,
      height: 100,
    },
    tagsCount,
    tags: [],
    labels: [],
    labelIds: [],
    createdAt: '',
    updatedAt: '',
  });

  beforeEach(async () => {
    output = createOutput(globalOptions);
    tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'screenshot-command-'));

    screenshotService = {
      list: mock(async () => []),
      findByName: mock(async () => null),
      get: mock(async () => null),
      upload: mock(async () => createScreenshot(10, 'screen.png')),
      update: mock(async () => createScreenshot(10, 'screen.png')),
      replaceTags: mock(async () => {}),
      delete: mock(async () => {}),
      isAutoTagInProgressError: mock(() => false),
    };
    projectService = {
      branch: {
        getBranch: mock(async () => undefined),
      },
      loadProjectFiles: mock(
        async (_branchId?: number) =>
          ({
            data: [],
            pagination: {
              offset: 0,
              limit: 25,
            },
          }) as Awaited<ReturnType<ProjectService['loadProjectFiles']>>,
      ),
      directory: {
        loadProjectDirectories: mock(async () => []),
      },
      label: {
        resolveLabelIds: mock(async () => undefined),
      },
    };
    storageService = {
      addStorage: mock(
        async (_file: BunFile) =>
          ({
            data: { id: 44, fileName: 'mock-upload.png' },
          }) as Awaited<ReturnType<StorageService['addStorage']>>,
      ),
    };

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(async () => {
    await rm(tempDirectory, { recursive: true, force: true });
    mock.restore();
  });

  test('defaultAction calls command help', async () => {
    const cmd = createScreenshotCommand();
    const commandContext = createCommandContext(globalOptions);

    await cmd.defaultAction(commandContext);

    expect(commandContext.help).toHaveBeenCalledTimes(1);
  });

  test('listAction prints empty message', async () => {
    const textOutput = createOutput({ ...globalOptions, format: 'text' });
    const successSpy = spyOn(textOutput, 'success');
    const cmd = new ScreenshotCommand(
      () => textOutput,
      async () => screenshotService as unknown as ScreenshotService,
      async () => projectService as unknown as ProjectService,
      async () => storageService as unknown as StorageService,
    );

    await cmd.listAction(createCommandContext({ ...globalOptions, format: 'text' }));

    expect(successSpy).toHaveBeenCalledWith('No screenshot found');
  });

  test('listAction prints screenshot rows', async () => {
    const cmd = createScreenshotCommand();
    screenshotService.list.mockResolvedValue([createScreenshot(1, 'welcome.png', 4)]);

    await cmd.listAction(createCommandContext(globalOptions));

    expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ id: 1, tagsCount: 4, name: 'welcome.png' }], null, 2));
  });

  test('deleteAction validates id', async () => {
    const cmd = createScreenshotCommand();

    expect(cmd.deleteAction(createCommandContext(globalOptions, []))).rejects.toThrow(
      new CliError('Screenshot id can not be empty'),
    );
    expect(cmd.deleteAction(createCommandContext(globalOptions, ['abc']))).rejects.toThrow(
      new CliError('Screenshot id must be numeric'),
    );
  });

  test('deleteAction warns for missing screenshot', async () => {
    const textOutput = createOutput({ ...globalOptions, format: 'text' });
    const warningSpy = spyOn(textOutput, 'warning');
    const cmd = new ScreenshotCommand(
      () => textOutput,
      async () => screenshotService as unknown as ScreenshotService,
      async () => projectService as unknown as ProjectService,
      async () => storageService as unknown as StorageService,
    );

    await cmd.deleteAction(createCommandContext({ ...globalOptions, format: 'text' }, ['101']));

    expect(warningSpy).toHaveBeenCalledWith("Couldn't find screenshot by the specified ID");
    expect(screenshotService.delete).not.toHaveBeenCalled();
  });

  test('deleteAction deletes existing screenshot', async () => {
    const textOutput = createOutput({ ...globalOptions, format: 'text' });
    const successSpy = spyOn(textOutput, 'success');
    const cmd = new ScreenshotCommand(
      () => textOutput,
      async () => screenshotService as unknown as ScreenshotService,
      async () => projectService as unknown as ProjectService,
      async () => storageService as unknown as StorageService,
    );
    screenshotService.get.mockResolvedValue(createScreenshot(12, 'old.png'));

    await cmd.deleteAction(createCommandContext({ ...globalOptions, format: 'text' }, ['12']));

    expect(screenshotService.delete).toHaveBeenCalledWith(12);
    expect(successSpy).toHaveBeenCalledWith("Screenshot '#12 old.png' deleted successfully");
  });

  test('uploadAction validates required file argument', async () => {
    const cmd = createScreenshotCommand();

    expect(cmd.uploadAction(createCommandContext(globalOptions))).rejects.toThrow(
      new CliError('Screenshot file path can not be empty'),
    );
  });

  test('uploadAction validates image extension', async () => {
    const cmd = createScreenshotCommand();
    const localPath = path.join(tempDirectory, 'wrong.txt');
    await writeFile(localPath, 'invalid');

    expect(cmd.uploadAction(createCommandContext(globalOptions, [localPath]))).rejects.toThrow(
      new CliError('Wrong format of the file. Supported formats: jpeg, jpg, png, gif'),
    );
  });

  test('uploadAction validates auto-tag option dependencies', async () => {
    const cmd = createScreenshotCommand();
    const localPath = path.join(tempDirectory, 'welcome.png');
    await writeFile(localPath, 'image');

    expect(
      cmd.uploadAction(createCommandContext({ ...globalOptions, file: '/home/index.ts' }, [localPath])),
    ).rejects.toThrow(new CliError("'--auto-tag' is required for '--file' option"));
    expect(cmd.uploadAction(createCommandContext({ ...globalOptions, branch: 'main' }, [localPath]))).rejects.toThrow(
      new CliError("'--auto-tag' is required for '--branch' option"),
    );
    expect(
      cmd.uploadAction(createCommandContext({ ...globalOptions, directory: '/src' }, [localPath])),
    ).rejects.toThrow(new CliError("'--auto-tag' is required for '--directory' option"));
  });

  test('uploadAction validates mutually exclusive targeting options', async () => {
    const cmd = createScreenshotCommand();
    const localPath = path.join(tempDirectory, 'welcome.png');
    await writeFile(localPath, 'image');

    expect(
      cmd.uploadAction(
        createCommandContext({ ...globalOptions, autoTag: true, file: '/home/index.ts', branch: 'main' }, [localPath]),
      ),
    ).rejects.toThrow(
      new CliError("Only one of the following options can be used at a time: '--file', '--branch' or '--directory'"),
    );
  });

  test('uploadAction updates existing screenshot and replaces tags when auto-tag enabled', async () => {
    const cmd = createScreenshotCommand();
    const localPath = path.join(tempDirectory, 'welcome.png');
    await writeFile(localPath, 'image');
    projectService.branch.getBranch.mockResolvedValue({ id: 9, name: 'main' } as never);
    projectService.loadProjectFiles.mockResolvedValue({
      data: [{ data: { id: 77, path: '/src/app.ts' } }],
    } as never);
    projectService.directory.loadProjectDirectories.mockResolvedValue([{ data: { id: 88, path: '/src' } }] as never);
    screenshotService.findByName.mockResolvedValue(createScreenshot(55, 'welcome.png', 1) as never);
    screenshotService.get.mockResolvedValue(createScreenshot(55, 'welcome.png', 3) as never);

    await cmd.uploadAction(
      createCommandContext({ ...globalOptions, autoTag: true, file: '/src/app.ts', label: ['web'] }, [localPath]),
    );

    expect(projectService.label.resolveLabelIds).toHaveBeenCalledWith(['web']);
    expect(screenshotService.update).toHaveBeenCalledWith(
      55,
      expect.objectContaining({ name: 'welcome.png', storageId: 44 }),
    );
    expect(screenshotService.replaceTags).toHaveBeenCalledWith(
      55,
      expect.objectContaining({ autoTag: true, fileId: 77 }),
    );
    expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ id: 55, tagsCount: 3, name: 'welcome.png' }], null, 2));
  });

  test('uploadAction creates screenshot when no existing one found', async () => {
    const cmd = createScreenshotCommand();
    const localPath = path.join(tempDirectory, 'new.png');
    await writeFile(localPath, 'image');

    await cmd.uploadAction(createCommandContext(globalOptions, [localPath]));

    expect(screenshotService.upload).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'new.png', storageId: 44, autoTag: false }),
    );
    expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ id: 10, tagsCount: 0, name: 'screen.png' }], null, 2));
  });

  test('uploadAction prints warning for auto-tag-in-progress API response', async () => {
    const textOutput = createOutput({ ...globalOptions, format: 'text' });
    const warningSpy = spyOn(textOutput, 'warning');
    const cmd = new ScreenshotCommand(
      () => textOutput,
      async () => screenshotService as unknown as ScreenshotService,
      async () => projectService as unknown as ProjectService,
      async () => storageService as unknown as StorageService,
    );
    const localPath = path.join(tempDirectory, 'new.png');
    await writeFile(localPath, 'image');
    screenshotService.upload.mockRejectedValue(new Error('Auto tag is currently in progress'));
    screenshotService.isAutoTagInProgressError.mockReturnValue(true);

    await cmd.uploadAction(createCommandContext({ ...globalOptions, format: 'text' }, [localPath]));

    expect(warningSpy).toHaveBeenCalledWith(
      'Tags were not applied for new.png because auto tag is currently in progress',
    );
  });

  test('uploadAction validates source file and directory path resolution', async () => {
    const cmd = createScreenshotCommand();
    const localPath = path.join(tempDirectory, 'new.png');
    await writeFile(localPath, 'image');
    projectService.loadProjectFiles.mockResolvedValue({ data: [] } as never);
    projectService.directory.loadProjectDirectories.mockResolvedValue([] as never);

    expect(
      cmd.uploadAction(createCommandContext({ ...globalOptions, autoTag: true, file: '/missing.ts' }, [localPath])),
    ).rejects.toThrow(new CliError("Project doesn't contain the '/missing.ts' file"));
    expect(
      cmd.uploadAction(createCommandContext({ ...globalOptions, autoTag: true, directory: '/missing' }, [localPath])),
    ).rejects.toThrow(new CliError("Project doesn't contain the '/missing' directory"));
  });

  test('uploadAction validates missing branch', async () => {
    const cmd = createScreenshotCommand();
    const localPath = path.join(tempDirectory, 'new.png');
    await writeFile(localPath, 'image');
    projectService.branch.getBranch.mockResolvedValue(undefined);

    expect(
      cmd.uploadAction(createCommandContext({ ...globalOptions, autoTag: true, branch: 'dev' }, [localPath])),
    ).rejects.toThrow(new CliError("Project doesn't contain the 'dev' branch"));
  });

  test('uploadAction rejects directories as file argument', async () => {
    const cmd = createScreenshotCommand();
    const folderPath = path.join(tempDirectory, 'images');
    await mkdir(folderPath);

    expect(cmd.uploadAction(createCommandContext(globalOptions, [folderPath]))).rejects.toThrow(
      new CliError('The specified file is a directory'),
    );
  });
});

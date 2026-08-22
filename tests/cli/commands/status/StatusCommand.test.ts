import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import StatusCommand from '@/cli/commands/status/StatusCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { BranchService } from '@/cli/services/BranchService.ts';
import { DirectoryService } from '@/cli/services/DirectoryService.ts';
import { FileService } from '@/cli/services/FileService.ts';
import { ProgressService } from '@/cli/services/ProgressService.ts';
import { ProjectService } from '@/cli/services/ProjectService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

type StatusTestOptions = GlobalOptions & {
  language?: string;
  branch?: string;
  file?: string;
  directory?: string;
  failIfIncomplete?: boolean;
};

const globalOptions: GlobalOptions = {
  verbose: false,
  config: '',
  colors: false,
  progress: false,
  output: 'json',
};

const createCommandContext = (options: StatusTestOptions) => {
  return {
    optsWithGlobals: () => options,
    args: [],
  } as unknown as Command;
};

const mockProject = {
  data: {
    id: 123,
    targetLanguages: [{ id: 'fr' }, { id: 'de' }],
  },
};

const createProgress = (
  languageId: string,
  translationProgress: number,
  approvalProgress: number,
  wordsTotal: number = 100,
) => {
  return {
    data: {
      languageId,
      translationProgress,
      approvalProgress,
      words: {
        total: wordsTotal,
      },
    },
  };
};

describe('StatusCommand', () => {
  let commandContext: Command;
  let apiClient: Client;
  let output: Output;
  let projectService: ProjectService;
  let branchService: BranchService;
  let directoryService: DirectoryService;
  let fileService: FileService;
  let progressService: ProgressService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    output = createOutput(globalOptions);
    projectService = new ProjectService(apiClient, output, 123);
    branchService = new BranchService(apiClient, 123);
    directoryService = new DirectoryService(apiClient, 123);
    fileService = new FileService(apiClient, output, 123);
    progressService = new ProgressService(apiClient, output, 123);
    commandContext = createCommandContext(globalOptions);

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(Bun.inspect, 'table').mockImplementation(() => '');
  });

  afterEach(() => {
    mock.restore();
  });

  const createStatusCommand = () => {
    return new StatusCommand(
      () => output,
      async () => projectService,
      async () => branchService,
      async () => directoryService,
      async () => fileService,
      async () => progressService,
    );
  };

  test('shows translation and proofreading project progress', async () => {
    const statusCommand = createStatusCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue(mockProject as never);
    spyOn(progressService, 'loadProjectProgress').mockResolvedValue({
      data: [createProgress('fr', 87, 75), createProgress('de', 92, 88)],
    } as never);

    await statusCommand.defaultAction(commandContext);

    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify(
        [
          { language: 'fr', translation: 87, approval: 75 },
          { language: 'de', translation: 92, approval: 88 },
        ],
        null,
        2,
      ),
    );
  });

  // status is the only command that still renders a grid: languages x translated/proofread.
  test('renders the progress grid as a table in text format', async () => {
    output = createOutput({ ...globalOptions, output: 'text' });
    const statusCommand = createStatusCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: { ...mockProject.data, targetLanguages: [{ id: 'fr', name: 'French' }] },
    } as never);
    spyOn(progressService, 'loadProjectProgress').mockResolvedValue({
      data: [createProgress('fr', 87, 75)],
    } as never);

    await statusCommand.defaultAction(createCommandContext({ ...globalOptions, output: 'text' }));

    expect(Bun.inspect.table).toHaveBeenCalledWith(
      {
        'French(fr)': { Translated: '87%', Proofread: '75%' },
      },
      { colors: false },
    );
  });

  test('fails when incomplete with --fail-if-incomplete for translation', async () => {
    const statusCommand = createStatusCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      failIfIncomplete: true,
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(mockProject as never);
    spyOn(progressService, 'loadProjectProgress').mockResolvedValue({
      data: [createProgress('fr', 99, 100)],
    } as never);

    expect(statusCommand.translationStatusAction(commandContext)).rejects.toThrow(
      new CliError('The current project is incomplete'),
    );
  });

  // Java throws at the end of its non-verbose branch, so the progress is on screen before it fails.
  test('prints the progress before failing with --fail-if-incomplete', async () => {
    const statusCommand = createStatusCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue(mockProject as never);
    spyOn(progressService, 'loadProjectProgress').mockResolvedValue({
      data: [createProgress('fr', 99, 100)],
    } as never);

    await expect(
      statusCommand.translationStatusAction(createCommandContext({ ...globalOptions, failIfIncomplete: true })),
    ).rejects.toThrow(new CliError('The current project is incomplete'));

    expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ language: 'fr', translation: 99 }], null, 2));
  });

  // Java StatusAction verbose view: word and phrase counts per language, rendered as a wider grid.
  test('renders per-language detail with --verbose', async () => {
    output = createOutput({ ...globalOptions, output: 'text' });
    const statusCommand = createStatusCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: { ...mockProject.data, targetLanguages: [{ id: 'fr', name: 'French' }] },
    } as never);
    spyOn(progressService, 'loadProjectProgress').mockResolvedValue({
      data: [
        {
          data: {
            languageId: 'fr',
            translationProgress: 87,
            approvalProgress: 75,
            words: { total: 138, translated: 120, approved: 103 },
            phrases: { total: 34, translated: 30, approved: 26 },
          },
        },
      ],
    } as never);

    await statusCommand.defaultAction(createCommandContext({ ...globalOptions, output: 'text', verbose: true }));

    expect(Bun.inspect.table).toHaveBeenCalledWith(
      {
        'French(fr)': {
          Translated: '87%',
          'Translated words': '120/138',
          'Translated phrases': '30/34',
          Proofread: '75%',
          'Proofread words': '103/138',
          'Proofread phrases': '26/34',
        },
      },
      { colors: false },
    );
  });

  test('adds a section per count with --verbose in plain', async () => {
    output = createOutput({ ...globalOptions, output: 'plain' });
    const statusCommand = createStatusCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: { ...mockProject.data, targetLanguages: [{ id: 'fr', name: 'French' }] },
    } as never);
    spyOn(progressService, 'loadProjectProgress').mockResolvedValue({
      data: [createProgress('fr', 87, 75)],
    } as never);

    await statusCommand.defaultAction(createCommandContext({ ...globalOptions, output: 'plain', verbose: true }));

    // The block is one write: item() renders the whole view in a single line-joined string.
    expect(console.log).toHaveBeenCalledWith(
      'Translated:\nfr 87\n' +
        'Translated words:\nfr 0/100\n' +
        'Translated phrases:\nfr 0/0\n' +
        'Proofread:\nfr 75\n' +
        'Proofread words:\nfr 0/100\n' +
        'Proofread phrases:\nfr 0/0',
    );
    expect(Bun.inspect.table).not.toHaveBeenCalled();
  });

  test('still fails with --fail-if-incomplete when verbose', async () => {
    const statusCommand = createStatusCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue(mockProject as never);
    spyOn(progressService, 'loadProjectProgress').mockResolvedValue({
      data: [createProgress('fr', 99, 100)],
    } as never);

    await expect(
      statusCommand.translationStatusAction(
        createCommandContext({ ...globalOptions, verbose: true, failIfIncomplete: true }),
      ),
    ).rejects.toThrow(new CliError('The current project is incomplete'));
  });

  // Same entry per language either way; verbose only widens it with count columns.
  test('adds the count columns in structured formats when verbose', async () => {
    const statusCommand = createStatusCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue(mockProject as never);
    spyOn(progressService, 'loadProjectProgress').mockResolvedValue({
      data: [createProgress('fr', 87, 75)],
    } as never);

    await statusCommand.defaultAction(createCommandContext({ ...globalOptions, verbose: true }));

    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify(
        [
          {
            language: 'fr',
            translation: 87,
            approval: 75,
            translatedWords: 0,
            approvedWords: 0,
            totalWords: 100,
            translatedPhrases: 0,
            approvedPhrases: 0,
            totalPhrases: 0,
          },
        ],
        null,
        2,
      ),
    );
  });

  test('treats zero words as complete', async () => {
    const statusCommand = createStatusCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      failIfIncomplete: true,
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(mockProject as never);
    spyOn(progressService, 'loadProjectProgress').mockResolvedValue({
      data: [createProgress('fr', 0, 0, 0)],
    } as never);

    await statusCommand.proofreadingStatusAction(commandContext);
  });

  test('loads branch progress when --branch is passed', async () => {
    const statusCommand = createStatusCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      branch: 'release',
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(mockProject as never);
    const loadProjectBranches = spyOn(branchService, 'list').mockResolvedValue([{ id: 15, name: 'release' }] as never);
    const loadBranchProgress = spyOn(progressService, 'loadBranchProgress').mockResolvedValue({
      data: [createProgress('fr', 100, 100)],
    } as never);

    await statusCommand.defaultAction(commandContext);

    expect(loadProjectBranches).toHaveBeenCalledTimes(1);
    expect(loadBranchProgress).toHaveBeenCalledWith(15);
  });

  test('loads file progress when --file is passed', async () => {
    const statusCommand = createStatusCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      file: 'docs/readme.md',
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(mockProject as never);
    spyOn(fileService, 'loadProjectFiles').mockResolvedValue({
      data: [{ data: { id: 33, path: '/docs/readme.md' } }],
    } as never);
    const loadFileProgress = spyOn(progressService, 'loadFileProgress').mockResolvedValue({
      data: [createProgress('fr', 100, 100)],
    } as never);

    await statusCommand.defaultAction(commandContext);

    expect(loadFileProgress).toHaveBeenCalledWith(33);
  });

  // Server paths carry the branch name, '--file' never does.
  test('resolves --file inside the branch named by --branch', async () => {
    const statusCommand = createStatusCommand();
    commandContext = createCommandContext({ ...globalOptions, file: 'docs/readme.md', branch: 'feature' });

    spyOn(projectService, 'loadProject').mockResolvedValue(mockProject as never);
    spyOn(branchService, 'list').mockResolvedValue([{ id: 7, name: 'feature' }] as never);
    const loadProjectFiles = spyOn(fileService, 'loadProjectFiles').mockResolvedValue({
      data: [{ data: { id: 44, path: '/feature/docs/readme.md' } }],
    } as never);
    const loadFileProgress = spyOn(progressService, 'loadFileProgress').mockResolvedValue({
      data: [createProgress('fr', 100, 100)],
    } as never);

    await statusCommand.defaultAction(commandContext);

    expect(loadProjectFiles).toHaveBeenCalledWith(7);
    expect(loadFileProgress).toHaveBeenCalledWith(44);
  });

  test('rejects a branch-prefixed --file when no --branch is given', async () => {
    const statusCommand = createStatusCommand();
    commandContext = createCommandContext({ ...globalOptions, file: 'feature/docs/readme.md' });

    spyOn(projectService, 'loadProject').mockResolvedValue(mockProject as never);
    spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
      data: [{ data: { id: 44, path: '/feature/docs/readme.md', branchId: 7 } }],
    } as never);

    expect(statusCommand.defaultAction(commandContext)).rejects.toThrow(
      new CliError("Project doesn't contain the 'feature/docs/readme.md' file"),
    );
  });

  test('rejects when both --file and --directory are passed', async () => {
    const statusCommand = createStatusCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      file: 'docs/readme.md',
      directory: 'docs',
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(mockProject as never);

    expect(statusCommand.defaultAction(commandContext)).rejects.toThrow(
      new CliError("Only one of the following options can be used at a time: '--file', '--directory'"),
    );
  });
});

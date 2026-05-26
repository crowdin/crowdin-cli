import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import StatusCommand from '@/cli/commands/status/StatusCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
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
  format: 'json',
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
    targetLanguages: [
      { id: 'fr' },
      { id: 'de' },
    ],
  },
};

const createProgress = (languageId: string, translationProgress: number, approvalProgress: number, wordsTotal: number = 100) => {
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

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    output = createOutput(globalOptions);
    projectService = new ProjectService(apiClient, output, 123);
    commandContext = createCommandContext(globalOptions);

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
  });

  const createStatusCommand = () => {
    return new StatusCommand(
      () => output,
      async () => projectService,
    );
  };

  test('shows translation and proofreading project progress', async () => {
    const statusCommand = createStatusCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue(mockProject as never);
    spyOn(projectService.progress, 'loadProjectProgress').mockResolvedValue({
      data: [
        createProgress('fr', 87, 75),
        createProgress('de', 92, 88),
      ],
    } as never);

    await statusCommand.defaultAction(commandContext);

    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify(
        {
          translation: {
            fr: '87%',
            de: '92%',
          },
          proofread: {
            fr: '75%',
            de: '88%',
          },
        },
        null,
        2,
      ),
    );
  });

  test('fails when incomplete with --fail-if-incomplete for translation', async () => {
    const statusCommand = createStatusCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      failIfIncomplete: true,
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(mockProject as never);
    spyOn(projectService.progress, 'loadProjectProgress').mockResolvedValue({
      data: [createProgress('fr', 99, 100)],
    } as never);

    expect(statusCommand.translationStatusAction(commandContext)).rejects.toThrow(
      new CliError('The current project is incomplete'),
    );
  });

  test('treats zero words as complete', async () => {
    const statusCommand = createStatusCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      failIfIncomplete: true,
    });

    spyOn(projectService, 'loadProject').mockResolvedValue(mockProject as never);
    spyOn(projectService.progress, 'loadProjectProgress').mockResolvedValue({
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
    const loadProjectBranches = spyOn(projectService, 'loadProjectBranches').mockResolvedValue([
      { data: { id: 15, name: 'release' } },
    ] as never);
    const loadBranchProgress = spyOn(projectService.progress, 'loadBranchProgress').mockResolvedValue({
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
    spyOn(projectService, 'loadProjectFiles').mockResolvedValue({
      data: [{ data: { id: 33, path: '/docs/readme.md' } }],
    } as never);
    const loadFileProgress = spyOn(projectService.progress, 'loadFileProgress').mockResolvedValue({
      data: [createProgress('fr', 100, 100)],
    } as never);

    await statusCommand.defaultAction(commandContext);

    expect(loadFileProgress).toHaveBeenCalledWith(33);
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

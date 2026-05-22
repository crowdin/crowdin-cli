import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { Command } from 'commander';
import ProjectCommand from '../../../../src-next/cli/commands/project/ProjectCommand.ts';
import CliError from '../../../../src-next/cli/errors/CliError.ts';
import type { GlobalOptions } from '../../../../src-next/cli/options.ts';
import { ProjectService } from '../../../../src-next/cli/services/ProjectService.ts';
import { createOutput, type Output } from '../../../../src-next/cli/utils/output.ts';
import Client from '../../../../src-next/lib/api/client.ts';
import type { Config } from '../../../../src-next/lib/config.ts';

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

describe('ProjectCommand', () => {
  let commandContext: Command & { args?: string[] };
  let apiClient: Client;
  let output: Output;
  let projectService: ProjectService;
  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    format: 'json',
  };

  const createCommandContext = (options: unknown, args: string[] = []) => {
    return {
      optsWithGlobals: () => options,
      args,
    } as unknown as Command & { args?: string[] };
  };

  beforeEach(() => {
    apiClient = new Client({ token: config.apiToken });
    output = createOutput(globalOptions);
    projectService = new ProjectService(apiClient, output, config.projectId);
    commandContext = createCommandContext(globalOptions);

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
    spyOn(Bun, 'spawn').mockImplementation(() => ({}) as never);
  });

  afterEach(() => {
    mock.restore();
  });

  const createProjectCommand = () => {
    return new ProjectCommand(
      () => output,
      async () => projectService,
      async () => apiClient,
    );
  };

  test('delegates default action to command help', async () => {
    const projectCommand = createProjectCommand();
    const help = mock(() => {});
    const helpCommand = { help, optsWithGlobals: () => ({}) } as unknown as Command;

    await projectCommand.defaultAction(helpCommand);

    expect(help).toHaveBeenCalledTimes(1);
  });

  test('opens current project in browser', async () => {
    const projectCommand = createProjectCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: { id: 123, webUrl: 'https://crowdin.com/project/demo' },
    } as never);

    await projectCommand.browseAction(commandContext);

    expect(Bun.spawn).toHaveBeenCalledWith(['open', 'https://crowdin.com/project/demo']);
  });

  test('lists projects with manager access', async () => {
    const projectCommand = createProjectCommand();

    spyOn(apiClient, 'listProjects').mockResolvedValue({
      data: [{ data: { id: 1, name: 'Docs' } }, { data: { id: 2, name: 'Website' } }],
    } as never);

    await projectCommand.listAction(commandContext);

    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify(
        [
          { id: 1, name: 'Docs' },
          { id: 2, name: 'Website' },
        ],
        null,
        2,
      ),
    );
  });

  test('adds project with requested options', async () => {
    const projectCommand = createProjectCommand();
    const addProject = spyOn(apiClient, 'addProject').mockResolvedValue({
      data: { id: 77, name: 'New Project' },
    } as never);

    commandContext = createCommandContext(
      {
        ...globalOptions,
        sourceLanguage: 'uk',
        language: ['fr', 'de'],
        public: true,
        stringBased: true,
      },
      ['New Project'],
    );

    await projectCommand.addAction(commandContext);

    expect(addProject).toHaveBeenCalledWith('New Project', 'uk', ['fr', 'de'], 'open', true);
    expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ id: 77, name: 'New Project' }], null, 2));
  });

  test('requires project name', async () => {
    const projectCommand = createProjectCommand();

    commandContext = createCommandContext(globalOptions);

    expect(projectCommand.addAction(commandContext)).rejects.toThrow(
      new CliError('Project name is required'),
    );
  });
});

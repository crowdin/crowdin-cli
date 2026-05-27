import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import DistributionCommand from '@/cli/commands/distribution/DistributionCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { ProjectService } from '@/cli/services/ProjectService.ts';
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

describe('DistributionCommand', () => {
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

  type DistributionTestOptions = GlobalOptions & {
    name?: string;
    bundleId?: number | string | Array<number | string>;
  };

  const createCommandContext = (options: DistributionTestOptions, args: string[] = []) => {
    return {
      optsWithGlobals: () => options,
      args,
    } as unknown as Command & { args?: string[] };
  };

  const createDistributionCommand = () => {
    return new DistributionCommand(
      () => output,
      async () => projectService,
      async () => apiClient,
    );
  };

  beforeEach(() => {
    apiClient = new Client({ token: config.apiToken });
    output = createOutput(globalOptions);
    projectService = new ProjectService(apiClient, output, config.projectId);
    commandContext = createCommandContext(globalOptions);

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
    spyOn(Bun, 'sleep').mockResolvedValue(undefined);
  });

  afterEach(() => {
    mock.restore();
  });

  test('delegates default action to command help', async () => {
    const distributionCommand = createDistributionCommand();
    const help = mock(() => {});
    const helpCommand = { help, optsWithGlobals: () => ({}) } as unknown as Command;

    await distributionCommand.defaultAction(helpCommand);

    expect(help).toHaveBeenCalledTimes(1);
  });

  test('does not include deprecated distribution options', () => {
    const distributionCommand = createDistributionCommand();
    const definition = distributionCommand.getDefinition();
    const addSubcommand = definition.subcommands?.find((subcommand) => subcommand.name === 'add');
    const editSubcommand = definition.subcommands?.find((subcommand) => subcommand.name === 'edit');
    const addOptionNames = (addSubcommand?.options ?? [])
      .filter((option) => 'name' in option)
      .map((option) => option.name);
    const editOptionNames = (editSubcommand?.options ?? [])
      .filter((option) => 'name' in option)
      .map((option) => option.name);

    expect(addOptionNames).not.toContain('export-mode');
    expect(addOptionNames).not.toContain('file');
    expect(editOptionNames).not.toContain('export-mode');
    expect(editOptionNames).not.toContain('file');
  });

  test('lists distributions', async () => {
    const distributionCommand = createDistributionCommand();
    const outputLog = spyOn(output, 'log').mockImplementation(() => {});

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: { id: 123 },
    } as never);
    spyOn(apiClient.distributionsApi, 'listDistributions').mockResolvedValue({
      data: [
        { data: { hash: 'hash-1', name: 'https://demo.zrok.crowdbox.in/' } },
        { data: { hash: 'hash-2', name: 'https://demo.zrok.crowdbox.in/' } },
      ],
    } as never);

    await distributionCommand.listAction(commandContext);

    expect(outputLog).toHaveBeenCalledWith(
      'hash-1 https://demo.zrok.crowdbox.in/\nhash-2 https://demo.zrok.crowdbox.in/',
    );
  });

  test('adds distribution with bundle IDs', async () => {
    const distributionCommand = createDistributionCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: { id: 123 },
    } as never);
    const createDistribution = spyOn(apiClient.distributionsApi, 'createDistribution').mockResolvedValue({
      data: { hash: 'hash-1', name: 'CDN', exportMode: 'bundle' },
    } as never);

    commandContext = createCommandContext(
      {
        ...globalOptions,
        bundleId: ['4', '7'],
      },
      ['CDN'],
    );

    await distributionCommand.addAction(commandContext);

    expect(createDistribution).toHaveBeenCalledWith(123, {
      name: 'CDN',
      bundleIds: [4, 7],
    });
    expect(console.log).toHaveBeenCalledWith('hash-1 CDN');
  });

  test('requires bundle IDs for add action', async () => {
    const distributionCommand = createDistributionCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: { id: 123 },
    } as never);
    commandContext = createCommandContext(globalOptions, ['CDN']);

    expect(distributionCommand.addAction(commandContext)).rejects.toThrow(
      new CliError('Bundle IDs are required. Use --bundle-id <id> (can be specified multiple times)'),
    );
  });

  test('requires at least one edit option', async () => {
    const distributionCommand = createDistributionCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: { id: 123 },
    } as never);

    commandContext = createCommandContext(globalOptions, ['hash-1']);

    expect(distributionCommand.editAction(commandContext)).rejects.toThrow(
      new CliError('Nothing to edit. Specify at least one option: --name, --bundle-id'),
    );
  });

  test('edits distribution name and bundle IDs', async () => {
    const distributionCommand = createDistributionCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: { id: 123 },
    } as never);
    spyOn(apiClient.distributionsApi, 'listDistributions').mockResolvedValue({
      data: [{ data: { hash: 'hash-1', name: 'Old' } }],
    } as never);
    const editDistribution = spyOn(apiClient.distributionsApi, 'editDistribution').mockResolvedValue({
      data: { hash: 'hash-1', name: 'New', exportMode: 'bundle' },
    } as never);

    commandContext = createCommandContext(
      {
        ...globalOptions,
        name: 'New',
        bundleId: ['8', '9'],
      },
      ['hash-1'],
    );

    await distributionCommand.editAction(commandContext);

    expect(editDistribution).toHaveBeenCalledWith(123, 'hash-1', [
      { op: 'replace', path: '/name', value: 'New' },
      { op: 'replace', path: '/bundleIds', value: [8, 9] },
    ]);
  });

  test('releases distribution and polls until success', async () => {
    const distributionCommand = createDistributionCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: { id: 123 },
    } as never);
    spyOn(apiClient.distributionsApi, 'listDistributions').mockResolvedValue({
      data: [{ data: { hash: 'hash-1', name: 'CDN' } }],
    } as never);
    const createDistributionRelease = spyOn(
      apiClient.distributionsApi,
      'createDistributionRelease',
    ).mockResolvedValue({
      data: { status: 'inProgress', progress: 20 },
    } as never);
    const getDistributionRelease = spyOn(
      apiClient.distributionsApi,
      'getDistributionRelease',
    ).mockResolvedValue({
      data: { status: 'success', progress: 100 },
    } as never);

    commandContext = createCommandContext(globalOptions, ['hash-1']);

    await distributionCommand.releaseAction(commandContext);

    expect(createDistributionRelease).toHaveBeenCalledWith(123, 'hash-1');
    expect(getDistributionRelease).toHaveBeenCalledWith(123, 'hash-1');
    expect(Bun.sleep).toHaveBeenCalledWith(1000);
  });
});

import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { DistributionsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import DistributionCommand from '@/cli/commands/distribution/DistributionCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { DistributionService, DistributionView } from '@/cli/services/DistributionService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

describe('DistributionCommand', () => {
  let output: Output;
  let distributionService: {
    list: ReturnType<typeof mock<DistributionService['list']>>;
    add: ReturnType<typeof mock<DistributionService['add']>>;
    edit: ReturnType<typeof mock<DistributionService['edit']>>;
    getByHash: ReturnType<typeof mock<DistributionService['getByHash']>>;
    startRelease: ReturnType<typeof mock<DistributionService['startRelease']>>;
    getReleaseStatus: ReturnType<typeof mock<DistributionService['getReleaseStatus']>>;
  };
  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    output: 'json',
  };

  type DistributionTestOptions = GlobalOptions & {
    name?: string;
    bundleId?: number | string | Array<number | string>;
  };

  const createCommandContext = (options: DistributionTestOptions, args: string[] = []) => {
    return {
      optsWithGlobals: () => options,
      args,
    } as unknown as Command;
  };

  const createDistribution = (overrides: Partial<DistributionView> = {}): DistributionView =>
    ({ hash: 'hash-1', name: 'CDN', exportMode: 'bundle', ...overrides }) as DistributionView;

  const createDistributionCommand = () => {
    return new DistributionCommand(
      () => output,
      async () => distributionService as unknown as DistributionService,
    );
  };

  beforeEach(() => {
    output = createOutput(globalOptions);
    distributionService = {
      list: mock(async () => [] as DistributionsModel.Distribution[]),
      add: mock(async () => createDistribution()),
      edit: mock(async () => createDistribution()),
      getByHash: mock(async () => createDistribution()),
      startRelease: mock(async () => ({ status: 'success', progress: 100 })),
      getReleaseStatus: mock(async () => ({ status: 'success', progress: 100 })),
    };

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
    distributionService.list.mockResolvedValue([
      createDistribution({ hash: 'hash-1', name: 'CDN one' }),
      createDistribution({ hash: 'hash-2', name: 'CDN two' }),
    ]);

    await distributionCommand.listAction(createCommandContext(globalOptions));

    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify(
        [
          { hash: 'hash-1', name: 'CDN one' },
          { hash: 'hash-2', name: 'CDN two' },
        ],
        null,
        2,
      ),
    );
  });

  test('adds distribution with bundle IDs', async () => {
    const distributionCommand = createDistributionCommand();
    distributionService.add.mockResolvedValue(createDistribution({ hash: 'hash-1', name: 'CDN' }));
    const commandContext = createCommandContext({ ...globalOptions, bundleId: ['4', '7'] }, ['CDN']);

    await distributionCommand.addAction(commandContext);

    expect(distributionService.add).toHaveBeenCalledWith('CDN', [4, 7]);
    expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ hash: 'hash-1', name: 'CDN' }], null, 2));
  });

  test('requires bundle IDs for add action', async () => {
    const distributionCommand = createDistributionCommand();
    const commandContext = createCommandContext(globalOptions, ['CDN']);

    expect(distributionCommand.addAction(commandContext)).rejects.toThrow(
      new CliError('Bundle IDs are required. Use --bundle-id <id> (can be specified multiple times)'),
    );
  });

  test('requires at least one edit option', async () => {
    const distributionCommand = createDistributionCommand();
    const commandContext = createCommandContext(globalOptions, ['hash-1']);

    expect(distributionCommand.editAction(commandContext)).rejects.toThrow(
      new CliError('Nothing to edit. Specify at least one option: --name, --bundle-id'),
    );
  });

  test('edits distribution name and bundle IDs', async () => {
    const distributionCommand = createDistributionCommand();
    distributionService.edit.mockResolvedValue(createDistribution({ hash: 'hash-1', name: 'New' }));
    const commandContext = createCommandContext({ ...globalOptions, name: 'New', bundleId: ['8', '9'] }, ['hash-1']);

    await distributionCommand.editAction(commandContext);

    expect(distributionService.edit).toHaveBeenCalledWith('hash-1', [
      { op: 'replace', path: '/name', value: 'New' },
      { op: 'replace', path: '/bundleIds', value: [8, 9] },
    ]);
  });

  test('releases distribution and polls until success', async () => {
    const distributionCommand = createDistributionCommand();
    distributionService.startRelease.mockResolvedValue({ status: 'inProgress', progress: 20 });
    distributionService.getReleaseStatus.mockResolvedValue({ status: 'success', progress: 100 });
    const commandContext = createCommandContext(globalOptions, ['hash-1']);

    await distributionCommand.releaseAction(commandContext);

    expect(distributionService.startRelease).toHaveBeenCalledWith('hash-1');
    expect(distributionService.getReleaseStatus).toHaveBeenCalledWith('hash-1');
    expect(Bun.sleep).toHaveBeenCalledWith(1000);
  });
});

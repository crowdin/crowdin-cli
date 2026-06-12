import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { ApplicationsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import AppCommand from '@/cli/commands/app/AppCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { AppService } from '@/cli/services/AppService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

describe('AppCommand', () => {
  let output: Output;
  let appService: {
    list: ReturnType<typeof mock<AppService['list']>>;
    findManifestUrl: ReturnType<typeof mock<AppService['findManifestUrl']>>;
    installByManifestUrl: ReturnType<typeof mock<AppService['installByManifestUrl']>>;
    uninstall: ReturnType<typeof mock<AppService['uninstall']>>;
  };

  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    output: 'json',
  };

  const createCommandContext = (globalCommandOptions: unknown, args: string[] = []) => {
    return {
      optsWithGlobals: () => globalCommandOptions,
      opts: () => ({}),
      args,
      help: mock(() => {}),
    } as unknown as Command;
  };

  const createAppCommand = () => {
    return new AppCommand(
      () => output,
      async () => appService as unknown as AppService,
    );
  };

  const createApp = (overrides: Partial<ApplicationsModel.Application>): ApplicationsModel.Application => ({
    identifier: 'test-app',
    name: 'Test App',
    description: '',
    logo: '',
    baseUrl: '',
    manifestUrl: 'https://example.com/manifest.json',
    createdAt: '',
    modules: [],
    scopes: [],
    permissions: {
      user: { value: 'all', ids: [] },
      project: { value: 'own', ids: [] },
    },
    defaultPermissions: {},
    limitReached: false,
    ...overrides,
  });

  beforeEach(() => {
    output = createOutput(globalOptions);
    appService = {
      list: mock(async () => []),
      findManifestUrl: mock(async () => null),
      installByManifestUrl: mock(async () => {}),
      uninstall: mock(async () => {}),
    };

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
  });

  test('defaultAction calls command help', async () => {
    const cmd = createAppCommand();
    const commandContext = createCommandContext(globalOptions);

    await cmd.defaultAction(commandContext);

    expect(commandContext.help).toHaveBeenCalledTimes(1);
  });

  test('listAction prints no applications message', async () => {
    const textOutput = createOutput({ ...globalOptions, output: 'text' });
    const successSpy = spyOn(textOutput, 'success');
    const cmd = new AppCommand(
      () => textOutput,
      async () => appService as unknown as AppService,
    );

    await cmd.listAction(createCommandContext({ ...globalOptions, output: 'text' }));

    expect(successSpy).toHaveBeenCalledWith('No applications found');
  });

  test('listAction prints text output rows in text format', async () => {
    const textOutput = createOutput({ ...globalOptions, output: 'text' });
    const cmd = new AppCommand(
      () => textOutput,
      async () => appService as unknown as AppService,
    );
    appService.list.mockResolvedValue([
      createApp({ identifier: 'github', name: 'GitHub' }),
      createApp({ identifier: 'slack', name: 'Slack' }),
    ]);

    await cmd.listAction(createCommandContext({ ...globalOptions, output: 'text' }));

    expect(console.table).toHaveBeenCalledTimes(1);
    expect(console.table).toHaveBeenCalledWith(
      [
        { identifier: 'github', name: 'GitHub' },
        { identifier: 'slack', name: 'Slack' },
      ],
      ['identifier', 'name'],
    );
  });

  test('listAction prints JSON output rows in non-text format', async () => {
    const cmd = createAppCommand();
    appService.list.mockResolvedValue([createApp({ identifier: 'github', name: 'GitHub' })]);

    await cmd.listAction(createCommandContext({ ...globalOptions, output: 'json' }));

    expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ identifier: 'github', name: 'GitHub' }], null, 2));
  });

  test('installAction validates identifier', async () => {
    const cmd = createAppCommand();

    expect(cmd.installAction(createCommandContext(globalOptions))).rejects.toThrow(
      new CliError('Application identifier can not be empty'),
    );
  });

  test('installAction throws not found when manifest is missing', async () => {
    const cmd = createAppCommand();
    appService.findManifestUrl.mockResolvedValue(null);

    expect(cmd.installAction(createCommandContext(globalOptions, ['unknown-app']))).rejects.toThrow(
      new CliError("Application with identifier 'unknown-app' doesn't exist in Crowdin Store"),
    );
  });

  test('installAction installs app by manifest URL', async () => {
    const textOutput = createOutput({ ...globalOptions, output: 'text' });
    const successSpy = spyOn(textOutput, 'success');
    const cmd = new AppCommand(
      () => textOutput,
      async () => appService as unknown as AppService,
    );
    appService.findManifestUrl.mockResolvedValue('https://example.com/manifest.json');

    await cmd.installAction(createCommandContext({ ...globalOptions, output: 'text' }, ['github']));

    expect(appService.findManifestUrl).toHaveBeenCalledWith('github');
    expect(appService.installByManifestUrl).toHaveBeenCalledWith('https://example.com/manifest.json');
    expect(successSpy).toHaveBeenCalledWith('Application github has been installed');
  });

  test('uninstallAction validates identifier', async () => {
    const cmd = createAppCommand();

    expect(cmd.uninstallAction(createCommandContext(globalOptions))).rejects.toThrow(
      new CliError('Application identifier can not be empty'),
    );
  });

  test('uninstallAction uninstalls app without force by default', async () => {
    const textOutput = createOutput({ ...globalOptions, output: 'text' });
    const successSpy = spyOn(textOutput, 'success');
    const cmd = new AppCommand(
      () => textOutput,
      async () => appService as unknown as AppService,
    );

    await cmd.uninstallAction(createCommandContext({ ...globalOptions, output: 'text' }, ['github']));

    expect(appService.uninstall).toHaveBeenCalledWith('github', false);
    expect(successSpy).toHaveBeenCalledWith('Application github has been uninstalled');
  });

  test('uninstallAction uninstalls app with --force', async () => {
    const cmd = createAppCommand();

    await cmd.uninstallAction(createCommandContext({ ...globalOptions, force: true }, ['github']));

    expect(appService.uninstall).toHaveBeenCalledWith('github', true);
  });
});

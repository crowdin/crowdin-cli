import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import os from 'node:os';
import type { Command } from 'commander';
import BundleCommand from '@/cli/commands/bundle/BundleCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { BundleService, BundleView } from '@/cli/services/BundleService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

describe('BundleCommand', () => {
  let output: Output;
  let bundleService: {
    list: ReturnType<typeof mock<BundleService['list']>>;
    add: ReturnType<typeof mock<BundleService['add']>>;
    get: ReturnType<typeof mock<BundleService['get']>>;
    delete: ReturnType<typeof mock<BundleService['delete']>>;
    getBundleUrl: ReturnType<typeof mock<BundleService['getBundleUrl']>>;
  };
  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    output: 'json',
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

  const createBundleCommand = () => {
    return new BundleCommand(
      () => output,
      async () => bundleService as unknown as BundleService,
    );
  };

  const createBundleView = (overrides: Partial<BundleView>): BundleView => ({
    id: 1,
    name: 'bundle',
    format: 'json',
    sourcePatterns: ['/src/**'],
    ignorePatterns: [],
    exportPattern: '/%locale%/app.json',
    isMultilingual: false,
    includeProjectSourceLanguage: false,
    labelIds: [],
    excludeLabelIds: [],
    createdAt: '',
    webUrl: '',
    updatedAt: '',
    ...overrides,
  });

  beforeEach(() => {
    output = createOutput(globalOptions);
    bundleService = {
      list: mock(async () => []),
      add: mock(async () => createBundleView({ id: 10, exportPattern: '/%two_letters_code%/a.json' })),
      get: mock(async () => null),
      delete: mock(async () => {}),
      getBundleUrl: mock(async () => 'https://crowdin.com/project/demo/bundles/10'),
    };

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
    spyOn(Bun, 'spawn').mockImplementation(() => ({}) as never);
  });

  afterEach(() => {
    mock.restore();
  });

  test('defaultAction calls command help', async () => {
    const cmd = createBundleCommand();
    const commandContext = createCommandContext(globalOptions);

    await cmd.defaultAction(commandContext);

    expect(commandContext.help).toHaveBeenCalledTimes(1);
  });

  describe('listAction', () => {
    test('prints empty message when no bundles found', async () => {
      const textOutput = createOutput({ ...globalOptions, output: 'text' });
      const successSpy = spyOn(textOutput, 'success');
      const cmd = new BundleCommand(
        () => textOutput,
        async () => bundleService as unknown as BundleService,
      );

      await cmd.listAction(createCommandContext({ ...globalOptions, output: 'text' }));

      expect(successSpy).toHaveBeenCalledWith('No bundles found');
    });

    test('prints bundle list', async () => {
      const cmd = createBundleCommand();
      bundleService.list.mockResolvedValue([
        createBundleView({ id: 1, name: 'App', format: 'json', exportPattern: '/%locale%/app.json' }),
      ]);

      await cmd.listAction(createCommandContext(globalOptions));

      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify([{ id: 1, format: 'json', translation: '/%locale%/app.json', name: 'App' }], null, 2),
      );
    });
  });

  describe('addAction', () => {
    test('requires bundle name argument', async () => {
      const cmd = createBundleCommand();

      expect(cmd.addAction(createCommandContext(globalOptions, []))).rejects.toThrow(
        new CliError("Bundle name can't be empty"),
      );
    });

    test('validates required options', async () => {
      const cmd = createBundleCommand();

      expect(cmd.addAction(createCommandContext(globalOptions, ['bundle'], {}))).rejects.toThrow(
        new CliError("'--format' can't be empty"),
      );
      expect(cmd.addAction(createCommandContext(globalOptions, ['bundle'], { fileFormat: 'json' }))).rejects.toThrow(
        new CliError("'--source' can't be empty"),
      );
      expect(
        cmd.addAction(createCommandContext(globalOptions, ['bundle'], { fileFormat: 'json', source: ['/src/**'] })),
      ).rejects.toThrow(new CliError("'--translation' can't be empty"));
    });

    test('adds bundle with provided options', async () => {
      const cmd = createBundleCommand();
      const context = createCommandContext(globalOptions, ['bundle'], {
        fileFormat: 'json',
        source: ['/src/**'],
        ignore: ['/src/tmp/**'],
        translation: '/%two_letters_code%/app.json',
        label: [7],
        includeSourceLanguage: true,
        includePseudoLanguage: false,
        multilingual: true,
      });

      await cmd.addAction(context);

      expect(bundleService.add).toHaveBeenCalledWith({
        name: 'bundle',
        format: 'json',
        sourcePatterns: ['/src/**'],
        ignorePatterns: ['/src/tmp/**'],
        exportPattern: '/%two_letters_code%/app.json',
        labelIds: [7],
        includeProjectSourceLanguage: true,
        includeInContextPseudoLanguage: false,
        isMultilingual: true,
      });
    });
  });

  describe('deleteAction', () => {
    test('validates id argument', async () => {
      const cmd = createBundleCommand();

      expect(cmd.deleteAction(createCommandContext(globalOptions, []))).rejects.toThrow(
        new CliError('Bundle id can not be empty'),
      );
      expect(cmd.deleteAction(createCommandContext(globalOptions, ['abc']))).rejects.toThrow(
        new CliError('Bundle id must be numeric'),
      );
    });

    test('warns when bundle not found', async () => {
      const textOutput = createOutput({ ...globalOptions, output: 'text' });
      const warningSpy = spyOn(textOutput, 'warning');
      const cmd = new BundleCommand(
        () => textOutput,
        async () => bundleService as unknown as BundleService,
      );
      bundleService.get.mockResolvedValue(null);

      await cmd.deleteAction(createCommandContext({ ...globalOptions, output: 'text' }, ['1']));

      expect(warningSpy).toHaveBeenCalledWith("Couldn't find bundle by the specified ID");
      expect(bundleService.delete).not.toHaveBeenCalled();
    });

    test('deletes existing bundle', async () => {
      const textOutput = createOutput({ ...globalOptions, output: 'text' });
      const successSpy = spyOn(textOutput, 'success');
      const cmd = new BundleCommand(
        () => textOutput,
        async () => bundleService as unknown as BundleService,
      );
      bundleService.get.mockResolvedValue(createBundleView({ id: 1, name: 'bundle' }));

      await cmd.deleteAction(createCommandContext({ ...globalOptions, output: 'text' }, ['1']));

      expect(bundleService.delete).toHaveBeenCalledWith(1);
      expect(successSpy).toHaveBeenCalledWith('Bundle #1 deleted');
    });
  });

  describe('cloneAction', () => {
    test('skips clone when source bundle is missing', async () => {
      const textOutput = createOutput({ ...globalOptions, output: 'text' });
      const warningSpy = spyOn(textOutput, 'warning');
      const cmd = new BundleCommand(
        () => textOutput,
        async () => bundleService as unknown as BundleService,
      );
      bundleService.get.mockResolvedValue(null);

      await cmd.cloneAction(createCommandContext({ ...globalOptions, output: 'text' }, ['1']));

      expect(warningSpy).toHaveBeenCalledWith("Couldn't find bundle by the specified ID");
      expect(bundleService.add).not.toHaveBeenCalled();
    });

    test('clones bundle with defaults from source bundle', async () => {
      const cmd = createBundleCommand();
      bundleService.get.mockResolvedValue(
        createBundleView({
          id: 1,
          name: 'my_bundle',
          format: 'crowdin-resx',
          sourcePatterns: ['/master/'],
          ignorePatterns: ['/tmp/'],
          exportPattern: '/%two_letters_code%/a.resx',
          labelIds: [11],
          includeProjectSourceLanguage: false,
          includeInContextPseudoLanguage: true,
          isMultilingual: false,
        }),
      );

      await cmd.cloneAction(createCommandContext(globalOptions, ['1'], {}));

      expect(bundleService.add).toHaveBeenCalledWith({
        name: 'my_bundle (clone)',
        format: 'crowdin-resx',
        sourcePatterns: ['/master/'],
        ignorePatterns: ['/tmp/'],
        exportPattern: '/%two_letters_code%/a.resx',
        labelIds: [11],
        includeProjectSourceLanguage: false,
        includeInContextPseudoLanguage: true,
        isMultilingual: false,
      });
    });
  });

  test('browseAction opens bundle URL in browser', async () => {
    const textOutput = createOutput({ ...globalOptions, output: 'text' });
    const successSpy = spyOn(textOutput, 'success');
    const cmd = new BundleCommand(
      () => textOutput,
      async () => bundleService as unknown as BundleService,
    );

    spyOn(os, 'platform').mockReturnValue('darwin');
    await cmd.browseAction(createCommandContext({ ...globalOptions, output: 'text' }, ['1']));

    expect(Bun.spawn).toHaveBeenCalledWith(['open', 'https://crowdin.com/project/demo/bundles/10']);
    expect(successSpy).toHaveBeenCalledWith('Opened https://crowdin.com/project/demo/bundles/10 in browser');
  });

  test('downloadAction is intentionally deferred', async () => {
    const cmd = createBundleCommand();

    expect(cmd.downloadAction(createCommandContext(globalOptions, ['1']))).rejects.toThrow(
      new CliError('Bundle download command is not implemented yet'),
    );
  });
});

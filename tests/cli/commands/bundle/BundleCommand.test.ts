import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import type { Command } from 'commander';
import { buildCommand } from '@/cli/builder.ts';
import BundleCommand from '@/cli/commands/bundle/BundleCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { BundleService, BundleView } from '@/cli/services/BundleService.ts';
import type { GetConfig } from '@/cli/services.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

describe('BundleCommand', () => {
  let output: Output;
  let bundleService: {
    list: ReturnType<typeof mock<BundleService['list']>>;
    add: ReturnType<typeof mock<BundleService['add']>>;
    get: ReturnType<typeof mock<BundleService['get']>>;
    delete: ReturnType<typeof mock<BundleService['delete']>>;
    getBundleUrl: ReturnType<typeof mock<BundleService['getBundleUrl']>>;
    exportBundle: ReturnType<typeof mock<BundleService['exportBundle']>>;
    getDownloadUrl: ReturnType<typeof mock<BundleService['getDownloadUrl']>>;
  };
  const config = { basePath: '/tmp/bundle-base', projectId: 1 } as unknown as Awaited<ReturnType<GetConfig>>;
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

  const createBundleCommand = (out: Output = output) => {
    return new BundleCommand(
      () => out,
      async () => bundleService as unknown as BundleService,
      async () => config,
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
      exportBundle: mock(async () => 'export-1'),
      getDownloadUrl: mock(async () => 'https://crowdin.com/download/bundle.zip'),
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
      const cmd = createBundleCommand(textOutput);

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
      expect(cmd.addAction(createCommandContext(globalOptions, ['bundle'], { format: 'json' }))).rejects.toThrow(
        new CliError("'--source' can't be empty"),
      );
      expect(
        cmd.addAction(createCommandContext(globalOptions, ['bundle'], { format: 'json', source: ['/src/**'] })),
      ).rejects.toThrow(new CliError("'--translation' can't be empty"));
    });

    test('adds bundle with provided options', async () => {
      const cmd = createBundleCommand();
      const context = createCommandContext(globalOptions, ['bundle'], {
        format: 'json',
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

    // Parses real argv through commander so a mismatch between the declared option name and the
    // field the action reads is caught (the stubbed contexts above cannot see it).
    test('reads --format from parsed argv', async () => {
      const cmd = createBundleCommand();
      const program = buildCommand(cmd.getDefinition());

      await program.parseAsync(
        ['add', 'bundle', '--format', 'json', '--source', '/src/**', '--translation', '/%locale%/app.json'],
        { from: 'user' },
      );

      expect(bundleService.add).toHaveBeenCalledWith(expect.objectContaining({ format: 'json' }));
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
      const cmd = createBundleCommand(textOutput);
      bundleService.get.mockResolvedValue(null);

      await cmd.deleteAction(createCommandContext({ ...globalOptions, output: 'text' }, ['1']));

      expect(warningSpy).toHaveBeenCalledWith("Couldn't find bundle by the specified ID");
      expect(bundleService.delete).not.toHaveBeenCalled();
    });

    test('deletes existing bundle', async () => {
      const textOutput = createOutput({ ...globalOptions, output: 'text' });
      const successSpy = spyOn(textOutput, 'success');
      const cmd = createBundleCommand(textOutput);
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
      const cmd = createBundleCommand(textOutput);
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
    const cmd = createBundleCommand(textOutput);

    spyOn(os, 'platform').mockReturnValue('darwin');
    await cmd.browseAction(createCommandContext({ ...globalOptions, output: 'text' }, ['1']));

    expect(Bun.spawn).toHaveBeenCalledWith(['open', 'https://crowdin.com/project/demo/bundles/10']);
    expect(successSpy).toHaveBeenCalledWith('Opened https://crowdin.com/project/demo/bundles/10 in browser');
  });

  describe('downloadAction', () => {
    let tempRoot: string;

    const textOptions = (overrides: Record<string, unknown> = {}) => ({
      ...globalOptions,
      output: 'text',
      ...overrides,
    });

    const mockArchive = (entries: Record<string, string> = { 'messages/en.json': '{"hello":"world"}' }) => {
      const zip = new AdmZip();

      for (const [name, content] of Object.entries(entries)) {
        zip.addFile(name, Buffer.from(content));
      }

      spyOn(globalThis, 'fetch').mockResolvedValue(new Response(zip.toBuffer()));
    };

    beforeEach(async () => {
      tempRoot = await mkdtemp(path.join(os.tmpdir(), 'bundle-download-'));
      config.basePath = tempRoot;

      spyOn(Bun, 'sleep').mockResolvedValue(undefined as never);

      bundleService.get.mockResolvedValue(createBundleView({ id: 5, name: 'app' }));
    });

    afterEach(async () => {
      await rm(tempRoot, { recursive: true, force: true });
    });

    test('warns and skips when bundle is missing', async () => {
      const textOutput = createOutput(textOptions());
      const warningSpy = spyOn(textOutput, 'warning');
      const cmd = createBundleCommand(textOutput);

      bundleService.get.mockResolvedValue(null);

      await cmd.downloadAction(createCommandContext(textOptions(), ['5']));

      expect(warningSpy).toHaveBeenCalledWith("Couldn't find bundle by the specified ID");
      expect(bundleService.exportBundle).not.toHaveBeenCalled();
    });

    test('builds, downloads and extracts the bundle, then removes the archive', async () => {
      mockArchive();

      const cmd = createBundleCommand(createOutput(textOptions()));
      await cmd.downloadAction(createCommandContext(textOptions(), ['5']));

      expect(bundleService.exportBundle).toHaveBeenCalledWith(5, expect.any(Function));
      expect(bundleService.getDownloadUrl).toHaveBeenCalledWith(5, 'export-1');

      const extracted = await readFile(path.join(tempRoot, 'messages/en.json'), 'utf8');
      expect(extracted).toBe('{"hello":"world"}');

      // Archive removed by default (no --keep-archive).
      expect(stat(path.join(tempRoot, 'bundle-export-1.zip'))).rejects.toThrow();
    });

    test('throws when the export fails', async () => {
      bundleService.exportBundle.mockRejectedValue(new CliError('Failed to build the bundle'));

      const cmd = createBundleCommand(createOutput(textOptions()));

      expect(cmd.downloadAction(createCommandContext(textOptions(), ['5']))).rejects.toThrow(
        new CliError('Failed to build the bundle'),
      );
    });

    test('dryrun lists archive contents without writing files', async () => {
      mockArchive();
      const textOutput = createOutput(textOptions({ dryrun: true }));
      const logSpy = spyOn(textOutput, 'log');
      const cmd = createBundleCommand(textOutput);

      await cmd.downloadAction(createCommandContext(textOptions({ dryrun: true }), ['5']));

      expect(logSpy).toHaveBeenCalledWith('messages/en.json');
      expect(stat(path.join(tempRoot, 'messages/en.json'))).rejects.toThrow();
    });

    test('keeps the archive with --keep-archive', async () => {
      mockArchive();
      const textOutput = createOutput(textOptions({ keepArchive: true }));
      const successSpy = spyOn(textOutput, 'success');
      const cmd = createBundleCommand(textOutput);

      await cmd.downloadAction(createCommandContext(textOptions({ keepArchive: true }), ['5']));

      const archivePath = path.join(tempRoot, 'bundle-export-1.zip');
      expect((await stat(archivePath)).isFile()).toBe(true);
      expect(successSpy).toHaveBeenCalledWith(`Archive saved to ${archivePath}`);
    });
  });
});

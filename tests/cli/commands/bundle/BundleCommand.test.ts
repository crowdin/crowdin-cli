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
import type { LabelService } from '@/cli/services/LabelService.ts';
import type { GetConfig } from '@/cli/services.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';
import { toPosixPath } from '@/lib/utils/path.ts';

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
  let labelService: { resolveLabelIds: ReturnType<typeof mock<LabelService['resolveLabelIds']>> };
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
      async () => labelService as unknown as LabelService,
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
    labelService = { resolveLabelIds: mock(async () => undefined) };

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
      const infoSpy = spyOn(textOutput, 'info');
      const cmd = createBundleCommand(textOutput);

      await cmd.listAction(createCommandContext({ ...globalOptions, output: 'text' }));

      expect(infoSpy).toHaveBeenCalledWith('No bundles found');
    });

    test('serializes the bundles themselves in structured formats', async () => {
      const cmd = createBundleCommand();
      const bundles = [createBundleView({ id: 1, name: 'App', format: 'json', exportPattern: '/%locale%/app.json' })];
      bundleService.list.mockResolvedValue(bundles);

      await cmd.listAction(createCommandContext(globalOptions));

      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify([{ id: 1, format: 'json', exportPattern: '/%locale%/app.json', name: 'App' }], null, 2),
      );
    });

    test('prints id, format, export pattern and name per bundle in text format', async () => {
      output = createOutput({ ...globalOptions, output: 'text' });
      const cmd = createBundleCommand();
      bundleService.list.mockResolvedValue([
        createBundleView({ id: 1, name: 'App', format: 'json', exportPattern: '/%locale%/app.json' }),
      ]);

      await cmd.listAction(createCommandContext({ ...globalOptions, output: 'text' }));

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('#1 json /%locale%/app.json App'));
    });

    test('prints id and name in plain format', async () => {
      output = createOutput({ ...globalOptions, output: 'plain' });
      const cmd = createBundleCommand();
      bundleService.list.mockResolvedValue([
        createBundleView({ id: 1, name: 'App', format: 'json', exportPattern: '/%locale%/app.json' }),
      ]);

      await cmd.listAction(createCommandContext({ ...globalOptions, output: 'plain' }));

      expect(console.log).toHaveBeenCalledWith('1 App');
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
        new CliError("'--source-pattern' can't be empty"),
      );
      expect(
        cmd.addAction(createCommandContext(globalOptions, ['bundle'], { format: 'json', sourcePattern: ['/src/**'] })),
      ).rejects.toThrow(new CliError("'--export-pattern' can't be empty"));
    });

    test('adds bundle with provided options', async () => {
      const cmd = createBundleCommand();
      const context = createCommandContext(globalOptions, ['bundle'], {
        format: 'json',
        sourcePattern: ['/src/**'],
        ignorePattern: ['/src/tmp/**'],
        exportPattern: '/%two_letters_code%/app.json',
        label: ['marketing'],
        includeSourceLanguage: true,
        includePseudoLanguage: false,
        multilingual: true,
      });

      labelService.resolveLabelIds.mockResolvedValue([7]);

      await cmd.addAction(context);

      expect(labelService.resolveLabelIds).toHaveBeenCalledWith(['marketing'], false);
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
        ['add', 'bundle', '--format', 'json', '--source-pattern', '/src/**', '--export-pattern', '/%locale%/app.json'],
        { from: 'user' },
      );

      expect(bundleService.add).toHaveBeenCalledWith(expect.objectContaining({ format: 'json' }));
    });

    // The pseudo-language is on unless it is negated, so only `--no-include-pseudo-language` can
    // change the request. Parsed from argv because the flag lives in commander's negation handling.
    test.each([
      [[], true],
      [['--no-include-pseudo-language'], false],
    ])('reads %p as includeInContextPseudoLanguage=%p', async (flags, expected) => {
      const cmd = createBundleCommand();
      const program = buildCommand(cmd.getDefinition());

      await program.parseAsync(
        [
          'add',
          'bundle',
          '--format',
          'json',
          '--source-pattern',
          '/src/**',
          '--export-pattern',
          '/%locale%/app.json',
          ...flags,
        ],
        { from: 'user' },
      );

      expect(bundleService.add).toHaveBeenCalledWith(
        expect.objectContaining({ includeInContextPseudoLanguage: expected }),
      );
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

    // Clone is tri-state per boolean: omitting the flag inherits the source bundle's value (covered
    // by the defaults test above), each flag overrides it. Parsed from argv because the negations
    // live in commander's `--no-` handling.
    test.each([
      ['--include-source-language', 'includeProjectSourceLanguage', true],
      ['--no-include-source-language', 'includeProjectSourceLanguage', false],
      ['--include-pseudo-language', 'includeInContextPseudoLanguage', true],
      ['--no-include-pseudo-language', 'includeInContextPseudoLanguage', false],
      ['--multilingual', 'isMultilingual', true],
      ['--no-multilingual', 'isMultilingual', false],
    ])('clone reads %s as %s=%p', async (flag, key, expected) => {
      const cmd = createBundleCommand();
      const program = buildCommand(cmd.getDefinition());
      bundleService.get.mockResolvedValue(
        createBundleView({
          id: 1,
          includeProjectSourceLanguage: !expected,
          includeInContextPseudoLanguage: !expected,
          isMultilingual: !expected,
        }),
      );

      await program.parseAsync(['clone', '1', flag], { from: 'user' });

      expect(bundleService.add).toHaveBeenCalledWith(expect.objectContaining({ [key]: expected }));
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

    // adm-zip applies canonical()/sanitize() only inside its own extractAllTo/extractEntryTo; the
    // raw entryName getter this command reads is unsanitized, so the containment check is ours.
    // adm-zip's *writer* strips '../', so the hostile name is byte-patched in afterwards — 'XX/'
    // and '../' are the same length, which keeps the local and central headers valid.
    test('refuses an archive entry that would extract outside the base path', async () => {
      const zip = new AdmZip();
      zip.addFile('XX/escaped.json', Buffer.from('{"pwned":true}'));
      const patched = Buffer.from(
        zip.toBuffer().toString('binary').replaceAll('XX/escaped.json', '../escaped.json'),
        'binary',
      );

      spyOn(globalThis, 'fetch').mockResolvedValue(new Response(patched));

      const cmd = createBundleCommand(createOutput(textOptions()));

      expect(cmd.downloadAction(createCommandContext(textOptions(), ['5']))).rejects.toThrow(
        'would be extracted outside the base path',
      );

      expect(stat(path.join(tempRoot, '..', 'escaped.json'))).rejects.toThrow();
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
      const successSpy = spyOn(textOutput, 'success');
      const cmd = createBundleCommand(textOutput);

      await cmd.downloadAction(createCommandContext(textOptions({ dryrun: true }), ['5']));

      expect(successSpy).toHaveBeenCalledWith('messages/en.json');
      expect(stat(path.join(tempRoot, 'messages/en.json'))).rejects.toThrow();
    });

    test('reports extracted paths as a list in a machine format', async () => {
      mockArchive({ 'messages/en.json': '{}', 'messages/fr.json': '{}' });
      const jsonOutput = createOutput(globalOptions);
      const listSpy = spyOn(jsonOutput, 'list');
      const cmd = createBundleCommand(jsonOutput);

      await cmd.downloadAction(createCommandContext(globalOptions, ['5']));

      expect(listSpy).toHaveBeenCalledWith(['messages/en.json', 'messages/fr.json'], expect.anything());
      expect(await Bun.file(path.join(tempRoot, 'messages/fr.json')).exists()).toBe(true);
    });

    test('keeps the archive with --keep-archive', async () => {
      mockArchive();
      const options = textOptions({ keepArchive: true });
      const cmd = createBundleCommand(createOutput(options));

      await cmd.downloadAction(createCommandContext(options, ['5']));

      const archivePath = path.join(tempRoot, 'bundle-export-1.zip');
      expect((await stat(archivePath)).isFile()).toBe(true);
      // The reported path is POSIX on every OS, so it is compared as such (a no-op off Windows).
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`Archive saved to '${toPosixPath(archivePath)}'`),
      );
    });

    // The path used to go through log(), which prints in text only: --plain printed nothing and
    // json/toon lost the archive from the result entirely.
    test('prints the kept archive path alone in plain', async () => {
      mockArchive();
      const options = { ...globalOptions, output: 'plain', keepArchive: true };
      const cmd = createBundleCommand(createOutput(options));

      await cmd.downloadAction(createCommandContext(options, ['5']));

      expect(console.log).toHaveBeenCalledWith(toPosixPath(path.join(tempRoot, 'bundle-export-1.zip')));
    });

    test('carries the kept archive path in a machine format', async () => {
      mockArchive();
      const options = { ...globalOptions, keepArchive: true };
      const jsonOutput = createOutput(options);
      const itemSpy = spyOn(jsonOutput, 'item');
      const cmd = createBundleCommand(jsonOutput);

      await cmd.downloadAction(createCommandContext(options, ['5']));

      expect(itemSpy).toHaveBeenCalledWith(toPosixPath(path.join(tempRoot, 'bundle-export-1.zip')), expect.anything());
    });
  });
});

import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Client, TranslationMemoryModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import TmCommand from '@/cli/commands/tm/TmCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { StorageService } from '@/cli/services/StorageService.ts';
import type { TmService } from '@/cli/services/TmService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

describe('TmCommand', () => {
  let tempDir: string;
  let output: Output;
  let organization: string | undefined;
  let tmService: {
    list: ReturnType<typeof mock<TmService['list']>>;
    get: ReturnType<typeof mock<TmService['get']>>;
    add: ReturnType<typeof mock<TmService['add']>>;
    export: ReturnType<typeof mock<TmService['export']>>;
    getDownloadUrl: ReturnType<typeof mock<TmService['getDownloadUrl']>>;
    import: ReturnType<typeof mock<TmService['import']>>;
  };
  let storageService: {
    addStorage: ReturnType<typeof mock<StorageService['addStorage']>>;
  };

  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    output: 'json',
  };

  const createCommandContext = (options: Record<string, unknown>, args: string[] = []) => {
    return {
      optsWithGlobals: () => ({ ...globalOptions, ...options }),
      args,
    } as unknown as Command;
  };

  const createTm = (
    overrides: Partial<TranslationMemoryModel.TranslationMemory> = {},
  ): TranslationMemoryModel.TranslationMemory =>
    ({ id: 42, name: '42', segmentsCount: 10, ...overrides }) as TranslationMemoryModel.TranslationMemory;

  const createTmCommand = () => {
    return new TmCommand(
      () => output,
      async () => tmService as unknown as TmService,
      async () => storageService as unknown as StorageService,
      async () => ({ organization }) as unknown as Client,
    );
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-tm-command-'));
    output = createOutput(globalOptions);
    organization = undefined;
    tmService = {
      list: mock(async () => [] as TranslationMemoryModel.TranslationMemory[]),
      get: mock(async () => createTm()),
      add: mock(async () => createTm({ id: 43, name: 'new tm' })),
      export: mock(async () => 'export-id'),
      getDownloadUrl: mock(async () => 'https://example.test/tm.tmx'),
      import: mock(async () => {}),
    };
    storageService = {
      addStorage: mock(async () => ({ data: { id: 52 } }) as never),
    };

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    mock.restore();
  });

  test('delegates default action to command help', async () => {
    const tmCommand = createTmCommand();
    const help = mock(() => {});
    const helpCommand = { help, optsWithGlobals: () => ({}) } as unknown as Command;

    await tmCommand.defaultAction(helpCommand);

    expect(help).toHaveBeenCalledTimes(1);
  });

  test('defines list, download and upload subcommands without command-local output options', () => {
    const tmCommand = createTmCommand();
    const definition = tmCommand.getDefinition();
    const subcommandNames = definition.subcommands?.map((subcommand) => subcommand.name);

    expect(definition.name).toBe('tm');
    expect(subcommandNames).toEqual(['list', 'download', 'upload']);

    for (const subcommand of definition.subcommands ?? []) {
      const optionNames = (subcommand.options ?? []).filter((option) => 'name' in option).map((option) => option.name);

      expect(optionNames).not.toContain('plain');
      expect(optionNames).not.toContain('output');
    }
  });

  describe('list', () => {
    test('lists translation memories', async () => {
      const tmCommand = createTmCommand();
      tmService.list.mockResolvedValue([
        createTm(),
        { id: 43, name: '43', segmentsCount: 0 } as TranslationMemoryModel.TranslationMemory,
      ]);

      await tmCommand.listAction(createCommandContext({}));

      expect(tmService.list).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify(
          [
            { id: 42, name: '42', segments: 10 },
            { id: 43, name: '43', segments: 0 },
          ],
          null,
          2,
        ),
      );
    });

    test('prints empty message when no translation memories found', async () => {
      const tmCommand = createTmCommand();
      tmService.list.mockResolvedValue([]);
      output = createOutput({ ...globalOptions, output: 'text' });

      await tmCommand.listAction(createCommandContext({}));

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No translation memories found'));
    });

    test('propagates list errors', async () => {
      const tmCommand = createTmCommand();
      tmService.list.mockRejectedValue(new CliError('Failed to list translation memories'));

      expect(tmCommand.listAction(createCommandContext({}))).rejects.toThrow(
        new CliError('Failed to list translation memories'),
      );
    });
  });

  describe('download', () => {
    beforeEach(() => {
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('tm-content'));
    });

    test('downloads translation memory by id with the default file name', async () => {
      const tmCommand = createTmCommand();
      const write = spyOn(Bun, 'write').mockResolvedValue(0 as never);
      output = createOutput({ ...globalOptions, output: 'text' });

      await tmCommand.downloadAction(createCommandContext({}, ['42']));

      expect(tmService.get).toHaveBeenCalledWith(42);
      expect(tmService.export).toHaveBeenCalledWith(42, undefined, undefined, undefined);
      expect(tmService.getDownloadUrl).toHaveBeenCalledWith(42, 'export-id');
      expect(write).toHaveBeenCalledWith('42.tmx', expect.anything());
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("'42.tmx' downloaded successfully"));
    });

    test('downloads to the specified file and derives format from its extension', async () => {
      const tmCommand = createTmCommand();
      const write = spyOn(Bun, 'write').mockResolvedValue(0 as never);
      const to = join(tempDir, 'memory.csv');

      await tmCommand.downloadAction(createCommandContext({ to }, ['42']));

      expect(tmService.export).toHaveBeenCalledWith(42, undefined, undefined, 'csv');
      expect(write).toHaveBeenCalledWith(to, expect.anything());
    });

    test('passes language pair and file format to the export', async () => {
      const tmCommand = createTmCommand();
      spyOn(Bun, 'write').mockResolvedValue(0 as never);

      await tmCommand.downloadAction(
        createCommandContext({ sourceLanguageId: 'en', targetLanguageId: 'uk', format: 'csv' }, ['42']),
      );

      expect(tmService.export).toHaveBeenCalledWith(42, 'en', 'uk', 'csv');
      expect(Bun.write).toHaveBeenCalledWith('42.csv', expect.anything());
    });

    test('throws error for unsupported --to extension', async () => {
      const tmCommand = createTmCommand();

      expect(tmCommand.downloadAction(createCommandContext({ to: 'file.tbx' }, ['42']))).rejects.toThrow(
        new CliError('Supported formats: tmx, csv, xlsx'),
      );
      expect(tmService.get).not.toHaveBeenCalled();
    });

    test('requires target language when source language is specified', async () => {
      const tmCommand = createTmCommand();

      expect(tmCommand.downloadAction(createCommandContext({ sourceLanguageId: 'en' }, ['42']))).rejects.toThrow(
        new CliError("'--target-language-id' must be specified along with '--source-language-id'"),
      );
      expect(tmService.get).not.toHaveBeenCalled();
    });

    test('requires source language when target language is specified', async () => {
      const tmCommand = createTmCommand();

      expect(tmCommand.downloadAction(createCommandContext({ targetLanguageId: 'uk' }, ['42']))).rejects.toThrow(
        new CliError("'--source-language-id' must be specified along with '--target-language-id'"),
      );
      expect(tmService.get).not.toHaveBeenCalled();
    });

    test('requires a numeric translation memory id', async () => {
      const tmCommand = createTmCommand();

      expect(tmCommand.downloadAction(createCommandContext({}, ['abc']))).rejects.toThrow(
        new CliError('Translation memory id must be numeric'),
      );
      expect(tmService.get).not.toHaveBeenCalled();
    });

    test('propagates not found errors', async () => {
      const tmCommand = createTmCommand();
      tmService.get.mockRejectedValue(new CliError('Failed to get translation memory #45'));

      expect(tmCommand.downloadAction(createCommandContext({}, ['45']))).rejects.toThrow(
        new CliError('Failed to get translation memory #45'),
      );
      expect(tmService.export).not.toHaveBeenCalled();
    });

    test('throws CliError when writing the file fails', async () => {
      const tmCommand = createTmCommand();
      spyOn(Bun, 'write').mockRejectedValue(new Error('permission denied'));

      expect(tmCommand.downloadAction(createCommandContext({}, ['42']))).rejects.toThrow(
        new CliError("Failed to write to the file '42.tmx'. permission denied"),
      );
    });
  });

  describe('upload', () => {
    let tmxFile: string;

    beforeEach(async () => {
      tmxFile = join(tempDir, 'file.tmx');
      await writeFile(tmxFile, '<tmx/>');
    });

    test('uploads to the existing translation memory by id', async () => {
      const tmCommand = createTmCommand();
      output = createOutput({ ...globalOptions, output: 'text' });

      await tmCommand.uploadAction(createCommandContext({ id: '42' }, [tmxFile]));

      expect(tmService.get).toHaveBeenCalledWith(42);
      expect(tmService.add).not.toHaveBeenCalled();
      expect(storageService.addStorage).toHaveBeenCalledTimes(1);
      expect(tmService.import).toHaveBeenCalledWith(42, { storageId: 52 });
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Imported in #42 '42' translation memory"));
    });

    test('creates a new translation memory when no id is specified', async () => {
      const tmCommand = createTmCommand();

      await tmCommand.uploadAction(createCommandContext({ language: 'uk' }, [tmxFile]));

      expect(tmService.get).not.toHaveBeenCalled();
      expect(tmService.add).toHaveBeenCalledWith({ name: 'Created in Crowdin CLI (file.tmx)', languageId: 'uk' });
      expect(tmService.import).toHaveBeenCalledWith(43, { storageId: 52 });
    });

    test('creates a new translation memory with group id for enterprise', async () => {
      const tmCommand = createTmCommand();
      organization = 'my-org';

      await tmCommand.uploadAction(createCommandContext({ language: 'uk' }, [tmxFile]));

      expect(tmService.add).toHaveBeenCalledWith({
        name: 'Created in Crowdin CLI (file.tmx)',
        languageId: 'uk',
        groupId: 0,
      });
    });

    test('passes scheme and first line header flag for csv files', async () => {
      const tmCommand = createTmCommand();
      const csvFile = join(tempDir, 'file.csv');
      await writeFile(csvFile, 'en,uk');

      await tmCommand.uploadAction(
        createCommandContext({ id: '42', scheme: ['en=0', 'uk=1'], firstLineContainsHeader: true }, [csvFile]),
      );

      expect(tmService.import).toHaveBeenCalledWith(42, {
        storageId: 52,
        scheme: { en: 0, uk: 1 },
        firstLineContainsHeader: true,
      });
    });

    test('throws not found error for a missing file', async () => {
      const tmCommand = createTmCommand();
      const missing = join(tempDir, 'missing.tmx');

      expect(tmCommand.uploadAction(createCommandContext({ id: '42' }, [missing]))).rejects.toThrow(
        new CliError(`File '${missing}' not found in the Crowdin project`),
      );
      expect(tmService.get).not.toHaveBeenCalled();
    });

    test('throws error when the specified file is a directory', async () => {
      const tmCommand = createTmCommand();
      const folder = join(tempDir, 'folder.tmx');
      await mkdir(folder);

      expect(tmCommand.uploadAction(createCommandContext({ id: '42' }, [folder]))).rejects.toThrow(
        new CliError('The specified file is a directory'),
      );
      expect(tmService.get).not.toHaveBeenCalled();
    });

    test('requires scheme for csv files', async () => {
      const tmCommand = createTmCommand();
      const csvFile = join(tempDir, 'file.csv');
      await writeFile(csvFile, 'en,uk');

      expect(tmCommand.uploadAction(createCommandContext({ id: '42' }, [csvFile]))).rejects.toThrow(
        new CliError('Scheme is required for CSV or XLS/XLSX files'),
      );
      expect(tmService.get).not.toHaveBeenCalled();
    });

    test('throws error for unsupported file format', async () => {
      const tmCommand = createTmCommand();
      const tbxFile = join(tempDir, 'file.tbx');
      await writeFile(tbxFile, '<tbx/>');

      expect(tmCommand.uploadAction(createCommandContext({ id: '42' }, [tbxFile]))).rejects.toThrow(
        new CliError('Supported formats: tmx, csv, xlsx'),
      );
      expect(tmService.get).not.toHaveBeenCalled();
    });

    test('rejects first line header flag for non-spreadsheet files', async () => {
      const tmCommand = createTmCommand();

      expect(
        tmCommand.uploadAction(createCommandContext({ id: '42', firstLineContainsHeader: true }, [tmxFile])),
      ).rejects.toThrow(new CliError("'--first-line-contains-header' is used only for CSV or XLS/XLSX files"));
      expect(tmService.get).not.toHaveBeenCalled();
    });

    test('requires language when creating a new translation memory', async () => {
      const tmCommand = createTmCommand();

      expect(tmCommand.uploadAction(createCommandContext({}, [tmxFile]))).rejects.toThrow(
        new CliError("'--language' is required for creating new translation memory"),
      );
      expect(tmService.add).not.toHaveBeenCalled();
    });

    test('requires a numeric translation memory id', async () => {
      const tmCommand = createTmCommand();

      expect(tmCommand.uploadAction(createCommandContext({ id: 'abc' }, [tmxFile]))).rejects.toThrow(
        new CliError('Translation memory id must be numeric'),
      );
      expect(tmService.get).not.toHaveBeenCalled();
    });

    test('throws error for a malformed scheme value', async () => {
      const tmCommand = createTmCommand();
      const csvFile = join(tempDir, 'file.csv');
      await writeFile(csvFile, 'en,uk');

      expect(tmCommand.uploadAction(createCommandContext({ id: '42', scheme: ['en'] }, [csvFile]))).rejects.toThrow(
        new CliError(
          "The '--scheme' parameter has an invalid value 'en'. Expected format: <column>=<index> (e.g. en=0)",
        ),
      );
      expect(tmService.get).not.toHaveBeenCalled();
    });

    test('propagates not found errors for a missing translation memory', async () => {
      const tmCommand = createTmCommand();
      tmService.get.mockRejectedValue(new CliError('Failed to get translation memory #43'));

      expect(tmCommand.uploadAction(createCommandContext({ id: '43' }, [tmxFile]))).rejects.toThrow(
        new CliError('Failed to get translation memory #43'),
      );
      expect(storageService.addStorage).not.toHaveBeenCalled();
      expect(tmService.import).not.toHaveBeenCalled();
    });

    test('propagates storage upload errors', async () => {
      const tmCommand = createTmCommand();
      storageService.addStorage.mockRejectedValue(new CliError('Failed to upload file.tmx'));

      expect(tmCommand.uploadAction(createCommandContext({ id: '42' }, [tmxFile]))).rejects.toThrow(
        new CliError('Failed to upload file.tmx'),
      );
      expect(tmService.import).not.toHaveBeenCalled();
    });
  });
});

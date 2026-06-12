import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Client, GlossariesModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import GlossaryCommand from '@/cli/commands/glossary/GlossaryCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GlossaryService } from '@/cli/services/GlossaryService.ts';
import type { StorageService } from '@/cli/services/StorageService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

describe('GlossaryCommand', () => {
  let tempDir: string;
  let output: Output;
  let organization: string | undefined;
  let glossaryService: {
    list: ReturnType<typeof mock<GlossaryService['list']>>;
    get: ReturnType<typeof mock<GlossaryService['get']>>;
    add: ReturnType<typeof mock<GlossaryService['add']>>;
    listTerms: ReturnType<typeof mock<GlossaryService['listTerms']>>;
    export: ReturnType<typeof mock<GlossaryService['export']>>;
    getDownloadUrl: ReturnType<typeof mock<GlossaryService['getDownloadUrl']>>;
    import: ReturnType<typeof mock<GlossaryService['import']>>;
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

  const createGlossary = (overrides: Partial<GlossariesModel.Glossary> = {}): GlossariesModel.Glossary =>
    ({ id: 42, name: 'forty-two', terms: 2, ...overrides }) as GlossariesModel.Glossary;

  const createGlossaryCommand = () => {
    return new GlossaryCommand(
      () => output,
      async () => glossaryService as unknown as GlossaryService,
      async () => storageService as unknown as StorageService,
      async () => ({ organization }) as unknown as Client,
    );
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-glossary-command-'));
    output = createOutput(globalOptions);
    organization = undefined;
    glossaryService = {
      list: mock(async () => [] as GlossariesModel.Glossary[]),
      get: mock(async () => createGlossary()),
      add: mock(async () => createGlossary({ id: 43, name: 'new glossary' })),
      listTerms: mock(async () => [] as GlossariesModel.Term[]),
      export: mock(async () => 'export-id'),
      getDownloadUrl: mock(async () => 'https://example.test/glossary.tbx'),
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
    const glossaryCommand = createGlossaryCommand();
    const help = mock(() => {});
    const helpCommand = { help, optsWithGlobals: () => ({}) } as unknown as Command;

    await glossaryCommand.defaultAction(helpCommand);

    expect(help).toHaveBeenCalledTimes(1);
  });

  test('defines list, download and upload subcommands without command-local output options', () => {
    const glossaryCommand = createGlossaryCommand();
    const definition = glossaryCommand.getDefinition();
    const subcommandNames = definition.subcommands?.map((subcommand) => subcommand.name);

    expect(definition.name).toBe('glossary');
    expect(subcommandNames).toEqual(['list', 'download', 'upload']);

    for (const subcommand of definition.subcommands ?? []) {
      const optionNames = (subcommand.options ?? []).filter((option) => 'name' in option).map((option) => option.name);

      expect(optionNames).not.toContain('plain');
      expect(optionNames).not.toContain('output');
    }
  });

  describe('list', () => {
    test('lists glossaries', async () => {
      const glossaryCommand = createGlossaryCommand();
      glossaryService.list.mockResolvedValue([
        createGlossary(),
        { id: 43, name: 'forty-three', terms: 1 } as GlossariesModel.Glossary,
      ]);

      await glossaryCommand.listAction(createCommandContext({}));

      expect(glossaryService.list).toHaveBeenCalledTimes(1);
      expect(glossaryService.listTerms).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify(
          [
            { id: 42, name: 'forty-two', terms: 2 },
            { id: 43, name: 'forty-three', terms: 1 },
          ],
          null,
          2,
        ),
      );
    });

    test('lists glossaries with terms in verbose mode', async () => {
      const glossaryCommand = createGlossaryCommand();
      glossaryService.list.mockResolvedValue([createGlossary()]);
      glossaryService.listTerms.mockResolvedValue([
        { id: 52, text: 'fifty-two', description: 'How' },
        { id: 53, text: 'fifty-three', description: 'are\nyou' },
      ] as GlossariesModel.Term[]);

      await glossaryCommand.listAction(createCommandContext({ verbose: true }));

      expect(glossaryService.listTerms).toHaveBeenCalledWith(42);
      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify(
          [
            {
              id: 42,
              name: 'forty-two',
              terms: 2,
              termList: '#52 fifty-two: How; #53 fifty-three: are you',
            },
          ],
          null,
          2,
        ),
      );
    });

    test('skips term fetching for glossaries without terms in verbose mode', async () => {
      const glossaryCommand = createGlossaryCommand();
      glossaryService.list.mockResolvedValue([createGlossary({ terms: 0 })]);

      await glossaryCommand.listAction(createCommandContext({ verbose: true }));

      expect(glossaryService.listTerms).not.toHaveBeenCalled();
    });

    test('warns when terms can not be listed in verbose mode', async () => {
      const glossaryCommand = createGlossaryCommand();
      output = createOutput({ ...globalOptions, output: 'text' });
      glossaryService.list.mockResolvedValue([createGlossary()]);
      glossaryService.listTerms.mockRejectedValue(new CliError('Failed to list terms of glossary #42'));

      await glossaryCommand.listAction(createCommandContext({ verbose: true }));

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('You do not have permission to manage this glossary'),
      );
    });

    test('prints empty message when no glossaries found', async () => {
      const glossaryCommand = createGlossaryCommand();
      glossaryService.list.mockResolvedValue([]);
      output = createOutput({ ...globalOptions, output: 'text' });

      await glossaryCommand.listAction(createCommandContext({}));

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No glossaries found'));
    });

    test('propagates list errors', async () => {
      const glossaryCommand = createGlossaryCommand();
      glossaryService.list.mockRejectedValue(new CliError('Failed to list glossaries'));

      expect(glossaryCommand.listAction(createCommandContext({}))).rejects.toThrow(
        new CliError('Failed to list glossaries'),
      );
    });
  });

  describe('download', () => {
    beforeEach(() => {
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('glossary-content'));
    });

    test('downloads glossary by id with the default file name', async () => {
      const glossaryCommand = createGlossaryCommand();
      const write = spyOn(Bun, 'write').mockResolvedValue(0 as never);
      output = createOutput({ ...globalOptions, output: 'text' });

      await glossaryCommand.downloadAction(createCommandContext({}, ['42']));

      expect(glossaryService.get).toHaveBeenCalledWith(42);
      expect(glossaryService.export).toHaveBeenCalledWith(42, undefined);
      expect(glossaryService.getDownloadUrl).toHaveBeenCalledWith(42, 'export-id');
      expect(write).toHaveBeenCalledWith('forty-two.tbx', expect.anything());
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("'forty-two.tbx' downloaded successfully"));
    });

    test('downloads to the specified file and derives format from its extension', async () => {
      const glossaryCommand = createGlossaryCommand();
      const write = spyOn(Bun, 'write').mockResolvedValue(0 as never);
      const to = join(tempDir, 'glossary.csv');

      await glossaryCommand.downloadAction(createCommandContext({ to }, ['42']));

      expect(glossaryService.export).toHaveBeenCalledWith(42, 'csv');
      expect(write).toHaveBeenCalledWith(to, expect.anything());
    });

    test('passes file format to the export', async () => {
      const glossaryCommand = createGlossaryCommand();
      spyOn(Bun, 'write').mockResolvedValue(0 as never);

      await glossaryCommand.downloadAction(createCommandContext({ fileFormat: 'csv' }, ['42']));

      expect(glossaryService.export).toHaveBeenCalledWith(42, 'csv');
      expect(Bun.write).toHaveBeenCalledWith('forty-two.csv', expect.anything());
    });

    test('throws error for unsupported --to extension', async () => {
      const glossaryCommand = createGlossaryCommand();

      expect(glossaryCommand.downloadAction(createCommandContext({ to: 'file.txt' }, ['42']))).rejects.toThrow(
        new CliError('Supported formats: tbx, csv, xlsx'),
      );
      expect(glossaryService.get).not.toHaveBeenCalled();
    });

    test('requires a numeric glossary id', async () => {
      const glossaryCommand = createGlossaryCommand();

      expect(glossaryCommand.downloadAction(createCommandContext({}, ['abc']))).rejects.toThrow(
        new CliError('Glossary id must be numeric'),
      );
      expect(glossaryService.get).not.toHaveBeenCalled();
    });

    test('propagates not found errors', async () => {
      const glossaryCommand = createGlossaryCommand();
      glossaryService.get.mockRejectedValue(new CliError('Failed to get glossary #45'));

      expect(glossaryCommand.downloadAction(createCommandContext({}, ['45']))).rejects.toThrow(
        new CliError('Failed to get glossary #45'),
      );
      expect(glossaryService.export).not.toHaveBeenCalled();
    });

    test('throws CliError when writing the file fails', async () => {
      const glossaryCommand = createGlossaryCommand();
      spyOn(Bun, 'write').mockRejectedValue(new Error('permission denied'));

      expect(glossaryCommand.downloadAction(createCommandContext({}, ['42']))).rejects.toThrow(
        new CliError("Failed to write to the file 'forty-two.tbx'. permission denied"),
      );
    });
  });

  describe('upload', () => {
    let tbxFile: string;

    beforeEach(async () => {
      tbxFile = join(tempDir, 'file.tbx');
      await writeFile(tbxFile, '<tbx/>');
    });

    test('uploads to the existing glossary by id', async () => {
      const glossaryCommand = createGlossaryCommand();
      output = createOutput({ ...globalOptions, output: 'text' });

      await glossaryCommand.uploadAction(createCommandContext({ id: '42' }, [tbxFile]));

      expect(glossaryService.get).toHaveBeenCalledWith(42);
      expect(glossaryService.add).not.toHaveBeenCalled();
      expect(storageService.addStorage).toHaveBeenCalledTimes(1);
      expect(glossaryService.import).toHaveBeenCalledWith(42, { storageId: 52 });
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Imported in #42 'forty-two' glossary"));
    });

    test('creates a new glossary when no id is specified', async () => {
      const glossaryCommand = createGlossaryCommand();

      await glossaryCommand.uploadAction(createCommandContext({ language: 'uk' }, [tbxFile]));

      expect(glossaryService.get).not.toHaveBeenCalled();
      expect(glossaryService.add).toHaveBeenCalledWith({ name: 'Created in Crowdin CLI (file.tbx)', languageId: 'uk' });
      expect(glossaryService.import).toHaveBeenCalledWith(43, { storageId: 52 });
    });

    test('creates a new glossary with group id for enterprise', async () => {
      const glossaryCommand = createGlossaryCommand();
      organization = 'my-org';

      await glossaryCommand.uploadAction(createCommandContext({ language: 'uk' }, [tbxFile]));

      expect(glossaryService.add).toHaveBeenCalledWith({
        name: 'Created in Crowdin CLI (file.tbx)',
        languageId: 'uk',
        groupId: 0,
      });
    });

    test('passes scheme and first line header flag for csv files', async () => {
      const glossaryCommand = createGlossaryCommand();
      const csvFile = join(tempDir, 'file.csv');
      await writeFile(csvFile, 'term_en,description_en');

      await glossaryCommand.uploadAction(
        createCommandContext({ id: '42', scheme: ['term_en=0', 'description_en=1'], firstLineContainsHeader: true }, [
          csvFile,
        ]),
      );

      expect(glossaryService.import).toHaveBeenCalledWith(42, {
        storageId: 52,
        scheme: { term_en: 0, description_en: 1 },
        firstLineContainsHeader: true,
      });
    });

    test('throws not found error for a missing file', async () => {
      const glossaryCommand = createGlossaryCommand();
      const missing = join(tempDir, 'missing.tbx');

      expect(glossaryCommand.uploadAction(createCommandContext({ id: '42' }, [missing]))).rejects.toThrow(
        new CliError(`File '${missing}' not found in the Crowdin project`),
      );
      expect(glossaryService.get).not.toHaveBeenCalled();
    });

    test('throws error when the specified file is a directory', async () => {
      const glossaryCommand = createGlossaryCommand();
      const folder = join(tempDir, 'folder.tbx');
      await mkdir(folder);

      expect(glossaryCommand.uploadAction(createCommandContext({ id: '42' }, [folder]))).rejects.toThrow(
        new CliError('The specified file is a directory'),
      );
      expect(glossaryService.get).not.toHaveBeenCalled();
    });

    test('throws error for unsupported file format', async () => {
      const glossaryCommand = createGlossaryCommand();
      const txtFile = join(tempDir, 'file.txt');
      await writeFile(txtFile, 'text');

      expect(glossaryCommand.uploadAction(createCommandContext({ id: '42' }, [txtFile]))).rejects.toThrow(
        new CliError('Supported formats: tbx, csv, xlsx'),
      );
      expect(glossaryService.get).not.toHaveBeenCalled();
    });

    test('rejects scheme for non-spreadsheet files', async () => {
      const glossaryCommand = createGlossaryCommand();

      expect(
        glossaryCommand.uploadAction(createCommandContext({ id: '42', scheme: ['term_en=0'] }, [tbxFile])),
      ).rejects.toThrow(new CliError('Scheme is used only for CSV or XLS/XLSX files'));
      expect(glossaryService.get).not.toHaveBeenCalled();
    });

    test('requires scheme for csv files', async () => {
      const glossaryCommand = createGlossaryCommand();
      const csvFile = join(tempDir, 'file.csv');
      await writeFile(csvFile, 'term_en');

      expect(glossaryCommand.uploadAction(createCommandContext({ id: '42' }, [csvFile]))).rejects.toThrow(
        new CliError('Scheme is required for CSV or XLS/XLSX files'),
      );
      expect(glossaryService.get).not.toHaveBeenCalled();
    });

    test('rejects first line header flag for non-spreadsheet files', async () => {
      const glossaryCommand = createGlossaryCommand();

      expect(
        glossaryCommand.uploadAction(createCommandContext({ id: '42', firstLineContainsHeader: true }, [tbxFile])),
      ).rejects.toThrow(new CliError("'--first-line-contains-header' is used only for CSV or XLS/XLSX files"));
      expect(glossaryService.get).not.toHaveBeenCalled();
    });

    test('requires language when creating a new glossary', async () => {
      const glossaryCommand = createGlossaryCommand();

      expect(glossaryCommand.uploadAction(createCommandContext({}, [tbxFile]))).rejects.toThrow(
        new CliError("'--language' is required for creating new glossary"),
      );
      expect(glossaryService.add).not.toHaveBeenCalled();
    });

    test('requires a numeric glossary id', async () => {
      const glossaryCommand = createGlossaryCommand();

      expect(glossaryCommand.uploadAction(createCommandContext({ id: 'abc' }, [tbxFile]))).rejects.toThrow(
        new CliError('Glossary id must be numeric'),
      );
      expect(glossaryService.get).not.toHaveBeenCalled();
    });

    test('throws error for a malformed scheme value', async () => {
      const glossaryCommand = createGlossaryCommand();
      const csvFile = join(tempDir, 'file.csv');
      await writeFile(csvFile, 'term_en');

      expect(
        glossaryCommand.uploadAction(createCommandContext({ id: '42', scheme: ['term_en'] }, [csvFile])),
      ).rejects.toThrow(
        new CliError(
          "The '--scheme' parameter has an invalid value 'term_en'. Expected format: <column>=<index> (e.g. en=0)",
        ),
      );
      expect(glossaryService.get).not.toHaveBeenCalled();
    });

    test('propagates not found errors for a missing glossary', async () => {
      const glossaryCommand = createGlossaryCommand();
      glossaryService.get.mockRejectedValue(new CliError('Failed to get glossary #43'));

      expect(glossaryCommand.uploadAction(createCommandContext({ id: '43' }, [tbxFile]))).rejects.toThrow(
        new CliError('Failed to get glossary #43'),
      );
      expect(storageService.addStorage).not.toHaveBeenCalled();
      expect(glossaryService.import).not.toHaveBeenCalled();
    });

    test('propagates storage upload errors', async () => {
      const glossaryCommand = createGlossaryCommand();
      storageService.addStorage.mockRejectedValue(new CliError('Failed to upload file.tbx'));

      expect(glossaryCommand.uploadAction(createCommandContext({ id: '42' }, [tbxFile]))).rejects.toThrow(
        new CliError('Failed to upload file.tbx'),
      );
      expect(glossaryService.import).not.toHaveBeenCalled();
    });
  });
});

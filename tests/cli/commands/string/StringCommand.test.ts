import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { SourceStringsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import StringCommand from '@/cli/commands/string/StringCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { BranchService } from '@/cli/services/BranchService.ts';
import type { DirectoryService } from '@/cli/services/DirectoryService.ts';
import type { FileService } from '@/cli/services/FileService.ts';
import type { LabelService } from '@/cli/services/LabelService.ts';
import type { StringService } from '@/cli/services/StringService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

describe('StringCommand', () => {
  let output: Output;
  let stringService: {
    isStringsBasedProject: ReturnType<typeof mock<StringService['isStringsBasedProject']>>;
    list: ReturnType<typeof mock<StringService['list']>>;
    add: ReturnType<typeof mock<StringService['add']>>;
    edit: ReturnType<typeof mock<StringService['edit']>>;
    delete: ReturnType<typeof mock<StringService['delete']>>;
  };
  let branchService: { resolveBranchId: ReturnType<typeof mock<BranchService['resolveBranchId']>> };
  let directoryService: { resolveDirectoryId: ReturnType<typeof mock<DirectoryService['resolveDirectoryId']>> };
  let labelService: {
    resolveLabelIds: ReturnType<typeof mock<LabelService['resolveLabelIds']>>;
    listLabelsMap: ReturnType<typeof mock<LabelService['listLabelsMap']>>;
  };
  let fileService: {
    resolveFileIds: ReturnType<typeof mock<FileService['resolveFileIds']>>;
    listProjectFilePaths: ReturnType<typeof mock<FileService['listProjectFilePaths']>>;
  };
  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    output: 'json',
  };

  const createCommandContext = (options: unknown, args: string[] = []) => {
    return {
      optsWithGlobals: () => options,
      args,
      help: mock(() => {}),
    } as unknown as Command;
  };

  const createStringCommand = () => {
    return new StringCommand(
      () => output,
      async () => stringService as unknown as StringService,
      async () => branchService as unknown as BranchService,
      async () => directoryService as unknown as DirectoryService,
      async () => fileService as unknown as FileService,
      async () => labelService as unknown as LabelService,
    );
  };

  const createStringModel = (overrides: Partial<SourceStringsModel.String>): SourceStringsModel.String => ({
    id: 1,
    projectId: 1,
    branchId: 1,
    identifier: 'k1',
    text: 'text',
    type: 0,
    context: '',
    maxLength: 0,
    isHidden: false,
    isDuplicate: false,
    masterStringId: false,
    hasPlurals: false,
    isIcu: false,
    labelIds: [],
    webUrl: '',
    createdAt: '',
    updatedAt: '',
    fileId: 0,
    directoryId: 0,
    revision: 1,
    fields: {},
    ...overrides,
  });

  beforeEach(() => {
    output = createOutput(globalOptions);
    stringService = {
      isStringsBasedProject: mock(async () => false),
      list: mock(async () => []),
      add: mock(async () => createStringModel({ id: 1, text: 'added text', identifier: 'k1' })),
      edit: mock(async () => createStringModel({ id: 5, text: 'edited', identifier: 'k5' })),
      delete: mock(async () => {}),
    };
    branchService = { resolveBranchId: mock(async () => undefined) };
    directoryService = { resolveDirectoryId: mock(async () => undefined) };
    labelService = {
      resolveLabelIds: mock(async () => undefined),
      listLabelsMap: mock(async () => new Map<number, string>()),
    };
    fileService = {
      resolveFileIds: mock(async () => ({ fileIds: [101], missingPaths: [] })),
      listProjectFilePaths: mock(async () => new Map<number, string>([[101, '/content.md']])),
    };

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
  });

  test('defaultAction calls command help', async () => {
    const cmd = createStringCommand();
    const commandContext = createCommandContext(globalOptions);

    await cmd.defaultAction(commandContext);

    expect(commandContext.help).toHaveBeenCalledTimes(1);
  });

  describe('listAction', () => {
    test('throws when --file and --directory are used together', async () => {
      const cmd = createStringCommand();
      const commandContext = createCommandContext({ ...globalOptions, file: 'a.yml', directory: '/a' });

      expect(cmd.listAction(commandContext)).rejects.toThrow(
        new CliError("The '--file' and '--directory' options can't be used together"),
      );
    });

    test('throws for file/directory filters on string-based projects', async () => {
      const cmd = createStringCommand();
      stringService.isStringsBasedProject.mockResolvedValue(true);
      const commandContext = createCommandContext({ ...globalOptions, file: 'a.yml' });

      expect(cmd.listAction(commandContext)).rejects.toThrow(
        new CliError("The '--file' and '--directory' options are not supported for string-based projects"),
      );
    });

    test('prints empty message when no strings found', async () => {
      const textOutput = createOutput({ ...globalOptions, output: 'text' });
      const cmd = new StringCommand(
        () => textOutput,
        async () => stringService as unknown as StringService,
        async () => branchService as unknown as BranchService,
        async () => directoryService as unknown as DirectoryService,
        async () => fileService as unknown as FileService,
        async () => labelService as unknown as LabelService,
      );
      const commandContext = createCommandContext({ ...globalOptions, output: 'text' });
      const successSpy = spyOn(textOutput, 'success');
      stringService.list.mockResolvedValue([]);

      await cmd.listAction(commandContext);

      expect(successSpy).toHaveBeenCalledWith('No source strings found');
    });

    test('lists strings in non-verbose mode', async () => {
      const cmd = createStringCommand();
      const commandContext = createCommandContext({ ...globalOptions, filter: 'hello' });
      stringService.list.mockResolvedValue([createStringModel({ id: 11, identifier: 'welcome', text: 'Hello' })]);

      await cmd.listAction(commandContext);

      expect(stringService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'hello',
        }),
      );
      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify([{ id: 11, identifier: 'welcome', text: 'Hello' }], null, 2),
      );
    });

    test('lists strings in verbose mode', async () => {
      const cmd = createStringCommand();
      const commandContext = createCommandContext({ ...globalOptions, verbose: true });
      stringService.list.mockResolvedValue([
        createStringModel({
          id: 11,
          identifier: 'welcome',
          text: 'Hello',
          fileId: 101,
          labelIds: [9],
          context: 'Greeting',
        }),
      ]);
      labelService.listLabelsMap.mockResolvedValue(new Map([[9, 'marketing']]));

      await cmd.listAction(commandContext);

      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify(
          [
            {
              id: 11,
              identifier: 'welcome',
              text: 'Hello',
              file: '/content.md',
              labels: 'marketing',
              context: 'Greeting',
            },
          ],
          null,
          2,
        ),
      );
    });
  });

  describe('addAction', () => {
    test('validates required text argument', async () => {
      const cmd = createStringCommand();
      const commandContext = createCommandContext(globalOptions, []);

      expect(cmd.addAction(commandContext)).rejects.toThrow(new CliError('Source string text can not be empty'));
    });

    test('validates max-length lower bound', async () => {
      const cmd = createStringCommand();
      const commandContext = createCommandContext({ ...globalOptions, maxLength: -1 }, ['hello']);

      expect(cmd.addAction(commandContext)).rejects.toThrow(new CliError("'--max-length' cannot be lower than 0"));
    });

    test('requires files for file-based projects', async () => {
      const cmd = createStringCommand();
      const commandContext = createCommandContext(globalOptions, ['hello']);

      expect(cmd.addAction(commandContext)).rejects.toThrow(new CliError("The '--file' value can not be empty"));
    });

    test('requires branch for string-based projects', async () => {
      const cmd = createStringCommand();
      stringService.isStringsBasedProject.mockResolvedValue(true);
      const commandContext = createCommandContext(globalOptions, ['hello']);

      expect(cmd.addAction(commandContext)).rejects.toThrow(
        new CliError("The '--branch' option is required for string-based projects"),
      );
    });

    test('creates file-based string and warns about missing files', async () => {
      const textOutput = createOutput({ ...globalOptions, output: 'text' });
      const cmd = new StringCommand(
        () => textOutput,
        async () => stringService as unknown as StringService,
        async () => branchService as unknown as BranchService,
        async () => directoryService as unknown as DirectoryService,
        async () => fileService as unknown as FileService,
        async () => labelService as unknown as LabelService,
      );
      const warningSpy = spyOn(textOutput, 'warning');
      const commandContext = createCommandContext(
        { ...globalOptions, output: 'text', file: ['a.yml', 'missing.yml'], identifier: 'k1' },
        ['hello'],
      );
      fileService.resolveFileIds.mockResolvedValue({ fileIds: [101], missingPaths: ['missing.yml'] });

      await cmd.addAction(commandContext);

      expect(stringService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'hello',
          identifier: 'k1',
          fileId: 101,
        }),
      );
      expect(warningSpy).toHaveBeenCalledWith("Project doesn't contain the 'missing.yml' file");
    });

    test('creates string-based plural string', async () => {
      const cmd = createStringCommand();
      stringService.isStringsBasedProject.mockResolvedValue(true);
      branchService.resolveBranchId.mockResolvedValue(555);
      const commandContext = createCommandContext({ ...globalOptions, branch: 'main', one: 'One value' }, ['hello']);

      await cmd.addAction(commandContext);

      expect(stringService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          text: { one: 'One value' },
          identifier: 'hello',
          branchId: 555,
        }),
      );
    });
  });

  describe('editAction', () => {
    test('validates required id', async () => {
      const cmd = createStringCommand();
      const commandContext = createCommandContext(globalOptions, []);

      expect(cmd.editAction(commandContext)).rejects.toThrow(new CliError('Source string id can not be empty'));
    });

    test('requires at least one edit option', async () => {
      const cmd = createStringCommand();
      const commandContext = createCommandContext(globalOptions, ['15']);

      expect(cmd.editAction(commandContext)).rejects.toThrow(
        new CliError('Specify some parameters to edit the string'),
      );
    });

    test('sends patch request', async () => {
      const cmd = createStringCommand();
      const commandContext = createCommandContext(
        { ...globalOptions, text: 'updated', context: 'ctx', hidden: true, label: ['l1'] },
        ['15'],
      );
      labelService.resolveLabelIds.mockResolvedValue([5]);

      await cmd.editAction(commandContext);

      expect(stringService.edit).toHaveBeenCalledWith(
        15,
        expect.arrayContaining([
          { op: 'replace', path: '/text', value: 'updated' },
          { op: 'replace', path: '/context', value: 'ctx' },
          { op: 'replace', path: '/isHidden', value: true },
          { op: 'replace', path: '/labelIds', value: [5] },
        ]),
      );
    });
  });

  describe('deleteAction', () => {
    test('validates numeric id', async () => {
      const cmd = createStringCommand();
      const commandContext = createCommandContext(globalOptions, ['abc']);

      expect(cmd.deleteAction(commandContext)).rejects.toThrow(new CliError('Source string id must be numeric'));
    });

    test('deletes string by id', async () => {
      const textOutput = createOutput({ ...globalOptions, output: 'text' });
      const cmd = new StringCommand(
        () => textOutput,
        async () => stringService as unknown as StringService,
        async () => branchService as unknown as BranchService,
        async () => directoryService as unknown as DirectoryService,
        async () => fileService as unknown as FileService,
        async () => labelService as unknown as LabelService,
      );
      const successSpy = spyOn(textOutput, 'success');
      const commandContext = createCommandContext({ ...globalOptions, output: 'text' }, ['42']);

      await cmd.deleteAction(commandContext);

      expect(stringService.delete).toHaveBeenCalledWith(42);
      expect(successSpy).toHaveBeenCalledWith('Source string #42 was deleted successfully');
    });
  });
});

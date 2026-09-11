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
  let branchService: {
    resolveBranch: ReturnType<typeof mock<BranchService['resolveBranch']>>;
    resolveBranchId: ReturnType<typeof mock<BranchService['resolveBranchId']>>;
  };
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

  const createStringCommand = () => createStringCommandWith(output);

  const createStringCommandWith = (commandOutput: Output) => {
    return new StringCommand(
      () => commandOutput,
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
    branchService = { resolveBranch: mock(async () => undefined), resolveBranchId: mock(async () => undefined) };
    directoryService = { resolveDirectoryId: mock(async () => undefined) };
    labelService = {
      resolveLabelIds: mock(async () => undefined),
      listLabelsMap: mock(async () => new Map<number, string>()),
    };
    fileService = {
      resolveFileIds: mock(async () => ({ fileIds: [101], missingPaths: [] })),
      listProjectFilePaths: mock(async () => new Map([[101, { path: '/content.md' }]])),
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

    test('throws when --scope is used without --filter', async () => {
      const cmd = createStringCommand();
      const commandContext = createCommandContext({ ...globalOptions, scope: 'text' });

      expect(cmd.listAction(commandContext)).rejects.toThrow(
        new CliError("The '--scope' option can only be used together with '--filter'"),
      );
      expect(stringService.list).not.toHaveBeenCalled();
    });

    test('passes --scope through when --filter is present', async () => {
      const cmd = createStringCommand();
      const commandContext = createCommandContext({ ...globalOptions, scope: 'text', filter: 'Hello' });

      await cmd.listAction(commandContext);

      expect(stringService.list).toHaveBeenCalledWith(expect.objectContaining({ scope: 'text', filter: 'Hello' }));
    });

    test.each([
      [{ filter: 'Hello' }, "The '--croql' option can't be used together with --filter"],
      [{ label: ['main'] }, "The '--croql' option can't be used together with --label"],
      [{ branch: 'main' }, "The '--croql' option can't be used together with --branch"],
      [{ file: 'a.yml' }, "The '--croql' option can't be used together with --file"],
      [{ directory: '/a' }, "The '--croql' option can't be used together with --directory"],
      [{ filter: 'Hello', file: 'a.yml' }, "The '--croql' option can't be used together with --filter, --file"],
    ])('throws when --croql is combined with %p', async (conflicting, message) => {
      const cmd = createStringCommand();
      const commandContext = createCommandContext({ ...globalOptions, croql: 'count of comments > 0', ...conflicting });

      expect(cmd.listAction(commandContext)).rejects.toThrow(new CliError(message));
      expect(stringService.list).not.toHaveBeenCalled();
    });

    // `--branch none` means "no branch", so it never reaches the request and never conflicts.
    test('allows --croql with --branch none', async () => {
      const cmd = createStringCommand();
      const commandContext = createCommandContext({
        ...globalOptions,
        croql: 'count of comments > 0',
        branch: 'none',
      });

      await cmd.listAction(commandContext);

      expect(stringService.list).toHaveBeenCalledWith(expect.objectContaining({ croql: 'count of comments > 0' }));
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
      const infoSpy = spyOn(textOutput, 'info');
      stringService.list.mockResolvedValue([]);

      await cmd.listAction(commandContext);

      expect(infoSpy).toHaveBeenCalledWith('No source strings found');
    });

    // The API refuses branchId next to fileId or directoryId, and both already imply the branch.
    test('drops branchId when --file resolved a file inside the branch', async () => {
      const cmd = createStringCommand();
      branchService.resolveBranch.mockResolvedValue({ id: 7, name: 'feature' } as never);
      stringService.list.mockResolvedValue([]);

      await cmd.listAction(createCommandContext({ ...globalOptions, branch: 'feature', file: 'content.md' }));

      expect(stringService.list).toHaveBeenCalledWith(expect.objectContaining({ fileId: 101 }));
      expect(stringService.list).toHaveBeenCalledWith(expect.not.objectContaining({ branchId: expect.anything() }));
    });

    test('drops branchId when --directory resolved a directory inside the branch', async () => {
      const cmd = createStringCommand();
      branchService.resolveBranch.mockResolvedValue({ id: 7, name: 'feature' } as never);
      directoryService.resolveDirectoryId.mockResolvedValue(22);
      stringService.list.mockResolvedValue([]);

      await cmd.listAction(createCommandContext({ ...globalOptions, branch: 'feature', directory: 'docs' }));

      expect(stringService.list).toHaveBeenCalledWith(expect.objectContaining({ directoryId: 22 }));
      expect(stringService.list).toHaveBeenCalledWith(expect.not.objectContaining({ branchId: expect.anything() }));
    });

    test('keeps branchId when neither --file nor --directory narrows the listing', async () => {
      const cmd = createStringCommand();
      branchService.resolveBranch.mockResolvedValue({ id: 7, name: 'feature' } as never);
      stringService.list.mockResolvedValue([]);

      await cmd.listAction(createCommandContext({ ...globalOptions, branch: 'feature' }));

      expect(stringService.list).toHaveBeenCalledWith(expect.objectContaining({ branchId: 7 }));
    });

    test('serializes the strings themselves in structured formats', async () => {
      const cmd = createStringCommand();
      const commandContext = createCommandContext({ ...globalOptions, filter: 'hello' });
      const strings = [createStringModel({ id: 11, identifier: 'welcome', text: 'Hello' })];
      stringService.list.mockResolvedValue(strings);

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

    test('skips the label and file-path lookups when not verbose', async () => {
      const cmd = createStringCommand();
      stringService.list.mockResolvedValue([createStringModel({ id: 11, identifier: 'welcome', text: 'Hello' })]);

      await cmd.listAction(createCommandContext(globalOptions));

      expect(labelService.listLabelsMap).not.toHaveBeenCalled();
      expect(fileService.listProjectFilePaths).not.toHaveBeenCalled();
    });

    test('skips the verbose lookups under a machine format, which never renders the view', async () => {
      const cmd = createStringCommand();
      stringService.list.mockResolvedValue([createStringModel({ id: 11, identifier: 'welcome', text: 'Hello' })]);

      await cmd.listAction(createCommandContext({ ...globalOptions, output: 'json', verbose: true }));

      expect(labelService.listLabelsMap).not.toHaveBeenCalled();
      expect(fileService.listProjectFilePaths).not.toHaveBeenCalled();
    });

    // Java keeps the verbose detail lines outside its plainView branch, unlike glossary's terms.
    test('still renders the verbose detail lines in plain format', async () => {
      const plainOutput = createOutput({ ...globalOptions, output: 'plain' });
      const cmd = createStringCommandWith(plainOutput);

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

      await cmd.listAction(createCommandContext({ ...globalOptions, output: 'plain', verbose: true }));

      expect(labelService.listLabelsMap).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        '11\n\t- file: /content.md\n\t- labels: marketing\n\t- context: Greeting',
      );
    });

    // Line rendering itself is covered in views.test.ts; this pins the verbose lookups reaching the view.
    test('renders the verbose detail lines with resolved labels and file paths', async () => {
      const textOutput = createOutput({ ...globalOptions, output: 'text' });
      const cmd = createStringCommandWith(textOutput);
      const commandContext = createCommandContext({ ...globalOptions, output: 'text', verbose: true });
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
        expect.stringContaining(
          '#11 welcome Hello\n\t- file: /content.md\n\t- labels: marketing\n\t- context: Greeting',
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

    test('sends max-length as a number', async () => {
      const cmd = createStringCommand();
      stringService.isStringsBasedProject.mockResolvedValue(true);
      branchService.resolveBranchId.mockResolvedValue(555);
      const commandContext = createCommandContext({ ...globalOptions, branch: 'main', maxLength: '999' }, ['hello']);

      await cmd.addAction(commandContext);

      expect(stringService.add).toHaveBeenCalledWith(expect.objectContaining({ maxLength: 999 }));
    });

    test('rejects a non-numeric max-length', async () => {
      const cmd = createStringCommand();
      const commandContext = createCommandContext({ ...globalOptions, maxLength: 'abc' }, ['hello']);

      expect(cmd.addAction(commandContext)).rejects.toThrow("The '--max-length' value must be numeric");
    });

    test('creates string-based plural string', async () => {
      const cmd = createStringCommand();
      stringService.isStringsBasedProject.mockResolvedValue(true);
      branchService.resolveBranchId.mockResolvedValue(555);
      const commandContext = createCommandContext({ ...globalOptions, branch: 'main', one: 'One value' }, ['hello']);

      await cmd.addAction(commandContext);

      expect(stringService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          text: { other: 'hello', one: 'One value' },
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

    test('skips the verbose lookups when not verbose', async () => {
      const cmd = createStringCommand();

      await cmd.editAction(createCommandContext({ ...globalOptions, text: 'updated' }, ['15']));

      expect(stringService.isStringsBasedProject).not.toHaveBeenCalled();
      expect(labelService.listLabelsMap).not.toHaveBeenCalled();
      expect(fileService.listProjectFilePaths).not.toHaveBeenCalled();
    });

    test('skips the verbose lookups under a machine format', async () => {
      const cmd = createStringCommand();

      await cmd.editAction(
        createCommandContext({ ...globalOptions, output: 'json', verbose: true, text: 'x' }, ['15']),
      );

      expect(stringService.isStringsBasedProject).not.toHaveBeenCalled();
      expect(labelService.listLabelsMap).not.toHaveBeenCalled();
      expect(fileService.listProjectFilePaths).not.toHaveBeenCalled();
    });

    // Java StringEditAction passes isVerbose to printSourceString, so the echo carries the details.
    test('echoes the verbose detail lines with --verbose', async () => {
      const textOutput = createOutput({ ...globalOptions, output: 'text' });
      const cmd = createStringCommandWith(textOutput);

      stringService.edit.mockResolvedValue(
        createStringModel({
          id: 15,
          identifier: 'welcome',
          text: 'Hello',
          fileId: 101,
          labelIds: [9],
          context: 'Greeting',
        }),
      );
      labelService.listLabelsMap.mockResolvedValue(new Map([[9, 'marketing']]));

      await cmd.editAction(
        createCommandContext({ ...globalOptions, output: 'text', verbose: true, text: 'Hello' }, ['15']),
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          '#15 welcome Hello\n\t- file: /content.md\n\t- labels: marketing\n\t- context: Greeting',
        ),
      );
    });

    test('drops the file line for strings-based projects when verbose', async () => {
      const textOutput = createOutput({ ...globalOptions, output: 'text' });
      const cmd = createStringCommandWith(textOutput);

      stringService.isStringsBasedProject.mockResolvedValue(true);
      stringService.edit.mockResolvedValue(
        createStringModel({ id: 15, identifier: 'welcome', text: 'Hello', fileId: 101, context: 'Greeting' }),
      );

      await cmd.editAction(
        createCommandContext({ ...globalOptions, output: 'text', verbose: true, text: 'Hello' }, ['15']),
      );

      expect(fileService.listProjectFilePaths).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('#15 welcome Hello\n\t- context: Greeting'));
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

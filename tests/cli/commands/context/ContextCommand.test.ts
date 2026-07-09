import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PatchRequest, SourceStringsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import ContextCommand from '@/cli/commands/context/ContextCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { BranchService } from '@/cli/services/BranchService.ts';
import type { FileService } from '@/cli/services/FileService.ts';
import type { LabelService } from '@/cli/services/LabelService.ts';
import type { ProjectService } from '@/cli/services/ProjectService.ts';
import type { StringService } from '@/cli/services/StringService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

const AI_CONTEXT = (manual: string, ai: string) => `${manual}\n\n✨ AI Context\n${ai}\n✨ 🔚`;

describe('ContextCommand', () => {
  let tempDir: string;
  let output: Output;
  let projectService: { loadProject: ReturnType<typeof mock<ProjectService['loadProject']>> };
  let stringService: {
    list: ReturnType<typeof mock<StringService['list']>>;
    batchEdit: ReturnType<typeof mock<StringService['batchEdit']>>;
  };
  let branchService: { resolveBranchId: ReturnType<typeof mock<BranchService['resolveBranchId']>> };
  let fileService: { listProjectFilePaths: ReturnType<typeof mock<FileService['listProjectFilePaths']>> };
  let labelService: { resolveLabelIds: ReturnType<typeof mock<LabelService['resolveLabelIds']>> };

  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    output: 'text',
  };

  const createCommandContext = (options: unknown) => {
    return {
      optsWithGlobals: () => ({ ...globalOptions, ...(options as object) }),
      help: mock(() => {}),
    } as unknown as Command;
  };

  const createContextCommand = () => {
    return new ContextCommand(
      () => output,
      async () => projectService as unknown as ProjectService,
      async () => stringService as unknown as StringService,
      async () => branchService as unknown as BranchService,
      async () => fileService as unknown as FileService,
      async () => labelService as unknown as LabelService,
    );
  };

  const createString = (overrides: Partial<SourceStringsModel.String>): SourceStringsModel.String =>
    ({
      id: 1,
      identifier: 'key',
      text: 'text',
      context: '',
      fileId: 101,
      createdAt: '2020-03-20T12:00:00+00:00',
      ...overrides,
    }) as SourceStringsModel.String;

  const mockProject = (type: 0 | 1 = 0) => {
    projectService.loadProject.mockResolvedValue({
      data: { id: 123, name: 'Test Project', type },
    } as never);
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-context-command-'));
    output = createOutput(globalOptions);

    projectService = { loadProject: mock() };
    stringService = { list: mock(async () => []), batchEdit: mock(async () => {}) };
    branchService = { resolveBranchId: mock(async () => undefined) };
    fileService = { listProjectFilePaths: mock(async () => new Map<number, string>()) };
    labelService = { resolveLabelIds: mock(async () => undefined) };

    mockProject();

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(async () => {
    mock.restore();
    await rm(tempDir, { recursive: true, force: true });
  });

  const loggedOutput = () =>
    (console.log as ReturnType<typeof mock>).mock.calls.map((call) => String(call[0])).join('\n');

  test('delegates default action to command help', async () => {
    const command = createContextCommand();
    const help = mock(() => {});
    const helpCommand = { help, optsWithGlobals: () => ({}) } as unknown as Command;

    await command.defaultAction(helpCommand);

    expect(help).toHaveBeenCalledTimes(1);
  });

  describe('download', () => {
    test('saves strings to a jsonl file', async () => {
      const command = createContextCommand();
      const to = join(tempDir, 'out.jsonl');

      fileService.listProjectFilePaths.mockResolvedValue(new Map([[101, '/first.txt']]));
      stringService.list.mockResolvedValue([
        createString({ id: 701, identifier: 'the.key', text: 'the-text', context: AI_CONTEXT('manual', 'ai-content') }),
      ]);

      await command.downloadAction(createCommandContext({ to }));

      const content = await Bun.file(to).text();

      expect(content).toContain('"id":701');
      expect(content).toContain('"key":"the.key"');
      expect(content).toContain('"text":"the-text"');
      expect(content).toContain('"file":"/first.txt"');
      expect(content).toContain('"context":"manual"');
      expect(content).toContain('"ai_context":"ai-content"');
      expect(loggedOutput()).toContain('Downloaded 1 strings');
      expect(loggedOutput()).toContain(`'${to}' saved successfully`);
    });

    test("filters strings by status 'ai'", async () => {
      const command = createContextCommand();
      const to = join(tempDir, 'out.jsonl');

      stringService.list.mockResolvedValue([
        createString({ id: 1, identifier: 'k1', context: '' }),
        createString({ id: 2, identifier: 'k2', context: AI_CONTEXT('manual', 'aiOnly') }),
        createString({ id: 3, identifier: 'k3', context: 'only manual' }),
      ]);

      await command.downloadAction(createCommandContext({ to, status: 'ai' }));

      const content = await Bun.file(to).text();

      expect(content).toContain('"id":2');
      expect(content).not.toContain('"id":1');
      expect(content).not.toContain('"id":3');
    });

    test("filters strings by status 'manual'", async () => {
      const command = createContextCommand();
      const to = join(tempDir, 'out.jsonl');

      stringService.list.mockResolvedValue([
        createString({ id: 1, identifier: 'k1', context: '' }),
        createString({ id: 2, identifier: 'k2', context: AI_CONTEXT('', 'aiOnly') }),
        createString({ id: 3, identifier: 'k3', context: 'only manual' }),
      ]);

      await command.downloadAction(createCommandContext({ to, status: 'manual' }));

      const content = await Bun.file(to).text();

      expect(content).toContain('"id":3');
      expect(content).not.toContain('"id":1');
      expect(content).not.toContain('"id":2');
    });

    test("filters strings by status 'empty'", async () => {
      const command = createContextCommand();
      const to = join(tempDir, 'out.jsonl');

      stringService.list.mockResolvedValue([
        createString({ id: 1, identifier: 'k1', context: '' }),
        createString({ id: 2, identifier: 'k2', context: AI_CONTEXT('manual', 'ai') }),
      ]);

      await command.downloadAction(createCommandContext({ to, status: 'empty' }));

      const content = await Bun.file(to).text();

      expect(content).toContain('"id":1');
      expect(content).not.toContain('"id":2');
    });

    test('excludes strings created before the since date and does not write the file', async () => {
      const command = createContextCommand();
      const to = join(tempDir, 'out.jsonl');

      stringService.list.mockResolvedValue([createString({ id: 701, createdAt: '2020-03-20T12:00:00+00:00' })]);

      await command.downloadAction(createCommandContext({ to, since: '2020-03-22' }));

      expect(await Bun.file(to).exists()).toBe(false);
      expect(loggedOutput()).toContain('No strings found');
    });

    test('keeps strings created on or after the since date', async () => {
      const command = createContextCommand();
      const to = join(tempDir, 'out.jsonl');

      stringService.list.mockResolvedValue([createString({ id: 701, createdAt: '2020-03-20T12:00:00+00:00' })]);

      await command.downloadAction(createCommandContext({ to, since: '2020-03-18' }));

      expect(await Bun.file(to).text()).toContain('"id":701');
    });

    test('filters strings by file glob and queries per matched file', async () => {
      const command = createContextCommand();
      const to = join(tempDir, 'out.jsonl');

      fileService.listProjectFilePaths.mockResolvedValue(
        new Map([
          [101, '/android-new-file.xml'],
          [102, '/android-new-file2.xml'],
        ]),
      );
      stringService.list.mockImplementation(async (params) => {
        if (params.fileId === 101) {
          return [createString({ id: 701, identifier: 'the.key', context: AI_CONTEXT('manual', 'ai-content') })];
        }

        return [createString({ id: 702, identifier: 'the.key2', fileId: 102 })];
      });

      await command.downloadAction(createCommandContext({ to, file: ['android-new-file.xml'] }));

      expect(stringService.list).toHaveBeenCalledTimes(1);
      expect(stringService.list).toHaveBeenCalledWith({ fileId: 101 });

      const content = await Bun.file(to).text();

      expect(content).toContain('"id":701');
      expect(content).not.toContain('"id":702');
    });

    test('matches globs with brackets in folder names', async () => {
      const command = createContextCommand();
      const to = join(tempDir, 'out.jsonl');

      fileService.listProjectFilePaths.mockResolvedValue(
        new Map([
          [101, '/[test.Folder dev]/resources/js/lang/en/auth.php'],
          [102, '/[test.Folder dev]/resources/js/lang/en/email.php'],
        ]),
      );
      stringService.list.mockImplementation(async (params) => {
        if (params.fileId === 101) {
          return [createString({ id: 701, identifier: 'the.key', context: AI_CONTEXT('manual', 'ai-content') })];
        }

        return [
          createString({ id: 702, identifier: 'the.key2', fileId: 102, context: AI_CONTEXT('manual', 'ai-content2') }),
        ];
      });

      await command.downloadAction(createCommandContext({ to, file: ['/[test.Folder dev]/**/*.php'] }));

      expect(stringService.list).toHaveBeenCalledTimes(2);

      const content = await Bun.file(to).text();

      expect(content).toContain('"id":701');
      expect(content).toContain('"id":702');
      expect(content).toContain('"ai_context":"ai-content"');
      expect(content).toContain('"ai_context":"ai-content2"');
    });

    test('reports no strings when the file filter matches nothing', async () => {
      const command = createContextCommand();
      const to = join(tempDir, 'out.jsonl');

      fileService.listProjectFilePaths.mockResolvedValue(new Map([[101, '/first.txt']]));

      await command.downloadAction(createCommandContext({ to, file: ['nothing-matches.xml'] }));

      expect(stringService.list).not.toHaveBeenCalled();
      expect(loggedOutput()).toContain('No strings found');
    });

    test('preserves ai_context from an existing download file', async () => {
      const command = createContextCommand();
      const to = join(tempDir, 'out.jsonl');

      await writeFile(
        to,
        JSON.stringify({
          id: 701,
          key: 'the.key',
          text: 'the-text',
          file: '/first.txt',
          context: 'manual',
          ai_context: 'edited-by-agent',
        }),
      );

      fileService.listProjectFilePaths.mockResolvedValue(new Map([[101, '/first.txt']]));
      stringService.list.mockResolvedValue([
        createString({ id: 701, identifier: 'the.key', context: AI_CONTEXT('manual', 'original-ai') }),
      ]);

      await command.downloadAction(createCommandContext({ to }));

      const content = await Bun.file(to).text();

      expect(content).toContain('"ai_context":"edited-by-agent"');
      expect(content).not.toContain('original-ai');
    });

    test('passes filters to the strings listing', async () => {
      const command = createContextCommand();
      const to = join(tempDir, 'out.jsonl');

      branchService.resolveBranchId.mockResolvedValue(7);
      labelService.resolveLabelIds.mockResolvedValue([33, 44]);
      stringService.list.mockResolvedValue([createString({ id: 1 })]);

      await command.downloadAction(
        createCommandContext({ to, branch: 'main', label: ['l1', 'l2'], croql: 'count of translations = 0' }),
      );

      expect(branchService.resolveBranchId).toHaveBeenCalledWith('main');
      expect(labelService.resolveLabelIds).toHaveBeenCalledWith(['l1', 'l2'], false);
      expect(stringService.list).toHaveBeenCalledWith({
        branchId: 7,
        labelIds: '33,44',
        croql: 'count of translations = 0',
      });
    });

    test('does not resolve file paths for strings-based projects', async () => {
      const command = createContextCommand();
      const to = join(tempDir, 'out.jsonl');

      mockProject(1);
      stringService.list.mockResolvedValue([createString({ id: 701, identifier: 'the.key' })]);

      await command.downloadAction(createCommandContext({ to }));

      expect(fileService.listProjectFilePaths).not.toHaveBeenCalled();
      expect(await Bun.file(to).text()).toContain('"file":""');
    });

    test('rejects an invalid since date', async () => {
      const command = createContextCommand();

      expect(command.downloadAction(createCommandContext({ to: 'out.jsonl', since: 'invalid' }))).rejects.toThrow(
        new CliError("The '--since' parameter should be in 'YYYY-MM-DD' format"),
      );
      expect(command.downloadAction(createCommandContext({ to: 'out.jsonl', since: '2020-13-45' }))).rejects.toThrow(
        new CliError("The '--since' parameter should be in 'YYYY-MM-DD' format"),
      );
    });

    test('rejects an invalid status value', async () => {
      const command = createContextCommand();

      expect(command.downloadAction(createCommandContext({ to: 'out.jsonl', status: 'text' }))).rejects.toThrow(
        new CliError("The '--status' parameter has an invalid value. Supported values: empty, ai, manual"),
      );
    });

    test('propagates API errors', async () => {
      const command = createContextCommand();

      stringService.list.mockRejectedValue(new CliError('Failed to list source strings'));

      expect(command.downloadAction(createCommandContext({ to: join(tempDir, 'out.jsonl') }))).rejects.toThrow(
        'Failed to list source strings',
      );
    });
  });

  describe('upload', () => {
    const writeRecords = async (records: object[]) => {
      const from = join(tempDir, 'context.jsonl');
      await writeFile(from, records.map((record) => JSON.stringify(record)).join('\n'));
      return from;
    };

    const record = (id: number, context: string, aiContext: string) => ({
      id,
      key: `k${id}`,
      text: `t${id}`,
      file: '/f',
      context,
      ai_context: aiContext,
    });

    test('uploads context in batches of 100', async () => {
      const command = createContextCommand();
      const from = await writeRecords(
        Array.from({ length: 250 }, (_, index) => record(index + 1, 'man', `ai${index + 1}`)),
      );

      await command.uploadAction(createCommandContext({ from }));

      expect(stringService.batchEdit).toHaveBeenCalledTimes(3);

      const batches = stringService.batchEdit.mock.calls.map((call) => call[0] as PatchRequest[]);

      expect(batches[0]).toHaveLength(100);
      expect(batches[1]).toHaveLength(100);
      expect(batches[2]).toHaveLength(50);
      expect(batches[0]?.[0]).toEqual({
        op: 'replace',
        path: '/1/context',
        value: 'man\n\n✨ AI Context\nai1\n✨ 🔚',
      });
      expect(loggedOutput()).toContain('Updated strings 100/250');
      expect(loggedOutput()).toContain('Updated strings 200/250');
      expect(loggedOutput()).toContain('Updated strings 250/250');
    });

    test('skips records with empty ai_context by default', async () => {
      const command = createContextCommand();
      const from = await writeRecords([record(10, 'man10', ''), record(11, 'man11', 'ai11')]);

      await command.uploadAction(createCommandContext({ from }));

      expect(stringService.batchEdit).toHaveBeenCalledTimes(1);

      const [batch] = stringService.batchEdit.mock.calls[0] as [PatchRequest[]];

      expect(batch).toHaveLength(1);
      expect(batch[0]?.path).toBe('/11/context');
    });

    test('includes records with empty ai_context when overwrite is set', async () => {
      const command = createContextCommand();
      const from = await writeRecords([record(10, 'man10', ''), record(11, 'man11', 'ai11')]);

      await command.uploadAction(createCommandContext({ from, overwrite: true }));

      const [batch] = stringService.batchEdit.mock.calls[0] as [PatchRequest[]];

      expect(batch).toHaveLength(2);
      expect(batch[0]).toEqual({ op: 'replace', path: '/10/context', value: 'man10' });
      expect(batch[1]).toEqual({
        op: 'replace',
        path: '/11/context',
        value: 'man11\n\n✨ AI Context\nai11\n✨ 🔚',
      });
    });

    test('does not call the API on dry run', async () => {
      const command = createContextCommand();
      const from = await writeRecords([record(21, 'man21', 'ai21')]);

      await command.uploadAction(createCommandContext({ from, dryrun: true }));

      expect(stringService.batchEdit).not.toHaveBeenCalled();
      expect(loggedOutput()).toContain(
        'String #21: t21 (context: man21\n\n✨ AI Context\nai21\n✨ 🔚) would be uploaded',
      );
    });

    test('fails when the file does not exist', async () => {
      const command = createContextCommand();
      const from = join(tempDir, 'missing.jsonl');

      expect(command.uploadAction(createCommandContext({ from }))).rejects.toThrow(
        new CliError(`File '${from}' not found in the Crowdin project`),
      );
    });

    test('propagates API errors', async () => {
      const command = createContextCommand();
      const from = await writeRecords([record(1, 'man', 'ai')]);

      stringService.batchEdit.mockRejectedValue(new CliError('Failed to update source strings'));

      expect(command.uploadAction(createCommandContext({ from }))).rejects.toThrow('Failed to update source strings');
    });
  });

  describe('reset', () => {
    test('resets AI context, preserving the manual part', async () => {
      const command = createContextCommand();

      fileService.listProjectFilePaths.mockResolvedValue(new Map([[101, '/first.txt']]));
      stringService.list.mockResolvedValue([
        createString({ id: 701, text: 'the-text', context: AI_CONTEXT('manual', 'ai-content') }),
        createString({ id: 702, text: 'other', context: 'just manual' }),
      ]);

      await command.resetAction(createCommandContext({ all: true }));

      expect(stringService.batchEdit).toHaveBeenCalledTimes(1);

      const [batch] = stringService.batchEdit.mock.calls[0] as [PatchRequest[]];

      expect(batch).toHaveLength(1);
      expect(batch[0]).toEqual({ op: 'replace', path: '/701/context', value: 'manual' });
      expect(loggedOutput()).toContain('Downloaded 1 strings');
      expect(loggedOutput()).toContain('Updated strings 1/1');
    });

    test('does not call the API on dry run', async () => {
      const command = createContextCommand();

      stringService.list.mockResolvedValue([
        createString({ id: 701, text: 'the-text', context: AI_CONTEXT('manual', 'ai-content') }),
      ]);

      await command.resetAction(createCommandContext({ all: true, dryrun: true }));

      expect(stringService.batchEdit).not.toHaveBeenCalled();
      expect(loggedOutput()).toContain('String #701: the-text (context: manual) would be updated');
    });

    test('requires the --all flag when no filter is provided', async () => {
      const command = createContextCommand();

      expect(command.resetAction(createCommandContext({}))).rejects.toThrow(
        new CliError("The '--all' parameter should be specified explicitly if no other filter was provided"),
      );
      expect(projectService.loadProject).not.toHaveBeenCalled();
    });

    test('does not require the --all flag when a filter is provided', async () => {
      const command = createContextCommand();

      stringService.list.mockResolvedValue([]);

      await command.resetAction(createCommandContext({ since: '2024-01-01' }));

      expect(loggedOutput()).toContain('No strings found');
    });

    test('rejects an invalid since date', async () => {
      const command = createContextCommand();

      expect(command.resetAction(createCommandContext({ since: 'invalid' }))).rejects.toThrow(
        new CliError("The '--since' parameter should be in 'YYYY-MM-DD' format"),
      );
    });

    test('warns when no strings have AI context', async () => {
      const command = createContextCommand();

      stringService.list.mockResolvedValue([createString({ id: 1, context: 'just manual' })]);

      await command.resetAction(createCommandContext({ all: true }));

      expect(stringService.batchEdit).not.toHaveBeenCalled();
      expect(loggedOutput()).toContain('No strings found');
    });
  });

  describe('status', () => {
    test('shows context coverage statistics', async () => {
      const command = createContextCommand();

      fileService.listProjectFilePaths.mockResolvedValue(new Map([[101, '/first.txt']]));
      stringService.list.mockResolvedValue([
        createString({ id: 1, context: '' }),
        createString({ id: 2, context: AI_CONTEXT('manual', 'ai') }),
        createString({ id: 3, context: 'only manual' }),
      ]);

      await command.statusAction(createCommandContext({}));

      expect(loggedOutput()).toContain('Context Status for Project "Test Project" (ID: 123)');
      expect(loggedOutput()).toContain(
        "Run 'crowdin context download --status=empty' to export strings needing context.",
      );
      expect(console.table).toHaveBeenCalledWith(
        {
          totalStrings: 3,
          withAiContext: '1 (33.33%)',
          withoutAiContext: '2 (66.67%)',
          withManualContext: '2 (66.67%)',
        },
        undefined,
      );
    });

    test('breaks down statistics per file', async () => {
      const command = createContextCommand();

      fileService.listProjectFilePaths.mockResolvedValue(
        new Map([
          [101, '/first.txt'],
          [102, '/second.txt'],
        ]),
      );
      stringService.list.mockResolvedValue([
        createString({ id: 1, fileId: 101, context: AI_CONTEXT('manual', 'ai') }),
        createString({ id: 2, fileId: 101, context: '' }),
        createString({ id: 3, fileId: 102, context: '' }),
      ]);

      await command.statusAction(createCommandContext({ byFile: true }));

      expect(console.table).toHaveBeenCalledWith(
        [
          { file: '/first.txt', total: 2, aiContext: '1 (50.00%)', missing: 1 },
          { file: '/second.txt', total: 1, aiContext: '0 (0.00%)', missing: 1 },
        ],
        undefined,
      );
    });

    test('ignores by-file for strings-based projects', async () => {
      const command = createContextCommand();

      mockProject(1);

      stringService.list.mockResolvedValue([createString({ id: 1, context: AI_CONTEXT('manual', 'ai') })]);

      await command.statusAction(createCommandContext({ byFile: true }));

      expect(console.table).toHaveBeenCalledWith(
        {
          totalStrings: 1,
          withAiContext: '1 (100.00%)',
          withoutAiContext: '0 (0.00%)',
          withManualContext: '1 (100.00%)',
        },
        undefined,
      );
    });

    test('rejects an invalid since date', async () => {
      const command = createContextCommand();

      expect(command.statusAction(createCommandContext({ since: '20-01-2024' }))).rejects.toThrow(
        new CliError("The '--since' parameter should be in 'YYYY-MM-DD' format"),
      );
    });
  });
});

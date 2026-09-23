import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { StyleGuidesModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import StyleGuideCommand from '@/cli/commands/style-guide/StyleGuideCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import ValidationError from '@/cli/errors/ValidationError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { StorageService } from '@/cli/services/StorageService.ts';
import type { StyleGuideService } from '@/cli/services/StyleGuideService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

const signedLink = (disposition?: string) =>
  `https://crowdin-style-guides.cf-downloads.crowdin.com/1/uuid-file?${
    disposition === undefined ? '' : `response-content-disposition=${encodeURIComponent(disposition)}&`
  }X-Amz-Signature=abc`;

describe('StyleGuideCommand', () => {
  let tempDir: string;
  let output: Output;
  let configuredProjectId: number | undefined;
  let styleGuideService: {
    list: ReturnType<typeof mock<StyleGuideService['list']>>;
    get: ReturnType<typeof mock<StyleGuideService['get']>>;
    add: ReturnType<typeof mock<StyleGuideService['add']>>;
    replaceFile: ReturnType<typeof mock<StyleGuideService['replaceFile']>>;
    delete: ReturnType<typeof mock<StyleGuideService['delete']>>;
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

  const createCommandContext = (options: Record<string, unknown>, args: string[] = []) =>
    ({ optsWithGlobals: () => ({ ...globalOptions, ...options }), args }) as unknown as Command;

  const createGuide = (overrides: Partial<StyleGuidesModel.StyleGuide> = {}): StyleGuidesModel.StyleGuide =>
    ({
      id: 42,
      name: 'forty-two',
      isShared: false,
      projectIds: [1],
      languageIds: null,
      aiInstructions: null,
      updatedAt: '2026-09-23T00:00:00+00:00',
      downloadLink: signedLink('attachment; filename="guide.pdf"'),
      ...overrides,
    }) as StyleGuidesModel.StyleGuide;

  const createStyleGuideCommand = () =>
    new StyleGuideCommand(
      () => output,
      async () => styleGuideService as unknown as StyleGuideService,
      async () => storageService as unknown as StorageService,
      async () => ({ projectId: configuredProjectId }) as never,
    );

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-style-guide-command-'));
    output = createOutput(globalOptions);
    configuredProjectId = 1;
    styleGuideService = {
      list: mock(async () => [] as StyleGuidesModel.StyleGuide[]),
      get: mock(async () => createGuide()),
      add: mock(async () => createGuide({ id: 43, name: 'new guide' })),
      replaceFile: mock(async () => createGuide()),
      delete: mock(async () => {}),
    };
    storageService = {
      addStorage: mock(async () => ({ data: { id: 52 } }) as never),
    };

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    mock.restore();
  });

  test('delegates default action to command help', async () => {
    const help = mock(() => {});

    await createStyleGuideCommand().defaultAction({ help } as unknown as Command);

    expect(help).toHaveBeenCalledTimes(1);
  });

  describe('list', () => {
    test('serializes the listed keys only', async () => {
      styleGuideService.list.mockResolvedValue([createGuide()]);

      await createStyleGuideCommand().listAction(createCommandContext({}));

      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify(
          [{ id: 42, name: 'forty-two', isShared: false, updatedAt: '2026-09-23T00:00:00+00:00' }],
          null,
          2,
        ),
      );
    });

    test('adds assignments to the keys with --verbose', async () => {
      styleGuideService.list.mockResolvedValue([createGuide()]);

      await createStyleGuideCommand().listAction(createCommandContext({ verbose: true }));

      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify(
          [
            {
              id: 42,
              name: 'forty-two',
              isShared: false,
              updatedAt: '2026-09-23T00:00:00+00:00',
              projectIds: [1],
              languageIds: null,
            },
          ],
          null,
          2,
        ),
      );
    });

    test('passes the configured project id to the service with --assigned', async () => {
      await createStyleGuideCommand().listAction(createCommandContext({ assigned: true }));
      await createStyleGuideCommand().listAction(createCommandContext({}));

      expect(styleGuideService.list.mock.calls).toEqual([[1], [undefined]]);
    });

    test('fails when --assigned has no project id to filter by', async () => {
      configuredProjectId = undefined;

      expect(createStyleGuideCommand().listAction(createCommandContext({ assigned: true }))).rejects.toThrow(
        "Required option 'project_id' is missing",
      );
    });

    test('reports an empty assigned listing as project-scoped', async () => {
      output = createOutput({ ...globalOptions, output: 'text' });

      await createStyleGuideCommand().listAction(createCommandContext({ assigned: true, output: 'text' }));

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No style guides assigned to the project'));
    });

    test('prints empty message when no style guides found', async () => {
      output = createOutput({ ...globalOptions, output: 'text' });

      await createStyleGuideCommand().listAction(createCommandContext({ output: 'text' }));

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No style guides found'));
    });
  });

  describe('download', () => {
    let cwd: string;

    beforeEach(() => {
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('guide-content'));
      cwd = process.cwd();
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(cwd);
    });

    test('names the file after the guide with the uploaded extension', async () => {
      await createStyleGuideCommand().downloadAction(createCommandContext({}, ['42']));

      expect(styleGuideService.get).toHaveBeenCalledWith(42);
      expect(await Bun.file(join(tempDir, 'forty-two.pdf')).text()).toBe('guide-content');
    });

    test.each([
      ['attachment; filename="AGENTS.md"', 'forty-two.md'],
      ['attachment; filename="probe guide.PDF"', 'forty-two.pdf'],
      ['attachment; filename="guide;v2.pdf"', 'forty-two.pdf'],
      ['attachment; filename=guide.docx; size=10', 'forty-two.docx'],
      ['attachment; filename="README"', 'forty-two.md'],
      ['attachment', 'forty-two.md'],
      [undefined, 'forty-two.md'],
    ])('takes the default extension from the disposition %p', async (disposition, expected) => {
      styleGuideService.get.mockResolvedValue(createGuide({ downloadLink: signedLink(disposition) }));

      await createStyleGuideCommand().downloadAction(createCommandContext({}, ['42']));

      expect(await Bun.file(join(tempDir, expected)).exists()).toBe(true);
    });

    test('keeps a name with path separators inside the working directory', async () => {
      styleGuideService.get.mockResolvedValue(createGuide({ name: '../outside' }));

      await createStyleGuideCommand().downloadAction(createCommandContext({}, ['42']));

      expect(await Bun.file(join(tempDir, '.._outside.pdf')).exists()).toBe(true);
      expect(await Bun.file(join(tempDir, '..', 'outside.pdf')).exists()).toBe(false);
    });

    test('downloads to --to', async () => {
      const to = join(tempDir, 'nested', 'guide.md');

      await createStyleGuideCommand().downloadAction(createCommandContext({ to }, ['42']));

      expect(await Bun.file(to).text()).toBe('guide-content');
    });

    test('requires a numeric id', async () => {
      expect(createStyleGuideCommand().downloadAction(createCommandContext({}, ['abc']))).rejects.toThrow(
        new ValidationError('Style guide id must be numeric'),
      );
      expect(styleGuideService.get).not.toHaveBeenCalled();
    });
  });

  describe('upload', () => {
    let file: string;

    beforeEach(async () => {
      file = join(tempDir, 'house style.md');
      await writeFile(file, '# Style');
    });

    test('creates a guide named after the file stem', async () => {
      await createStyleGuideCommand().uploadAction(createCommandContext({}, [file]));

      expect(storageService.addStorage).toHaveBeenCalledTimes(1);
      expect(styleGuideService.add).toHaveBeenCalledWith({ name: 'house style', storageId: 52 });
      expect(styleGuideService.get).toHaveBeenCalledWith(43);
    });

    test('passes name, assignments and shared flag on create', async () => {
      await createStyleGuideCommand().uploadAction(
        createCommandContext({ name: 'Brand', project: ['1', '2'], language: ['uk', 'de'] }, [file]),
      );
      await createStyleGuideCommand().uploadAction(createCommandContext({ shared: true }, [file]));

      expect(styleGuideService.add).toHaveBeenCalledWith({
        name: 'Brand',
        storageId: 52,
        projectIds: [1, 2],
        languageIds: ['uk', 'de'],
      });
      expect(styleGuideService.add).toHaveBeenCalledWith({ name: 'house style', storageId: 52, isShared: true });
    });

    test('replaces the file of an existing guide with --id', async () => {
      await createStyleGuideCommand().uploadAction(createCommandContext({ id: '42' }, [file]));

      expect(styleGuideService.replaceFile).toHaveBeenCalledWith(42, 52);
      expect(styleGuideService.add).not.toHaveBeenCalled();
    });

    test.each([
      [{ id: '42', name: 'x' }, "'--name' can't be used with '--id'"],
      [{ id: '42', project: ['1'], shared: true }, "'--project', '--shared' can't be used with '--id'"],
      [{ id: '42', language: 'uk' }, "'--language' can't be used with '--id'"],
      [{ shared: true, project: ['1'] }, "'--shared' can't be used with '--project'"],
    ])('rejects conflicting options %p', async (options, message) => {
      expect(createStyleGuideCommand().uploadAction(createCommandContext(options, [file]))).rejects.toThrow(
        new ValidationError(message),
      );
      expect(storageService.addStorage).not.toHaveBeenCalled();
    });

    test('rejects a missing file, a directory and an unsupported extension before any request', async () => {
      const directory = join(tempDir, 'dir.md');
      const text = join(tempDir, 'guide.txt');
      await mkdir(directory);
      await writeFile(text, 'x');
      const command = createStyleGuideCommand();

      expect(command.uploadAction(createCommandContext({}, [join(tempDir, 'nope.md')]))).rejects.toThrow(
        new CliError(`File '${join(tempDir, 'nope.md')}' not found`),
      );
      expect(command.uploadAction(createCommandContext({}, [directory]))).rejects.toThrow(
        new CliError('The specified file is a directory'),
      );
      expect(command.uploadAction(createCommandContext({}, [text]))).rejects.toThrow(
        new CliError('Supported formats: md, pdf, docx, xlsx'),
      );
      expect(storageService.addStorage).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    test('deletes the style guide by id', async () => {
      output = createOutput({ ...globalOptions, output: 'text' });

      await createStyleGuideCommand().deleteAction(createCommandContext({ output: 'text' }, ['42']));

      expect(styleGuideService.delete).toHaveBeenCalledWith(42);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Style guide #42 deleted successfully'));
    });

    test('requires a numeric id', async () => {
      expect(createStyleGuideCommand().deleteAction(createCommandContext({}, ['abc']))).rejects.toThrow(
        new ValidationError('Style guide id must be numeric'),
      );
      expect(styleGuideService.delete).not.toHaveBeenCalled();
    });
  });
});

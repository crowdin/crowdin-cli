import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ProjectsGroupsModel, SourceFilesModel } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import FileExistsError from '@/cli/errors/FileExistsError.ts';
import FileInUpdateError from '@/cli/errors/FileInUpdateError.ts';
import type { ProjectFileUpdate } from '@/cli/services/file/FileService.ts';
import { ProjectFileIndex } from '@/cli/services/file/ProjectFileIndex.ts';
import { computeChecksum } from '@/lib/upload/sourceCache.ts';
import {
  baseDirectoryServiceMock,
  baseFileServiceMock,
  baseProjectServiceMock,
  baseStringServiceMock,
  commandContext,
  createOutputMock,
  createUploadCommand,
  flatOptions,
} from './uploadTestHelpers.ts';

describe('UploadSourcesCommand', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-upload-command-'));
    await Bun.$`mkdir -p ${tempDir}/src ${tempDir}/locale/es`.quiet();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('defines repeatable source upload options', () => {
    const command = createUploadCommand(tempDir, createOutputMock());
    const definition = command.getDefinition();

    const topOpts = flatOptions(definition.options ?? []);
    expect(topOpts.find((o) => o.name === 'label')?.variadic).toBe(true);
    expect(topOpts.find((o) => o.name === 'excluded-language')?.variadic).toBe(true);

    const sourcesOpts = flatOptions(definition.subcommands?.find((s) => s.name === 'sources')?.options ?? []);
    expect(sourcesOpts.find((o) => o.name === 'label')?.variadic).toBe(true);
    expect(sourcesOpts.find((o) => o.name === 'excluded-language')?.variadic).toBe(true);
  });

  test('default action delegates to sources upload', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = baseProjectServiceMock();
    const directoryService = baseDirectoryServiceMock();
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      projectService,
      storageService,
      directoryService,
      fileService,
    });

    await command.defaultAction(commandContext({}));

    expect(fileService.createProjectFile).toHaveBeenCalled();
  });

  test('skips existing source file when no-auto-update is enabled', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = baseProjectServiceMock();
    const fileService = {
      loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/src/app.json' }] as never)),
      updateProjectFile: mock(async () => undefined),
      deleteProjectFile: mock(async () => undefined),
      createProjectFile: mock(async () => undefined),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, { projectService, storageService, fileService });

    await command.uploadSourcesAction(commandContext({ autoUpdate: false }));

    expect(storageService.addStorage).not.toHaveBeenCalled();
    expect(fileService.updateProjectFile).not.toHaveBeenCalled();
    expect(fileService.createProjectFile).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith("File 'src/app.json' already exists and will not be updated");
  });

  test('dry-runs source upload without mutating project', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = baseProjectServiceMock();
    const directoryService = baseDirectoryServiceMock();
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      projectService,
      storageService,
      directoryService,
      fileService,
    });

    await command.uploadSourcesAction(commandContext({ dryrun: true }));

    expect(storageService.addStorage).not.toHaveBeenCalled();
    expect(directoryService.createProjectDirectory).not.toHaveBeenCalled();
    expect(fileService.createProjectFile).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith("File 'src/app.json' would be created");
  });

  test('dry-run against a branch that does not exist yet plans every file as created', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const fileService = {
      ...baseFileServiceMock(),
      loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/src/app.json' }] as never)),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService: { addStorage: mock(async () => ({ id: 10 })) },
      fileService,
    });

    await command.uploadSourcesAction(commandContext({ dryrun: true, branch: 'feature' }));

    expect(fileService.loadIndex).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith("File 'src/app.json' would be created");
  });

  test('dry-run of a strings-based project against a branch that does not exist yet', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const projectService = {
      loadProject: mock(async () => ({
        id: 123,
        type: ProjectsGroupsModel.Type.STRINGS_BASED,
        languageMapping: {},
        targetLanguages: [],
      })),
    };
    const stringService = baseStringServiceMock();
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      projectService,
      storageService: { addStorage: mock(async () => ({ id: 10 })) },
      stringService,
    });

    await command.uploadSourcesAction(commandContext({ dryrun: true, branch: 'feature' }));

    expect(stringService.uploadStrings).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith("File 'src/app.json' would be uploaded");
  });

  test('dry-run reports the in-project path, not the local one, when preserve_hierarchy is off', async () => {
    await Bun.$`mkdir -p ${tempDir}/public/locales/en`.quiet();
    await Bun.write(`${tempDir}/public/locales/en/translation.json`, '{}');

    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService: { addStorage: mock(async () => ({ id: 10 })) },
      fileService: { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) },
      files: {
        source: '/public/locales/en/translation.json',
        translation: '/public/locales/%two_letters_code%/%original_file_name%',
      },
      config: { preserveHierarchy: false },
    });

    await command.uploadSourcesAction(commandContext({ dryrun: true }));

    expect(output.info).toHaveBeenCalledWith("File 'translation.json' would be created");
  });

  test('machine dry-run lists only files the run would upload', async () => {
    await Bun.write(`${tempDir}/src/new.json`, '{}');
    await Bun.write(`${tempDir}/src/existing.json`, '{}');
    await Bun.write(`${tempDir}/src/empty.json`, '');

    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService: { addStorage: mock(async () => ({ id: 10 })) },
      fileService: {
        ...baseFileServiceMock(),
        loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/src/existing.json' }] as never)),
      },
    });

    await command.uploadSourcesAction(commandContext({ dryrun: true, output: 'json', autoUpdate: false }));

    expect(output.list).toHaveBeenCalledTimes(1);
    expect(output.list).toHaveBeenCalledWith(['src/new.json'], expect.anything());
  });

  test('reports the in-project path for a skipped existing file when preserve_hierarchy is off', async () => {
    await Bun.$`mkdir -p ${tempDir}/public/locales/en`.quiet();
    await Bun.write(`${tempDir}/public/locales/en/translation.json`, '{}');

    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService: { addStorage: mock(async () => ({ id: 10 })) },
      fileService: {
        ...baseFileServiceMock(),
        loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/translation.json' }] as never)),
      },
      files: {
        source: '/public/locales/en/translation.json',
        translation: '/public/locales/%two_letters_code%/%original_file_name%',
      },
      config: { preserveHierarchy: false },
    });

    await command.uploadSourcesAction(commandContext({ autoUpdate: false }));

    expect(output.info).toHaveBeenCalledWith("File 'translation.json' already exists and will not be updated");
  });

  test('passes merged labels and excluded languages when creating source files', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = baseProjectServiceMock();
    const labelService = { resolveLabelIds: mock(async () => [11, 12]) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      projectService,
      storageService,
      fileService,
      labelService,
      files: { labels: ['existing-label'], excluded_target_languages: ['uk'] },
    });

    await command.uploadSourcesAction(
      commandContext({
        label: ['cli-label', 'existing-label'],
        excludedLanguage: ['es', 'uk'],
      }),
    );

    expect(labelService.resolveLabelIds).toHaveBeenCalledWith(['existing-label', 'cli-label']);
    expect(fileService.createProjectFile).toHaveBeenCalledWith({
      storageId: 10,
      name: 'app.json',
      directoryId: 1,
      branchId: undefined,
      exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
      excludedTargetLanguages: ['uk', 'es'],
      attachLabelIds: [11, 12],
    });
    expect(output.success).toHaveBeenCalledWith("File 'src/app.json'");
  });

  test('builds PropertyFileExportOptions for .properties files with escapeQuotes config', async () => {
    await Bun.write(`${tempDir}/src/app.properties`, 'key=value');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService,
      fileService,
      files: {
        source: '/src/*.properties',
        escape_quotes: 3,
        escape_special_characters: 0,
      },
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.createProjectFile).toHaveBeenCalledWith({
      storageId: 10,
      name: 'app.properties',
      directoryId: 1,
      branchId: undefined,
      exportOptions: {
        exportPattern: '/locale/%two_letters_code%/%original_file_name%',
        escapeQuotes: 3,
        escapeSpecialCharacters: 0,
      },
      excludedTargetLanguages: undefined,
      attachLabelIds: undefined,
    });
  });

  test('expands ** in the export pattern from the matched source subpath', async () => {
    await Bun.write(`${tempDir}/src/sub/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService,
      fileService,
      files: {
        source: '/src/**/*.json',
        translation: '/locale/%two_letters_code%/**/%original_file_name%',
      },
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.createProjectFile).toHaveBeenCalledWith(
      expect.objectContaining({
        exportOptions: { exportPattern: '/locale/%two_letters_code%/sub/%original_file_name%' },
      }),
    );
  });

  test('builds JavaScriptFileExportOptions with exportQuotes for .js files', async () => {
    await Bun.write(`${tempDir}/src/app.js`, 'module.exports = {};');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService,
      fileService,
      files: {
        source: '/src/*.js',
        export_quotes: 'double',
      },
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.createProjectFile).toHaveBeenCalledWith({
      storageId: 10,
      name: 'app.js',
      directoryId: 1,
      branchId: undefined,
      exportOptions: {
        exportPattern: '/locale/%two_letters_code%/%original_file_name%',
        exportQuotes: SourceFilesModel.ExportQuotes.DOUBLE,
      },
      excludedTargetLanguages: undefined,
      attachLabelIds: undefined,
    });
  });

  test('builds XmlFileImportOptions with translateContent/translateAttributes/contentSegmentation for .xml files', async () => {
    await Bun.write(`${tempDir}/src/app.xml`, '<root/>');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService,
      fileService,
      files: {
        source: '/src/*.xml',
        translate_content: true,
        translate_attributes: false,
        content_segmentation: true,
        translatable_elements: ['/string'],
      },
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.createProjectFile).toHaveBeenCalledWith({
      storageId: 10,
      name: 'app.xml',
      directoryId: 1,
      branchId: undefined,
      exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
      importOptions: {
        translateContent: true,
        translateAttributes: false,
        contentSegmentation: true,
        translatableElements: ['/string'],
      },
      excludedTargetLanguages: undefined,
      attachLabelIds: undefined,
    });
  });

  test('builds SpreadsheetFileImportOptions with scheme and firstLineContainsHeader for .csv files', async () => {
    await Bun.write(`${tempDir}/src/app.csv`, 'identifier,source\na,b');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService,
      fileService,
      files: {
        source: '/src/*.csv',
        first_line_contains_header: true,
        scheme: 'identifier,source_phrase,context',
        import_translations: true,
      },
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.createProjectFile).toHaveBeenCalledWith({
      storageId: 10,
      name: 'app.csv',
      directoryId: 1,
      branchId: undefined,
      exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
      importOptions: {
        firstLineContainsHeader: true,
        scheme: { identifier: 0, source_phrase: 1, context: 2 },
        importTranslations: true,
      },
      excludedTargetLanguages: undefined,
      attachLabelIds: undefined,
    });
  });

  test('passes file type through to createProjectFile for new files', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, { storageService, fileService, files: { type: 'android' } });

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.createProjectFile).toHaveBeenCalledWith({
      storageId: 10,
      name: 'app.json',
      directoryId: 1,
      branchId: undefined,
      exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
      excludedTargetLanguages: undefined,
      attachLabelIds: undefined,
      type: 'android',
    });
  });

  test('passes exportOptions, importOptions and updateOption when updating an existing source file', async () => {
    await Bun.write(`${tempDir}/src/app.properties`, 'key=value');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = {
      ...baseFileServiceMock(),
      loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/src/app.properties' }] as never)),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService,
      fileService,
      files: {
        source: '/src/*.properties',
        escape_quotes: 2,
        update_option: 'update_without_changes',
      },
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.updateProjectFile).toHaveBeenCalledWith(77, 10, 'src/app.properties', {
      exportOptions: {
        exportPattern: '/locale/%two_letters_code%/%original_file_name%',
        escapeQuotes: 2,
        escapeSpecialCharacters: 1,
      },
      updateOption: 'keep_translations_and_approvals',
    });
  });

  test('uploads custom segmentation file and attaches srxStorageId to import options', async () => {
    await Bun.write(`${tempDir}/src/app.xml`, '<root/>');
    await Bun.write(`${tempDir}/segmentation.srx`, '<srx/>');

    const storageService = {
      addStorage: mock(async (file: { name?: string }) => ({ id: file.name?.endsWith('.srx') ? 99 : 10 })),
    };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService,
      fileService,
      files: {
        source: '/src/*.xml',
        custom_segmentation: '/segmentation.srx',
      },
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.createProjectFile).toHaveBeenCalledWith({
      storageId: 10,
      name: 'app.xml',
      directoryId: 1,
      branchId: undefined,
      context: undefined,
      exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
      importOptions: { srxStorageId: 99 },
      type: undefined,
      excludedTargetLanguages: undefined,
      attachLabelIds: undefined,
    });
  });

  test('reuses uploaded srx storage id across multiple files sharing customSegmentation', async () => {
    await Bun.write(`${tempDir}/src/app.xml`, '<root/>');
    await Bun.write(`${tempDir}/src/other.xml`, '<root/>');
    await Bun.write(`${tempDir}/segmentation.srx`, '<srx/>');

    const srxUploads = mock(() => undefined);
    const storageService = {
      addStorage: mock(async (file: { name?: string }) => {
        if (file.name?.endsWith('.srx')) {
          srxUploads();
          return { id: 99 };
        }

        return { id: 10 };
      }),
    };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService,
      fileService,
      files: {
        source: '/src/*.xml',
        custom_segmentation: '/segmentation.srx',
      },
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(srxUploads).toHaveBeenCalledTimes(1);
    expect(fileService.createProjectFile).toHaveBeenCalledTimes(2);
    expect(fileService.createProjectFile).toHaveBeenCalledWith(
      expect.objectContaining({ importOptions: { srxStorageId: 99 } }),
    );
  });

  test('reads and attaches context file content for new source files', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.$`mkdir -p ${tempDir}/context`.quiet();
    await Bun.write(`${tempDir}/context/app.json.txt`, 'Context for app.json');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService,
      fileService,
      files: { context: '/context/%original_file_name%.txt' },
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.createProjectFile).toHaveBeenCalledWith(
      expect.objectContaining({ context: 'Context for app.json' }),
    );
  });

  test('reads and attaches context file content when updating an existing source file', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.$`mkdir -p ${tempDir}/context`.quiet();
    await Bun.write(`${tempDir}/context/app.json.txt`, 'Context for app.json');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = {
      ...baseFileServiceMock(),
      loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/src/app.json' }] as never)),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService,
      fileService,
      files: { context: '/context/%original_file_name%.txt' },
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.updateProjectFile).toHaveBeenCalledWith(77, 10, 'src/app.json', {
      exportOptions: expect.anything(),
      context: 'Context for app.json',
    });
  });

  test('sends excluded languages on update only when they differ from the project file', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const runUpload = async (projectExcluded: string[] | undefined) => {
      const storageService = { addStorage: mock(async () => ({ id: 10 })) };
      const fileService = {
        ...baseFileServiceMock(),
        loadIndex: mock(
          async () =>
            new ProjectFileIndex([
              { id: 77, path: '/src/app.json', excludedTargetLanguages: projectExcluded },
            ] as never),
        ),
      };
      const command = createUploadCommand(tempDir, createOutputMock(), {
        storageService,
        fileService,
        files: { excluded_target_languages: ['uk', 'es'] },
      });

      await command.uploadSourcesAction(commandContext({}));

      const [, , , update] = (fileService.updateProjectFile.mock.calls[0] ?? []) as unknown[];

      return (update as ProjectFileUpdate | undefined)?.excludedTargetLanguages;
    };

    // Same set, different order -> nothing to change.
    expect(await runUpload(['es', 'uk'])).toBeUndefined();
    expect(await runUpload(['uk'])).toEqual(['uk', 'es']);
    expect(await runUpload(undefined)).toEqual(['uk', 'es']);
  });

  test('does not send context when it already matches the project file', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.$`mkdir -p ${tempDir}/context`.quiet();
    await Bun.write(`${tempDir}/context/app.json.txt`, 'Context for app.json');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = {
      ...baseFileServiceMock(),
      loadIndex: mock(
        async () => new ProjectFileIndex([{ id: 77, path: '/src/app.json', context: 'Context for app.json' }] as never),
      ),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService,
      fileService,
      files: { context: '/context/%original_file_name%.txt' },
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.updateProjectFile).toHaveBeenCalledWith(77, 10, 'src/app.json', {
      exportOptions: expect.anything(),
    });
  });

  test('warns and skips context for strings-based projects', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = {
      loadProject: mock(async () => ({
        id: 123,
        type: ProjectsGroupsModel.Type.STRINGS_BASED,
        languageMapping: {},
        targetLanguages: [],
      })),
    };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const stringService = baseStringServiceMock();
    const branchService = {
      getBranch: mock(async () => ({ id: 5, name: 'main' })),
      getOrCreateBranch: mock(async () => ({ branch: { id: 5, name: 'main' }, created: false })),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      projectService,
      storageService,
      branchService,
      fileService,
      files: { context: '/context/%original_file_name%.txt' },
      stringService,
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(output.warning).toHaveBeenCalledWith('Context can not be used for string-based projects');
    expect(fileService.createProjectFile).not.toHaveBeenCalled();
    expect(stringService.uploadStrings).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 5 }),
      expect.any(String),
    );
  });

  test('warns and skips when project has no manager access and delete-obsolete/excluded-languages requested', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = {
      loadProject: mock(async () => ({ id: 123, targetLanguages: [] })),
    };
    const fileService = baseFileServiceMock();
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, { projectService, storageService, fileService });

    await command.uploadSourcesAction(commandContext({ deleteObsolete: true }));

    expect(output.warning).toHaveBeenCalledWith(
      "You must have manager or developer role in the project to apply 'excluded-languages' or/and 'delete-obsolete' options",
    );
    expect(fileService.loadIndex).not.toHaveBeenCalled();
    expect(storageService.addStorage).not.toHaveBeenCalled();
  });

  test('throws when excluded_target_languages contains a language not in the project', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService,
      files: { excluded_target_languages: ['xx'] },
    });

    expect(command.uploadSourcesAction(commandContext({}))).rejects.toThrow("Project doesn't have 'xx' language(s)");
  });

  test('warns and skips when the same destination path is produced twice', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService,
      fileService,
      config: {
        files: [
          { source: '/src/*.json', translation: '/locale/%two_letters_code%/%original_file_name%' },
          { source: '/src/app.json', translation: '/locale/%two_letters_code%/%original_file_name%' },
        ],
      },
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.createProjectFile).toHaveBeenCalledTimes(1);
    expect(output.warning).toHaveBeenCalledWith(
      "Skipping file 'src/app.json' because it is already uploading/uploaded",
    );
  });

  test('warns and skips an empty source file instead of failing the run', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, { storageService, fileService });

    await command.uploadSourcesAction(commandContext({}));

    expect(storageService.addStorage).not.toHaveBeenCalled();
    expect(fileService.createProjectFile).not.toHaveBeenCalled();
    expect(output.warning).toHaveBeenCalledWith("File 'src/app.json' was skipped since it is empty");
  });

  test('creates source files under requested branch', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = {
      loadProject: mock(async () => ({ id: 123, languageMapping: {}, targetLanguages: [] })),
    };
    const branchService = {
      getOrCreateBranch: mock(async () => ({ branch: { id: 44, name: 'feature' }, created: true })),
    };
    const fileService = {
      loadIndex: mock(async () => new ProjectFileIndex([] as never)),
      updateProjectFile: mock(async () => undefined),
      deleteProjectFile: mock(async () => undefined),
      createProjectFile: mock(async () => undefined),
    };
    const directoryService = {
      loadProjectDirectories: mock(async () => []),
      createProjectDirectory: mock(async () => ({ id: 1, path: '/src' })),
      deleteProjectDirectory: mock(async () => undefined),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      projectService,
      storageService,
      branchService,
      directoryService,
      fileService,
    });

    await command.uploadSourcesAction(commandContext({ branch: 'feature' }));

    expect(branchService.getOrCreateBranch).toHaveBeenCalledWith('feature');
    expect(fileService.loadIndex).toHaveBeenCalledWith({ id: 44, name: 'feature' });
    expect(directoryService.loadProjectDirectories).toHaveBeenCalledWith(44);
    expect(directoryService.createProjectDirectory).toHaveBeenCalledWith('src', undefined, 44);
    expect(fileService.createProjectFile).toHaveBeenCalledWith({
      storageId: 10,
      name: 'app.json',
      directoryId: 1,
      branchId: 44,
      exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
      excludedTargetLanguages: undefined,
      attachLabelIds: undefined,
    });
    expect(output.success).toHaveBeenCalledWith("Branch 'feature'");
    expect(output.success).toHaveBeenCalledWith("Directory 'src'");
    expect(output.success).toHaveBeenCalledWith("File 'src/app.json'");
  });

  test('creates directory once and reuses its id for multiple files in the same directory', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/src/utils.json`, '{}');

    let storageIdCounter = 10;
    const storageService = { addStorage: mock(async () => ({ id: storageIdCounter++ })) };
    const projectService = baseProjectServiceMock();
    const directoryService = {
      loadProjectDirectories: mock(async () => []),
      createProjectDirectory: mock(async () => ({ id: 1, path: '/src' })),
      deleteProjectDirectory: mock(async () => undefined),
    };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      projectService,
      storageService,
      directoryService,
      fileService,
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(directoryService.createProjectDirectory).toHaveBeenCalledTimes(1);
    expect(directoryService.createProjectDirectory).toHaveBeenCalledWith('src', undefined, undefined);
    expect(fileService.createProjectFile).toHaveBeenCalledTimes(2);
    expect(fileService.createProjectFile).toHaveBeenCalledWith({
      storageId: 10,
      name: 'app.json',
      directoryId: 1,
      branchId: undefined,
      exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
      excludedTargetLanguages: undefined,
      attachLabelIds: undefined,
    });
    expect(fileService.createProjectFile).toHaveBeenCalledWith({
      storageId: 11,
      name: 'utils.json',
      directoryId: 1,
      branchId: undefined,
      exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
      excludedTargetLanguages: undefined,
      attachLabelIds: undefined,
    });
    expect(output.success).toHaveBeenCalledWith("Directory 'src'");
    expect(output.success).toHaveBeenCalledWith("File 'src/app.json'");
    expect(output.success).toHaveBeenCalledWith("File 'src/utils.json'");
  });

  test('reuses existing project directory without recreating it', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = baseProjectServiceMock();
    const directoryService = {
      loadProjectDirectories: mock(async () => [{ id: 5, path: '/src' }]),
      createProjectDirectory: mock(async () => ({ id: 999, path: '/src' })),
      deleteProjectDirectory: mock(async () => undefined),
    };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      projectService,
      storageService,
      directoryService,
      fileService,
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(directoryService.createProjectDirectory).not.toHaveBeenCalled();
    expect(fileService.createProjectFile).toHaveBeenCalledWith({
      storageId: 10,
      name: 'app.json',
      directoryId: 5,
      branchId: undefined,
      exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
      excludedTargetLanguages: undefined,
      attachLabelIds: undefined,
    });
    expect(output.success).not.toHaveBeenCalledWith(expect.stringContaining('Directory'));
    expect(output.success).toHaveBeenCalledWith("File 'src/app.json'");
  });

  test('updates existing source files and creates new ones in the same run', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/src/new.json`, '{}');

    let storageIdCounter = 10;
    const storageService = { addStorage: mock(async () => ({ id: storageIdCounter++ })) };
    const projectService = baseProjectServiceMock();
    const fileService = {
      loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/src/app.json' }] as never)),
      updateProjectFile: mock(async () => undefined),
      deleteProjectFile: mock(async () => undefined),
      createProjectFile: mock(async () => undefined),
    };
    const directoryService = {
      loadProjectDirectories: mock(async () => [{ id: 5, path: '/src' }]),
      createProjectDirectory: mock(async () => ({ id: 5, path: '/src' })),
      deleteProjectDirectory: mock(async () => undefined),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      projectService,
      storageService,
      directoryService,
      fileService,
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.updateProjectFile).toHaveBeenCalledWith(77, expect.any(Number), 'src/app.json', {
      exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
    });
    expect(fileService.createProjectFile).toHaveBeenCalledWith({
      storageId: expect.any(Number),
      name: 'new.json',
      directoryId: 5,
      branchId: undefined,
      exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
      excludedTargetLanguages: undefined,
      attachLabelIds: undefined,
    });
    expect(directoryService.createProjectDirectory).not.toHaveBeenCalled();
    expect(output.success).toHaveBeenCalledWith("File 'src/app.json'");
    expect(output.success).toHaveBeenCalledWith("File 'src/new.json'");
  });

  test('soft-matches an existing project file by extension and renames it on update', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = baseProjectServiceMock();
    const fileService = {
      ...baseFileServiceMock(),
      // Project has the same file with a different extension -> soft match.
      loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/src/app.xml' }] as never)),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, { projectService, storageService, fileService });

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.createProjectFile).not.toHaveBeenCalled();
    expect(fileService.updateProjectFile).toHaveBeenCalledWith(77, 10, 'src/app.json', {
      exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
      name: 'app.json',
    });
    expect(output.success).toHaveBeenCalledWith("File 'src/app.json'");
  });

  test('skips update when --cache is set and file checksum matches cached hash', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const checksum = await computeChecksum(Bun.file(`${tempDir}/src/app.json`));
    await Bun.write(`${tempDir}/.crowdin/cache.json`, JSON.stringify({ sourceHashes: { 'src/app.json': checksum } }));

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = baseProjectServiceMock();
    const fileService = {
      ...baseFileServiceMock(),
      loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/src/app.json' }] as never)),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, { projectService, storageService, fileService });

    await command.uploadSourcesAction(commandContext({ cache: true }));

    expect(storageService.addStorage).not.toHaveBeenCalled();
    expect(fileService.updateProjectFile).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith("File 'src/app.json' was skipped since it is up to date");
  });

  test('updates file and refreshes cache entry when content changed with --cache', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{"key": "new value"}');
    await Bun.write(
      `${tempDir}/.crowdin/cache.json`,
      JSON.stringify({ sourceHashes: { 'src/app.json': 'stale-hash' } }),
    );

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = baseProjectServiceMock();
    const fileService = {
      ...baseFileServiceMock(),
      loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/src/app.json' }] as never)),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, { projectService, storageService, fileService });

    await command.uploadSourcesAction(commandContext({ cache: true }));

    expect(fileService.updateProjectFile).toHaveBeenCalled();
    expect(output.success).toHaveBeenCalledWith("File 'src/app.json'");

    const expectedChecksum = await computeChecksum(Bun.file(`${tempDir}/src/app.json`));
    const cache = await Bun.file(`${tempDir}/.crowdin/cache.json`).json();
    expect(cache.sourceHashes['src/app.json']).toBe(expectedChecksum);
  });

  test('writes cache file with checksums for newly created files when --cache is set', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = baseProjectServiceMock();
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, { projectService, storageService, fileService });

    await command.uploadSourcesAction(commandContext({ cache: true }));

    expect(fileService.createProjectFile).toHaveBeenCalled();

    const expectedChecksum = await computeChecksum(Bun.file(`${tempDir}/src/app.json`));
    const cache = await Bun.file(`${tempDir}/.crowdin/cache.json`).json();
    expect(cache.sourceHashes['src/app.json']).toBe(expectedChecksum);
  });

  test('does not read or write cache file when --cache is not set', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(
      `${tempDir}/.crowdin/cache.json`,
      JSON.stringify({ sourceHashes: { 'src/app.json': 'some-hash' } }),
    );

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = baseProjectServiceMock();
    const fileService = {
      ...baseFileServiceMock(),
      loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/src/app.json' }] as never)),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, { projectService, storageService, fileService });

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.updateProjectFile).toHaveBeenCalled();

    const cache = await Bun.file(`${tempDir}/.crowdin/cache.json`).json();
    expect(cache.sourceHashes).toEqual({ 'src/app.json': 'some-hash' });
  });

  test('deletes obsolete files only under the configured source pattern', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = baseProjectServiceMock();
    const fileService = {
      loadIndex: mock(
        async () =>
          new ProjectFileIndex([
            { id: 77, path: '/src/app.json' }, // retained (local source)
            { id: 88, path: '/src/legacy/stale.json' }, // obsolete, under source pattern
            { id: 99, path: '/external/keep.json' }, // outside source pattern -> must be kept
          ] as never),
      ),
      updateProjectFile: mock(async () => undefined),
      deleteProjectFile: mock(async () => undefined),
      createProjectFile: mock(async () => undefined),
    };
    const directoryService = {
      loadProjectDirectories: mock(async () => [
        { id: 1, path: '/src' },
        { id: 3, path: '/src/legacy' },
        { id: 4, path: '/external' },
      ]),
      createProjectDirectory: mock(async () => ({ id: 1, path: '/src' })),
      deleteProjectDirectory: mock(async () => undefined),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      projectService,
      storageService,
      directoryService,
      fileService,
      files: { source: '/src/**/*.json' },
    });

    await command.uploadSourcesAction(commandContext({ deleteObsolete: true, autoUpdate: false }));

    // Obsolete file under the source pattern is deleted, along with its now-empty directory.
    expect(fileService.deleteProjectFile).toHaveBeenCalledWith(88, '/src/legacy/stale.json');
    expect(directoryService.deleteProjectDirectory).toHaveBeenCalledWith(3, '/src/legacy');
    // File and directory outside every source pattern are left untouched.
    expect(fileService.deleteProjectFile).not.toHaveBeenCalledWith(99, expect.anything());
    expect(directoryService.deleteProjectDirectory).not.toHaveBeenCalledWith(4, '/external');
    expect(directoryService.deleteProjectDirectory).not.toHaveBeenCalledWith(1, '/src');
    expect(output.success).toHaveBeenCalledWith("'src/legacy/stale.json' file was deleted");
    expect(output.success).toHaveBeenCalledWith("'src/legacy/' directory was deleted");
  });

  test('reports when there is nothing obsolete to delete', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = baseProjectServiceMock();
    const fileService = {
      loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/src/app.json' }] as never)),
      updateProjectFile: mock(async () => undefined),
      deleteProjectFile: mock(async () => undefined),
      createProjectFile: mock(async () => undefined),
    };
    const directoryService = {
      loadProjectDirectories: mock(async () => [{ id: 1, path: '/src' }]),
      createProjectDirectory: mock(async () => ({ id: 1, path: '/src' })),
      deleteProjectDirectory: mock(async () => undefined),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      projectService,
      storageService,
      directoryService,
      fileService,
      files: { source: '/src/**/*.json' },
    });

    await command.uploadSourcesAction(commandContext({ deleteObsolete: true, autoUpdate: false }));

    expect(fileService.deleteProjectFile).not.toHaveBeenCalled();
    expect(directoryService.deleteProjectDirectory).not.toHaveBeenCalled();
    expect(output.success).toHaveBeenCalledWith('No obsolete files were found');
    expect(output.success).toHaveBeenCalledWith('No obsolete directories found');
  });

  test('dry-runs obsolete project deletion without mutating project', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = baseProjectServiceMock();
    const fileService = {
      loadIndex: mock(
        async () =>
          new ProjectFileIndex([
            { id: 77, path: '/src/app.json' },
            { id: 88, path: '/src/legacy/stale.json' },
            { id: 99, path: '/external/keep.json' },
          ] as never),
      ),
      updateProjectFile: mock(async () => undefined),
      deleteProjectFile: mock(async () => undefined),
      createProjectFile: mock(async () => undefined),
    };
    const directoryService = {
      loadProjectDirectories: mock(async () => [
        { id: 1, path: '/src' },
        { id: 3, path: '/src/legacy' },
        { id: 4, path: '/external' },
      ]),
      createProjectDirectory: mock(async () => ({ id: 1, path: '/src' })),
      deleteProjectDirectory: mock(async () => undefined),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      projectService,
      storageService,
      directoryService,
      fileService,
      files: { source: '/src/**/*.json' },
    });

    await command.uploadSourcesAction(commandContext({ deleteObsolete: true, dryrun: true }));

    expect(fileService.deleteProjectFile).not.toHaveBeenCalled();
    expect(directoryService.deleteProjectDirectory).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith("'src/legacy/stale.json' file would be deleted");
    expect(output.info).toHaveBeenCalledWith("'src/legacy/' directory would be deleted");
    // Outside the source pattern -> not reported as obsolete.
    expect(output.info).not.toHaveBeenCalledWith("'external/keep.json' file would be deleted");
  });

  test('uploads source strings for a strings-based project and polls until finished', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = {
      loadProject: mock(async () => ({
        id: 123,
        type: ProjectsGroupsModel.Type.STRINGS_BASED,
        languageMapping: {},
        targetLanguages: [],
      })),
    };
    const branchService = {
      getBranch: mock(async () => ({ id: 5, name: 'main' })),
      getOrCreateBranch: mock(async () => ({ branch: { id: 5, name: 'main' }, created: false })),
    };

    const stringService = {
      uploadStrings: mock(async () => undefined),
    };

    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      projectService,
      storageService,
      branchService,
      stringService,
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(stringService.uploadStrings).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 5, storageId: 10 }),
      'src/app.json',
    );
    expect(output.success).toHaveBeenCalledWith("File 'src/app.json'");
  });

  test('throws if strings-based project upload requires a branch and none provided', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = {
      loadProject: mock(async () => ({
        id: 123,
        type: ProjectsGroupsModel.Type.STRINGS_BASED,
        languageMapping: {},
        targetLanguages: [],
      })),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, { projectService, storageService });

    expect(command.uploadSourcesAction(commandContext({}))).rejects.toThrow(
      'A branch is required to upload sources for a strings-based project',
    );
  });

  test('throws/surfaces error if string upload status becomes failed', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const projectService = {
      loadProject: mock(async () => ({
        id: 123,
        type: ProjectsGroupsModel.Type.STRINGS_BASED,
        languageMapping: {},
        targetLanguages: [],
      })),
    };
    const branchService = {
      getBranch: mock(async () => ({ id: 5, name: 'main' })),
      getOrCreateBranch: mock(async () => ({ branch: { id: 5, name: 'main' }, created: false })),
    };
    // A failed status makes the service throw (StringService.test covers the poll); the command
    // aggregates it into the generic execution error and reports the per-file message.
    const stringService = {
      uploadStrings: mock(async () => {
        throw new CliError('Failed to upload strings for file src/app.json');
      }),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      projectService,
      storageService,
      branchService,
      stringService,
    });

    expect(command.uploadSourcesAction(commandContext({}))).rejects.toThrow('Current execution finished with errors');
    expect(output.error).toHaveBeenCalledWith('Failed to upload strings for file src/app.json');
  });

  test('excludes files matching ignore patterns from source upload', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/src/ignore-me.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const command = createUploadCommand(tempDir, createOutputMock(), {
      storageService,
      fileService,
      files: { ignore: ['src/ignore-me.json'] },
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.createProjectFile).toHaveBeenCalledTimes(1);
    const createCalls = fileService.createProjectFile.mock.calls as SourceFilesModel.CreateFileRequest[][];
    expect(createCalls[0]?.[0]?.name).toBe('app.json');
  });

  test('strips the common path when preserve_hierarchy is disabled', async () => {
    await Bun.$`mkdir -p ${tempDir}/src/sub`.quiet();
    await Bun.write(`${tempDir}/src/sub/a.json`, '{}');
    await Bun.write(`${tempDir}/src/sub/b.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const directoryService = baseDirectoryServiceMock();
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const command = createUploadCommand(tempDir, createOutputMock(), {
      storageService,
      directoryService,
      fileService,
      files: { source: '/src/**/*.json' },
      config: { preserveHierarchy: false },
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(directoryService.createProjectDirectory).not.toHaveBeenCalled();

    const createCalls = fileService.createProjectFile.mock.calls as SourceFilesModel.CreateFileRequest[][];
    const names = createCalls.map((call) => call[0]?.name).sort();

    expect(names).toEqual(['a.json', 'b.json']);

    for (const call of createCalls) {
      expect(call[0]?.directoryId).toBeUndefined();
    }
  });

  test('preserves hierarchy and creates directories when preserve_hierarchy is enabled', async () => {
    await Bun.$`mkdir -p ${tempDir}/src/sub`.quiet();
    await Bun.write(`${tempDir}/src/sub/a.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const directoryService = baseDirectoryServiceMock();
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const command = createUploadCommand(tempDir, createOutputMock(), {
      storageService,
      directoryService,
      fileService,
      files: { source: '/src/**/*.json' },
      config: { preserveHierarchy: true },
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(directoryService.createProjectDirectory).toHaveBeenCalled();
    const createCalls = fileService.createProjectFile.mock.calls as SourceFilesModel.CreateFileRequest[][];
    expect(createCalls[0]?.[0]?.name).toBe('a.json');
  });

  test('uploads to the dest path when dest is configured', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const directoryService = baseDirectoryServiceMock();
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const command = createUploadCommand(tempDir, createOutputMock(), {
      storageService,
      directoryService,
      fileService,
      files: { dest: '/foo/%original_file_name%' },
      config: { preserveHierarchy: true },
    });

    await command.uploadSourcesAction(commandContext({}));

    expect(directoryService.createProjectDirectory).toHaveBeenCalled();
    const directoryCalls = directoryService.createProjectDirectory.mock.calls as string[][];
    expect(directoryCalls[0]?.[0]).toBe('foo');
    const createCalls = fileService.createProjectFile.mock.calls as SourceFilesModel.CreateFileRequest[][];
    expect(createCalls[0]?.[0]?.name).toBe('app.json');
  });

  test('reports a source pattern that matches no files and still uploads the remaining groups', async () => {
    await Bun.write(`${tempDir}/other/app.json`, '{}');

    const output = createOutputMock();
    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const command = createUploadCommand(tempDir, output, {
      storageService,
      fileService,
      config: {
        files: [
          { source: '/src/*.json', translation: '/locale/%two_letters_code%/%original_file_name%' },
          { source: '/other/*.json', translation: '/locale/%two_letters_code%/%original_file_name%' },
        ],
      },
    });

    expect(command.uploadSourcesAction(commandContext({}))).rejects.toThrow('Current execution finished with errors');

    expect(output.error).toHaveBeenCalledWith(
      "No sources found for '/src/*.json' pattern. Check the source paths in your configuration file",
    );
    const createCalls = fileService.createProjectFile.mock.calls as SourceFilesModel.CreateFileRequest[][];
    expect(createCalls[0]?.[0]?.name).toBe('app.json');
  });

  // A plain consumer is a script, so the exit code is kept and only the message is dropped,
  // same as `upload translations`.
  test('keeps the exit code in plain, message suppressed, when a pattern matches nothing', async () => {
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, {
      storageService: { addStorage: mock(async () => ({ id: 10 })) },
      config: { files: [{ source: '/src/*.json', translation: '/locale/%two_letters_code%/%original_file_name%' }] },
    });

    expect(command.uploadSourcesAction(commandContext({ output: 'plain' }))).rejects.toThrow(
      'Current execution finished with errors',
    );

    expect(output.error).not.toHaveBeenCalled();
  });

  test('warns and skips when an existing source file is currently being updated', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = {
      ...baseFileServiceMock(),
      loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/src/app.json' }] as never)),
      updateProjectFile: mock(async () => {
        throw new FileInUpdateError();
      }),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, { storageService, fileService });

    await command.uploadSourcesAction(commandContext({}));

    expect(output.warning).toHaveBeenCalledWith("File 'src/app.json' is currently being updated");
    expect(output.success).not.toHaveBeenCalled();
  });

  test('reports the file-already-exists message and fails the run', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = {
      ...baseFileServiceMock(),
      createProjectFile: mock(async () => {
        throw new FileExistsError();
      }),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, { storageService, fileService });

    expect(command.uploadSourcesAction(commandContext({}))).rejects.toThrow('Current execution finished with errors');
    expect(output.error).toHaveBeenCalledWith("Project already contains the file 'src/app.json'");
  });

  test('reports every failed file when multiple uploads fail', async () => {
    await Bun.write(`${tempDir}/src/a.json`, '{}');
    await Bun.write(`${tempDir}/src/b.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ id: 10 })) };
    const fileService = {
      ...baseFileServiceMock(),
      createProjectFile: mock(async (data: SourceFilesModel.CreateFileRequest) => {
        throw new CliError(`boom ${data.name}`);
      }),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, { storageService, fileService });

    expect(command.uploadSourcesAction(commandContext({}))).rejects.toThrow('Current execution finished with errors');
    expect(output.error).toHaveBeenCalledWith('boom a.json');
    expect(output.error).toHaveBeenCalledWith('boom b.json');
  });

  // output.success is text-only, so before this the machine formats saw an empty stdout for a
  // command that had uploaded real files.
  describe('machine-format summary', () => {
    const summaryOf = (output: ReturnType<typeof createOutputMock>) =>
      (output.list as unknown as { mock: { calls: unknown[][] } }).mock.calls.at(-1)?.[0];

    test('reports what became of each file', async () => {
      await Bun.write(`${tempDir}/src/created.json`, '{}');
      await Bun.write(`${tempDir}/src/updated.json`, '{}');

      const output = createOutputMock();
      const command = createUploadCommand(tempDir, output, {
        storageService: { addStorage: mock(async () => ({ id: 10 })) },
        fileService: {
          ...baseFileServiceMock(),
          loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/src/updated.json' }] as never)),
        },
      });

      await command.uploadSourcesAction(commandContext({ output: 'json' }));

      expect(summaryOf(output)).toEqual([
        { path: 'src/created.json', action: 'created' },
        { path: 'src/updated.json', action: 'updated' },
      ]);
    });

    test('records why a file was skipped', async () => {
      await Bun.write(`${tempDir}/src/app.json`, '{}');

      const output = createOutputMock();
      const command = createUploadCommand(tempDir, output, {
        storageService: { addStorage: mock(async () => ({ id: 10 })) },
        fileService: {
          ...baseFileServiceMock(),
          loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/src/app.json' }] as never)),
        },
      });

      await command.uploadSourcesAction(commandContext({ output: 'json', autoUpdate: false }));

      expect(summaryOf(output)).toEqual([{ path: 'src/app.json', action: 'skipped', reason: 'auto-update disabled' }]);
    });

    test('records a file that is currently being updated as skipped', async () => {
      await Bun.write(`${tempDir}/src/app.json`, '{}');

      const output = createOutputMock();
      const command = createUploadCommand(tempDir, output, {
        storageService: { addStorage: mock(async () => ({ id: 10 })) },
        fileService: {
          ...baseFileServiceMock(),
          loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/src/app.json' }] as never)),
          updateProjectFile: mock(async () => {
            throw new FileInUpdateError();
          }),
        },
      });

      await command.uploadSourcesAction(commandContext({ output: 'json' }));

      expect(summaryOf(output)).toEqual([{ path: 'src/app.json', action: 'skipped', reason: 'being updated' }]);
    });

    // plain is line-oriented and cannot carry the action, so it lists only what changed and
    // prints nothing for a skipped file.
    test('lists only changed files in plain', async () => {
      await Bun.write(`${tempDir}/src/uploaded.json`, '{}');
      await Bun.write(`${tempDir}/src/kept.json`, '{}');

      const output = createOutputMock();
      const command = createUploadCommand(tempDir, output, {
        storageService: { addStorage: mock(async () => ({ id: 10 })) },
        fileService: {
          ...baseFileServiceMock(),
          loadIndex: mock(async () => new ProjectFileIndex([{ id: 77, path: '/src/kept.json' }] as never)),
        },
      });

      await command.uploadSourcesAction(commandContext({ output: 'plain', autoUpdate: false }));

      expect(summaryOf(output)).toEqual([{ path: 'src/uploaded.json', action: 'created' }]);
    });

    // Uploads run concurrently, so records land in completion order. Both files take the same
    // path here and the one that sorts first is delayed, so the assertion turns on the sort
    // rather than on which branch of the upload happens to be quicker.
    test('sorts by path regardless of which upload finished first', async () => {
      await Bun.write(`${tempDir}/src/a.json`, '{}');
      await Bun.write(`${tempDir}/src/b.json`, '{}');

      const output = createOutputMock();
      const command = createUploadCommand(tempDir, output, {
        storageService: { addStorage: mock(async () => ({ id: 10 })) },
        fileService: {
          ...baseFileServiceMock(),
          createProjectFile: mock(async (request: SourceFilesModel.CreateFileRequest) => {
            await Bun.sleep(request.name === 'a.json' ? 30 : 0);
          }),
        },
      });

      await command.uploadSourcesAction(commandContext({ output: 'json' }));

      expect((summaryOf(output) as { path: string }[]).map(({ path }) => path)).toEqual(['src/a.json', 'src/b.json']);
    });

    test('stays quiet in text, which already prints a line per file', async () => {
      await Bun.write(`${tempDir}/src/app.json`, '{}');

      const output = createOutputMock();
      const command = createUploadCommand(tempDir, output, {
        storageService: {
          addStorage: mock(async () => ({ id: 10 })),
        },
      });

      await command.uploadSourcesAction(commandContext({}));

      expect(output.list).not.toHaveBeenCalled();
      expect(output.success).toHaveBeenCalledWith("File 'src/app.json'");
    });
  });
});

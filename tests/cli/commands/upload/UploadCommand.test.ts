import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ProjectsGroupsModel, SourceFilesModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import UploadCommand from '@/cli/commands/upload/UploadCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { BranchService } from '@/cli/services/BranchService.ts';
import type { DirectoryService } from '@/cli/services/DirectoryService.ts';
import { FileExistsError, FileInUpdateError, type FileService } from '@/cli/services/FileService.ts';
import type { LabelService } from '@/cli/services/LabelService.ts';
import type { ProjectService } from '@/cli/services/ProjectService.ts';
import type { StorageService } from '@/cli/services/StorageService.ts';
import type { StringService } from '@/cli/services/StringService.ts';
import { type TranslationService, WrongLanguageError } from '@/cli/services/TranslationService.ts';
import type { OptionDef, OptionGroupDef } from '@/cli/types.ts';
import { ConfigSchema } from '@/lib/config.ts';
import { computeChecksum } from '@/lib/upload/sourceCache.ts';

function flatOptions(options: (OptionDef | OptionGroupDef)[]): OptionDef[] {
  return options.flatMap((item) => ('group' in item ? item.options : [item]));
}

describe('UploadCommand', () => {
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

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = baseProjectServiceMock();
    const directoryService = baseDirectoryServiceMock();
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      directoryService,
      fileService,
    );

    await command.defaultAction(commandContext({}));

    expect(fileService.createProjectFile).toHaveBeenCalled();
  });

  test('skips existing source file when no-auto-update is enabled', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = baseProjectServiceMock();
    const fileService = {
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
      updateProjectFile: mock(async () => undefined),
      deleteProjectFile: mock(async () => undefined),
      createProjectFile: mock(async () => undefined),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
    );

    await command.uploadSourcesAction(commandContext({ noAutoUpdate: true }));

    expect(storageService.addStorage).not.toHaveBeenCalled();
    expect(fileService.updateProjectFile).not.toHaveBeenCalled();
    expect(fileService.createProjectFile).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith('File src/app.json already exists and will not be updated');
  });

  test('dry-runs source upload without mutating project', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = baseProjectServiceMock();
    const directoryService = baseDirectoryServiceMock();
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      directoryService,
      fileService,
    );

    await command.uploadSourcesAction(commandContext({ dryrun: true }));

    expect(storageService.addStorage).not.toHaveBeenCalled();
    expect(directoryService.createProjectDirectory).not.toHaveBeenCalled();
    expect(fileService.createProjectFile).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith('File src/app.json would be created');
  });

  test('passes merged labels and excluded languages when creating source files', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = baseProjectServiceMock();
    const labelService = { resolveLabelIds: mock(async () => [11, 12]) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      labelService,
      baseTranslationServiceMock(),
      { labels: ['existing-label'], excluded_target_languages: ['uk'] },
    );

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

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      {
        source: '/src/*.properties',
        escape_quotes: 3,
        escape_special_characters: 0,
      },
    );

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

  test('builds JavaScriptFileExportOptions with exportQuotes for .js files', async () => {
    await Bun.write(`${tempDir}/src/app.js`, 'module.exports = {};');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      {
        source: '/src/*.js',
        export_quotes: 'double',
      },
    );

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

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      {
        source: '/src/*.xml',
        translate_content: true,
        translate_attributes: false,
        content_segmentation: true,
        translatable_elements: ['/string'],
      },
    );

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

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      {
        source: '/src/*.csv',
        first_line_contains_header: true,
        scheme: 'identifier,source_phrase,context',
        import_translations: true,
      },
    );

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

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      { type: 'android' },
    );

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

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const fileService = {
      ...baseFileServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.properties' } }] })),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      {
        source: '/src/*.properties',
        escape_quotes: 2,
        update_option: 'keep_translations_and_approvals',
      },
    );

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.updateProjectFile).toHaveBeenCalledWith(
      77,
      10,
      'src/app.properties',
      {
        exportPattern: '/locale/%two_letters_code%/%original_file_name%',
        escapeQuotes: 2,
        escapeSpecialCharacters: 1,
      },
      undefined,
      'keep_translations_and_approvals',
      undefined,
      undefined,
    );
  });

  test('uploads custom segmentation file and attaches srxStorageId to import options', async () => {
    await Bun.write(`${tempDir}/src/app.xml`, '<root/>');
    await Bun.write(`${tempDir}/segmentation.srx`, '<srx/>');

    const storageService = {
      addStorage: mock(async (file: { name?: string }) => ({ data: { id: file.name?.endsWith('.srx') ? 99 : 10 } })),
    };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      {
        source: '/src/*.xml',
        custom_segmentation: '/segmentation.srx',
      },
    );

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
          return { data: { id: 99 } };
        }

        return { data: { id: 10 } };
      }),
    };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      {
        source: '/src/*.xml',
        custom_segmentation: '/segmentation.srx',
      },
    );

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

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      { context: '/context/%original_file_name%.txt' },
    );

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.createProjectFile).toHaveBeenCalledWith(
      expect.objectContaining({ context: 'Context for app.json' }),
    );
  });

  test('warns and skips context for strings-based projects', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: {
          id: 123,
          type: ProjectsGroupsModel.Type.STRINGS_BASED,
          languageMapping: {},
          targetLanguages: [],
        },
      })),
    };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const stringService = baseStringServiceMock();
    const branchService = {
      getBranch: mock(async () => ({ id: 5, name: 'main' })),
      getOrCreateBranch: mock(async () => ({ id: 5, name: 'main' })),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      branchService,
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      { context: '/context/%original_file_name%.txt' },
      {},
      stringService,
    );

    await command.uploadSourcesAction(commandContext({}));

    expect(output.warning).toHaveBeenCalledWith('Context can not be used for string-based projects');
    expect(fileService.createProjectFile).not.toHaveBeenCalled();
    expect(stringService.uploadStrings).toHaveBeenCalledWith(expect.objectContaining({ branchId: 5 }));
  });

  test('warns and skips when project has no manager access and delete-obsolete/excluded-languages requested', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({ data: { id: 123, targetLanguages: [] } })),
    };
    const fileService = baseFileServiceMock();
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
    );

    await command.uploadSourcesAction(commandContext({ deleteObsolete: true }));

    expect(output.warning).toHaveBeenCalledWith(
      "You must have manager or developer role in the project to apply 'excluded-languages' or/and 'delete-obsolete' options",
    );
    expect(fileService.loadProjectFiles).not.toHaveBeenCalled();
    expect(storageService.addStorage).not.toHaveBeenCalled();
  });

  test('warns and skips upload translations when project has no manager access', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({ data: { id: 123, targetLanguages: [language('es', 'es', 'spa')] } })),
    };
    const translationService = { importProjectTranslation: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      baseFileServiceMock(),
      baseLabelServiceMock(),
      translationService,
    );

    await command.uploadTranslationsAction(commandContext({}));

    expect(output.warning).toHaveBeenCalledWith(
      'You must have manager or developer role in the project to perform this action',
    );
    expect(translationService.importProjectTranslation).not.toHaveBeenCalled();
  });

  test('throws when excluded_target_languages contains a language not in the project', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      baseFileServiceMock(),
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      { excluded_target_languages: ['xx'] },
    );

    expect(command.uploadSourcesAction(commandContext({}))).rejects.toThrow("Project doesn't have 'xx' language(s)");
  });

  test('warns and skips when the same destination path is produced twice', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      {},
      {
        files: [
          { source: '/src/*.json', translation: '/locale/%two_letters_code%/%original_file_name%' },
          { source: '/src/app.json', translation: '/locale/%two_letters_code%/%original_file_name%' },
        ],
      },
    );

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.createProjectFile).toHaveBeenCalledTimes(1);
    expect(output.warning).toHaveBeenCalledWith(
      "Skipping file 'src/app.json' because it is already uploading/uploaded",
    );
  });

  test('warns and skips an empty source file instead of failing the run', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
    );

    await command.uploadSourcesAction(commandContext({}));

    expect(storageService.addStorage).not.toHaveBeenCalled();
    expect(fileService.createProjectFile).not.toHaveBeenCalled();
    expect(output.warning).toHaveBeenCalledWith("File 'src/app.json' was skipped since it is empty");
  });

  test('creates source files under requested branch', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({ data: { id: 123, languageMapping: {}, targetLanguages: [] } })),
    };
    const branchService = { getOrCreateBranch: mock(async () => ({ id: 44, name: 'feature' })) };
    const fileService = {
      loadProjectFiles: mock(async () => ({ data: [] })),
      updateProjectFile: mock(async () => undefined),
      deleteProjectFile: mock(async () => undefined),
      createProjectFile: mock(async () => undefined),
    };
    const directoryService = {
      loadProjectDirectories: mock(async () => []),
      createProjectDirectory: mock(async () => ({ data: { id: 1, path: '/src' } })),
      deleteProjectDirectory: mock(async () => undefined),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      branchService,
      directoryService,
      fileService,
    );

    await command.uploadSourcesAction(commandContext({ branch: 'feature' }));

    expect(branchService.getOrCreateBranch).toHaveBeenCalledWith('feature');
    expect(fileService.loadProjectFiles).toHaveBeenCalledWith(44);
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
    expect(output.success).toHaveBeenCalledWith('Directory src created');
    expect(output.success).toHaveBeenCalledWith("File 'src/app.json'");
  });

  test('creates directory once and reuses its id for multiple files in the same directory', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/src/utils.json`, '{}');

    let storageIdCounter = 10;
    const storageService = { addStorage: mock(async () => ({ data: { id: storageIdCounter++ } })) };
    const projectService = baseProjectServiceMock();
    const directoryService = {
      loadProjectDirectories: mock(async () => []),
      createProjectDirectory: mock(async () => ({ data: { id: 1, path: '/src' } })),
      deleteProjectDirectory: mock(async () => undefined),
    };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      directoryService,
      fileService,
    );

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
    expect(output.success).toHaveBeenCalledWith('Directory src created');
    expect(output.success).toHaveBeenCalledWith("File 'src/app.json'");
    expect(output.success).toHaveBeenCalledWith("File 'src/utils.json'");
  });

  test('reuses existing project directory without recreating it', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = baseProjectServiceMock();
    const directoryService = {
      loadProjectDirectories: mock(async () => [{ data: { id: 5, path: '/src' } }]),
      createProjectDirectory: mock(async () => ({ data: { id: 999, path: '/src' } })),
      deleteProjectDirectory: mock(async () => undefined),
    };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      directoryService,
      fileService,
    );

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
    const storageService = { addStorage: mock(async () => ({ data: { id: storageIdCounter++ } })) };
    const projectService = baseProjectServiceMock();
    const fileService = {
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
      updateProjectFile: mock(async () => undefined),
      deleteProjectFile: mock(async () => undefined),
      createProjectFile: mock(async () => undefined),
    };
    const directoryService = {
      loadProjectDirectories: mock(async () => [{ data: { id: 5, path: '/src' } }]),
      createProjectDirectory: mock(async () => ({ data: { id: 5, path: '/src' } })),
      deleteProjectDirectory: mock(async () => undefined),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      directoryService,
      fileService,
    );

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.updateProjectFile).toHaveBeenCalledWith(
      77,
      expect.any(Number),
      'src/app.json',
      { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
      undefined,
      undefined,
      undefined,
      undefined,
    );
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

  test('skips update when --cache is set and file checksum matches cached hash', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const checksum = await computeChecksum(Bun.file(`${tempDir}/src/app.json`));
    await Bun.write(`${tempDir}/.crowdin/cache.json`, JSON.stringify({ sourceHashes: { 'src/app.json': checksum } }));

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = baseProjectServiceMock();
    const fileService = {
      ...baseFileServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
    );

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

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = baseProjectServiceMock();
    const fileService = {
      ...baseFileServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
    );

    await command.uploadSourcesAction(commandContext({ cache: true }));

    expect(fileService.updateProjectFile).toHaveBeenCalled();
    expect(output.success).toHaveBeenCalledWith("File 'src/app.json'");

    const expectedChecksum = await computeChecksum(Bun.file(`${tempDir}/src/app.json`));
    const cache = await Bun.file(`${tempDir}/.crowdin/cache.json`).json();
    expect(cache.sourceHashes['src/app.json']).toBe(expectedChecksum);
  });

  test('writes cache file with checksums for newly created files when --cache is set', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = baseProjectServiceMock();
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
    );

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

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = baseProjectServiceMock();
    const fileService = {
      ...baseFileServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
    );

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.updateProjectFile).toHaveBeenCalled();

    const cache = await Bun.file(`${tempDir}/.crowdin/cache.json`).json();
    expect(cache.sourceHashes).toEqual({ 'src/app.json': 'some-hash' });
  });

  test('deletes obsolete project files and directories', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = baseProjectServiceMock();
    const fileService = {
      loadProjectFiles: mock(async () => ({
        data: [{ data: { id: 77, path: '/src/app.json' } }, { data: { id: 88, path: '/old/removed.json' } }],
      })),
      updateProjectFile: mock(async () => undefined),
      deleteProjectFile: mock(async () => undefined),
      createProjectFile: mock(async () => undefined),
    };
    const directoryService = {
      loadProjectDirectories: mock(async () => [{ data: { id: 1, path: '/src' } }, { data: { id: 2, path: '/old' } }]),
      createProjectDirectory: mock(async () => ({ data: { id: 1, path: '/src' } })),
      deleteProjectDirectory: mock(async () => undefined),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      directoryService,
      fileService,
    );

    await command.uploadSourcesAction(commandContext({ deleteObsolete: true, noAutoUpdate: true }));

    expect(fileService.deleteProjectFile).toHaveBeenCalledWith(88, '/old/removed.json');
    expect(directoryService.deleteProjectDirectory).toHaveBeenCalledWith(2, '/old');
    expect(directoryService.deleteProjectDirectory).not.toHaveBeenCalledWith(1, '/src');
    expect(output.success).toHaveBeenCalledWith('File /old/removed.json deleted as obsolete');
    expect(output.success).toHaveBeenCalledWith('Directory /old deleted as obsolete');
  });

  test('dry-runs obsolete project deletion without mutating project', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = baseProjectServiceMock();
    const fileService = {
      loadProjectFiles: mock(async () => ({
        data: [{ data: { id: 77, path: '/src/app.json' } }, { data: { id: 88, path: '/old/removed.json' } }],
      })),
      updateProjectFile: mock(async () => undefined),
      deleteProjectFile: mock(async () => undefined),
      createProjectFile: mock(async () => undefined),
    };
    const directoryService = {
      loadProjectDirectories: mock(async () => [{ data: { id: 1, path: '/src' } }, { data: { id: 2, path: '/old' } }]),
      createProjectDirectory: mock(async () => ({ data: { id: 1, path: '/src' } })),
      deleteProjectDirectory: mock(async () => undefined),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      directoryService,
      fileService,
    );

    await command.uploadSourcesAction(commandContext({ deleteObsolete: true, dryrun: true }));

    expect(fileService.deleteProjectFile).not.toHaveBeenCalled();
    expect(directoryService.deleteProjectDirectory).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith('File /old/removed.json would be deleted as obsolete');
    expect(output.info).toHaveBeenCalledWith('Directory /old would be deleted as obsolete');
  });

  test('filters translation upload by language and passes import flags', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/fr/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: {
          id: 123,
          languageMapping: {},
          targetLanguages: [language('es', 'es', 'spa'), language('fr', 'fr', 'fra')],
        },
      })),
    };
    const fileService = {
      ...baseFileServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
    };
    const translationService = { importProjectTranslation: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      translationService,
    );

    await command.uploadTranslationsAction(
      commandContext({
        language: 'es',
        autoApproveImported: true,
        importEqSuggestions: true,
        translateHidden: true,
      }),
    );

    expect(storageService.addStorage).toHaveBeenCalledTimes(1);
    expect(translationService.importProjectTranslation).toHaveBeenCalledWith(
      10,
      77,
      ['es'],
      'locale/es/app.json',
      true,
      true,
      true,
    );
    expect(output.success).toHaveBeenCalledWith('File locale/es/app.json was queued for translations import');
  });

  test('uploads translations from requested branch files', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, languageMapping: {}, targetLanguages: [language('es', 'es', 'spa')] },
      })),
    };
    const branchService = { getOrCreateBranch: mock(async () => ({ id: 44, name: 'feature' })) };
    const fileService = {
      ...baseFileServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
    };
    const translationService = { importProjectTranslation: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      branchService,
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      translationService,
    );

    await command.uploadTranslationsAction(commandContext({ branch: 'feature' }));

    expect(branchService.getOrCreateBranch).toHaveBeenCalledWith('feature');
    expect(fileService.loadProjectFiles).toHaveBeenCalledWith(44);
    expect(translationService.importProjectTranslation).toHaveBeenCalledWith(
      10,
      77,
      ['es'],
      'locale/es/app.json',
      undefined,
      undefined,
      undefined,
    );
    expect(output.success).toHaveBeenCalledWith('File locale/es/app.json was queued for translations import');
  });

  test('warns and continues when import fails due to language mismatch', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/fr/app.json`, '{}');

    let storageIdCounter = 10;
    const storageService = { addStorage: mock(async () => ({ data: { id: storageIdCounter++ } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: {
          id: 123,
          languageMapping: {},
          targetLanguages: [language('es', 'es', 'spa'), language('fr', 'fr', 'fra')],
        },
      })),
    };
    const fileService = {
      ...baseFileServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
    };
    const translationService = {
      importProjectTranslation: mock(async (_storageId: number, _fileId: number, languageIds: string[]) => {
        if (languageIds.includes('es')) {
          throw new WrongLanguageError();
        }
        return undefined;
      }),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      translationService,
    );

    await command.uploadTranslationsAction(commandContext({}));

    expect(translationService.importProjectTranslation).toHaveBeenCalledTimes(2);
    expect(output.warning).toHaveBeenCalledWith(
      "Translation file 'locale/es/app.json' hasn't been uploaded since the following target language(s) " +
        'are not enabled for the source file in your Crowdin project: es',
    );
    expect(output.success).toHaveBeenCalledWith('File locale/fr/app.json was queued for translations import');
  });

  test('warns when local translation file does not exist', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, languageMapping: {}, targetLanguages: [language('es', 'es', 'spa')] },
      })),
    };
    const fileService = {
      ...baseFileServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
    };
    const translationService = { importProjectTranslation: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      translationService,
    );

    await command.uploadTranslationsAction(commandContext({}));

    expect(storageService.addStorage).not.toHaveBeenCalled();
    expect(translationService.importProjectTranslation).not.toHaveBeenCalled();
    expect(output.warning).toHaveBeenCalledWith('File locale/es/app.json does not exist in the specified location');
  });

  test('uploads translations for all languages when no language filter is specified', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/fr/app.json`, '{}');

    let storageIdCounter = 10;
    const storageService = { addStorage: mock(async () => ({ data: { id: storageIdCounter++ } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: {
          id: 123,
          languageMapping: {},
          targetLanguages: [language('es', 'es', 'spa'), language('fr', 'fr', 'fra')],
        },
      })),
    };
    const fileService = {
      ...baseFileServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
    };
    const translationService = { importProjectTranslation: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      translationService,
    );

    await command.uploadTranslationsAction(commandContext({}));

    expect(translationService.importProjectTranslation).toHaveBeenCalledTimes(2);
    expect(translationService.importProjectTranslation).toHaveBeenCalledWith(
      expect.any(Number),
      77,
      ['es'],
      'locale/es/app.json',
      undefined,
      undefined,
      undefined,
    );
    expect(translationService.importProjectTranslation).toHaveBeenCalledWith(
      expect.any(Number),
      77,
      ['fr'],
      'locale/fr/app.json',
      undefined,
      undefined,
      undefined,
    );
    expect(output.success).toHaveBeenCalledWith('File locale/es/app.json was queued for translations import');
    expect(output.success).toHaveBeenCalledWith('File locale/fr/app.json was queued for translations import');
  });

  test('dry-run skips translation import and logs info', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, languageMapping: {}, targetLanguages: [language('es', 'es', 'spa')] },
      })),
    };
    const fileService = {
      ...baseFileServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
    };
    const translationService = { importProjectTranslation: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      translationService,
    );

    await command.uploadTranslationsAction(commandContext({ dryrun: true }));

    expect(storageService.addStorage).not.toHaveBeenCalled();
    expect(translationService.importProjectTranslation).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith('File locale/es/app.json would be queued for translations import');
  });

  test('does nothing when project has no source files', async () => {
    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, languageMapping: {}, targetLanguages: [language('es', 'es', 'spa')] },
      })),
    };
    const translationService = { importProjectTranslation: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      baseFileServiceMock(),
      baseLabelServiceMock(),
      translationService,
    );

    await command.uploadTranslationsAction(commandContext({}));

    expect(storageService.addStorage).not.toHaveBeenCalled();
    expect(translationService.importProjectTranslation).not.toHaveBeenCalled();
    expect(output.warning).not.toHaveBeenCalled();
  });

  test('uploads translations only for specified language when --language is set', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/fr/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: {
          id: 123,
          languageMapping: {},
          targetLanguages: [language('es', 'es', 'spa'), language('fr', 'fr', 'fra')],
        },
      })),
    };
    const fileService = {
      ...baseFileServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
    };
    const translationService = { importProjectTranslation: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      translationService,
    );

    await command.uploadTranslationsAction(commandContext({ language: 'fr' }));

    expect(translationService.importProjectTranslation).toHaveBeenCalledTimes(1);
    expect(translationService.importProjectTranslation).toHaveBeenCalledWith(
      10,
      77,
      ['fr'],
      'locale/fr/app.json',
      undefined,
      undefined,
      undefined,
    );
  });

  test('translations subcommand definition includes language and tree options', () => {
    const command = createUploadCommand(tempDir, createOutputMock());
    const definition = command.getDefinition();
    const translationsOpts = flatOptions(definition.subcommands?.find((s) => s.name === 'translations')?.options ?? []);
    expect(translationsOpts.find((o) => o.name === 'language')).toBeDefined();
    expect(translationsOpts.find((o) => o.name === 'tree')).toBeDefined();
  });

  test('throws when specified language does not exist in project', async () => {
    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, languageMapping: {}, targetLanguages: [language('es', 'es', 'spa')] },
      })),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService);

    expect(command.uploadTranslationsAction(commandContext({ language: 'fr' }))).rejects.toThrow(
      "Language 'fr' does not exist in the project",
    );
  });

  test('uploads source strings for a strings-based project and polls until finished', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, type: ProjectsGroupsModel.Type.STRINGS_BASED, languageMapping: {}, targetLanguages: [] },
      })),
    };
    const branchService = {
      getBranch: mock(async () => ({ id: 5, name: 'main' })),
      getOrCreateBranch: mock(async () => ({ id: 5, name: 'main' })),
    };

    let pollCalls = 0;
    const stringService = {
      uploadStrings: mock(async () => ({ data: { identifier: 'upload-1', status: 'in_progress', progress: 0 } })),
      getUploadStringsStatus: mock(async () => {
        pollCalls++;
        return { data: { identifier: 'upload-1', status: 'finished', progress: 100 } };
      }),
    };

    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      branchService,
      baseDirectoryServiceMock(),
      baseFileServiceMock(),
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      {},
      {},
      stringService,
    );

    await command.uploadSourcesAction(commandContext({}));

    expect(stringService.uploadStrings).toHaveBeenCalledWith(expect.objectContaining({ branchId: 5, storageId: 10 }));
    expect(pollCalls).toBe(1);
    expect(output.success).toHaveBeenCalledWith("File 'src/app.json'");
  });

  test('throws if strings-based project upload requires a branch and none provided', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, type: ProjectsGroupsModel.Type.STRINGS_BASED, languageMapping: {}, targetLanguages: [] },
      })),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      baseFileServiceMock(),
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      {},
      {},
      baseStringServiceMock(),
    );

    expect(command.uploadSourcesAction(commandContext({}))).rejects.toThrow(
      'A branch is required to upload sources for a strings-based project',
    );
  });

  test('throws/surfaces error if string upload status becomes failed', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, type: ProjectsGroupsModel.Type.STRINGS_BASED, languageMapping: {}, targetLanguages: [] },
      })),
    };
    const branchService = {
      getBranch: mock(async () => ({ id: 5, name: 'main' })),
      getOrCreateBranch: mock(async () => ({ id: 5, name: 'main' })),
    };
    const stringService = {
      uploadStrings: mock(async () => ({ data: { identifier: 'upload-1', status: 'in_progress', progress: 0 } })),
      getUploadStringsStatus: mock(async () => ({ data: { identifier: 'upload-1', status: 'failed', progress: 0 } })),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      branchService,
      baseDirectoryServiceMock(),
      baseFileServiceMock(),
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      {},
      {},
      stringService,
    );

    await expect(command.uploadSourcesAction(commandContext({}))).rejects.toThrow(
      'Current execution finished with errors',
    );
    expect(output.error).toHaveBeenCalledWith('Failed to upload strings for file src/app.json');
  });

  test('imports translations for strings-based project using branchId', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: {
          id: 123,
          type: ProjectsGroupsModel.Type.STRINGS_BASED,
          languageMapping: {},
          targetLanguages: [language('es', 'es', 'spa')],
        },
      })),
    };
    const branchService = {
      getBranch: mock(async () => ({ id: 5, name: 'main' })),
      getOrCreateBranch: mock(async () => ({ id: 5, name: 'main' })),
    };
    const translationService = baseTranslationServiceMock();
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      branchService,
      baseDirectoryServiceMock(),
      baseFileServiceMock(),
      baseLabelServiceMock(),
      translationService,
    );

    await command.uploadTranslationsAction(commandContext({}));

    expect(translationService.importProjectTranslationStringsBased).toHaveBeenCalledWith(
      10,
      5,
      ['es'],
      'locale/es/app.json',
      undefined,
      undefined,
      undefined,
    );
    expect(output.success).toHaveBeenCalledWith('File locale/es/app.json was queued for translations import');
  });

  test('throws when branch does not exist for strings-based translations upload', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: {
          id: 123,
          type: ProjectsGroupsModel.Type.STRINGS_BASED,
          languageMapping: {},
          targetLanguages: [language('es', 'es', 'spa')],
        },
      })),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      baseFileServiceMock(),
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
    );

    expect(command.uploadTranslationsAction(commandContext({}))).rejects.toThrow(
      'A branch is required to upload translations for a strings-based project',
    );
  });

  test('excludes files matching ignore patterns from source upload', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/src/ignore-me.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const command = createUploadCommand(
      tempDir,
      createOutputMock(),
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      { ignore: ['src/ignore-me.json'] },
    );

    await command.uploadSourcesAction(commandContext({}));

    expect(fileService.createProjectFile).toHaveBeenCalledTimes(1);
    const createCalls = fileService.createProjectFile.mock.calls as SourceFilesModel.CreateFileRequest[][];
    expect(createCalls[0]?.[0]?.name).toBe('app.json');
  });

  test('strips the common path when preserve_hierarchy is disabled', async () => {
    await Bun.$`mkdir -p ${tempDir}/src/sub`.quiet();
    await Bun.write(`${tempDir}/src/sub/a.json`, '{}');
    await Bun.write(`${tempDir}/src/sub/b.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const directoryService = baseDirectoryServiceMock();
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const command = createUploadCommand(
      tempDir,
      createOutputMock(),
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      directoryService,
      fileService,
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      { source: '/src/**/*.json' },
      { preserveHierarchy: false },
    );

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

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const directoryService = baseDirectoryServiceMock();
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const command = createUploadCommand(
      tempDir,
      createOutputMock(),
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      directoryService,
      fileService,
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      { source: '/src/**/*.json' },
      { preserveHierarchy: true },
    );

    await command.uploadSourcesAction(commandContext({}));

    expect(directoryService.createProjectDirectory).toHaveBeenCalled();
    const createCalls = fileService.createProjectFile.mock.calls as SourceFilesModel.CreateFileRequest[][];
    expect(createCalls[0]?.[0]?.name).toBe('a.json');
  });

  test('uploads to the dest path when dest is configured', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const directoryService = baseDirectoryServiceMock();
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const command = createUploadCommand(
      tempDir,
      createOutputMock(),
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      directoryService,
      fileService,
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      { dest: '/foo/%original_file_name%' },
      { preserveHierarchy: true },
    );

    await command.uploadSourcesAction(commandContext({}));

    expect(directoryService.createProjectDirectory).toHaveBeenCalled();
    const directoryCalls = directoryService.createProjectDirectory.mock.calls as string[][];
    expect(directoryCalls[0]?.[0]).toBe('foo');
    const createCalls = fileService.createProjectFile.mock.calls as SourceFilesModel.CreateFileRequest[][];
    expect(createCalls[0]?.[0]?.name).toBe('app.json');
  });

  test('resolves the project file via the dest path when uploading translations', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, languageMapping: {}, targetLanguages: [language('es', 'es', 'spa')] },
      })),
    };
    const fileService = {
      ...baseFileServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 88, path: '/foo/app.json' } }] })),
    };
    const translationService = { importProjectTranslation: mock(async () => undefined) };
    const command = createUploadCommand(
      tempDir,
      createOutputMock(),
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      translationService,
      { dest: '/foo/%original_file_name%' },
      { preserveHierarchy: true },
    );

    await command.uploadTranslationsAction(commandContext({}));

    expect(translationService.importProjectTranslation).toHaveBeenCalledWith(
      10,
      88,
      ['es'],
      'locale/es/app.json',
      undefined,
      undefined,
      undefined,
    );
  });

  test('warns when a source file is missing from the project during translation upload', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, languageMapping: {}, targetLanguages: [language('es', 'es', 'spa')] },
      })),
    };
    const fileService = { ...baseFileServiceMock(), loadProjectFiles: mock(async () => ({ data: [] })) };
    const translationService = { importProjectTranslation: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      translationService,
    );

    await command.uploadTranslationsAction(commandContext({}));

    expect(translationService.importProjectTranslation).not.toHaveBeenCalled();
    expect(output.warning).toHaveBeenCalledWith("Source file 'src/app.json' does not exist in the project");
  });

  test('skips ignored source files when uploading translations', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/src/skip.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/skip.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, languageMapping: {}, targetLanguages: [language('es', 'es', 'spa')] },
      })),
    };
    const fileService = {
      ...baseFileServiceMock(),
      loadProjectFiles: mock(async () => ({
        data: [{ data: { id: 77, path: '/src/app.json' } }, { data: { id: 78, path: '/src/skip.json' } }],
      })),
    };
    const translationService = { importProjectTranslation: mock(async () => undefined) };
    const command = createUploadCommand(
      tempDir,
      createOutputMock(),
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      translationService,
      { ignore: ['src/skip.json'] },
    );

    await command.uploadTranslationsAction(commandContext({}));

    expect(translationService.importProjectTranslation).toHaveBeenCalledTimes(1);
    expect(translationService.importProjectTranslation).toHaveBeenCalledWith(
      expect.any(Number),
      77,
      ['es'],
      'locale/es/app.json',
      undefined,
      undefined,
      undefined,
    );
  });

  test('uploads one multilingual translation file for all languages when scheme has no language placeholder', async () => {
    await Bun.write(`${tempDir}/src/data.csv`, 'a,b');
    await Bun.write(`${tempDir}/translations.csv`, 'a,b');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: {
          id: 123,
          languageMapping: {},
          targetLanguages: [language('es', 'es', 'spa'), language('fr', 'fr', 'fra')],
        },
      })),
    };
    const fileService = {
      ...baseFileServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 90, path: '/src/data.csv' } }] })),
    };
    const translationService = { importProjectTranslation: mock(async () => undefined) };
    const command = createUploadCommand(
      tempDir,
      createOutputMock(),
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      translationService,
      { source: '/src/*.csv', translation: '/translations.csv', scheme: 'identifier,source_phrase' },
      { preserveHierarchy: true },
    );

    await command.uploadTranslationsAction(commandContext({}));

    expect(translationService.importProjectTranslation).toHaveBeenCalledTimes(1);
    expect(translationService.importProjectTranslation).toHaveBeenCalledWith(
      expect.any(Number),
      90,
      ['es', 'fr'],
      'translations.csv',
      undefined,
      undefined,
      undefined,
    );
  });

  test('throws when a source pattern matches no files during source upload', async () => {
    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const fileService = { ...baseFileServiceMock(), createProjectFile: mock(async () => undefined) };
    const command = createUploadCommand(
      tempDir,
      createOutputMock(),
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
      baseLabelServiceMock(),
      baseTranslationServiceMock(),
      { source: '/src/*.json' },
    );

    expect(command.uploadSourcesAction(commandContext({}))).rejects.toThrow(
      "No sources found for '/src/*.json' pattern. Check the source paths in your configuration file",
    );
    expect(fileService.createProjectFile).not.toHaveBeenCalled();
  });

  test('reports an error and continues when a source pattern matches no files during translation upload', async () => {
    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, languageMapping: {}, targetLanguages: [language('es', 'es', 'spa')] },
      })),
    };
    const translationService = { importProjectTranslation: mock(async () => undefined) };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      projectService,
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      baseFileServiceMock(),
      baseLabelServiceMock(),
      translationService,
      { source: '/src/*.json' },
    );

    await command.uploadTranslationsAction(commandContext({}));

    expect(output.error).toHaveBeenCalledWith(
      "No sources found for '/src/*.json' pattern. Check the source paths in your configuration file",
    );
    expect(translationService.importProjectTranslation).not.toHaveBeenCalled();
  });

  test('warns and skips when an existing source file is currently being updated', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const fileService = {
      ...baseFileServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
      updateProjectFile: mock(async () => {
        throw new FileInUpdateError();
      }),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
    );

    await command.uploadSourcesAction(commandContext({}));

    expect(output.warning).toHaveBeenCalledWith("File 'src/app.json' is currently being updated");
    expect(output.success).not.toHaveBeenCalled();
  });

  test('reports the file-already-exists message and fails the run', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const fileService = {
      ...baseFileServiceMock(),
      createProjectFile: mock(async () => {
        throw new FileExistsError();
      }),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
    );

    await expect(command.uploadSourcesAction(commandContext({}))).rejects.toThrow(
      'Current execution finished with errors',
    );
    expect(output.error).toHaveBeenCalledWith("Project already contains the file 'src/app.json'");
  });

  test('reports every failed file when multiple uploads fail', async () => {
    await Bun.write(`${tempDir}/src/a.json`, '{}');
    await Bun.write(`${tempDir}/src/b.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const fileService = {
      ...baseFileServiceMock(),
      createProjectFile: mock(async (data: SourceFilesModel.CreateFileRequest) => {
        throw new CliError(`boom ${data.name}`);
      }),
    };
    const output = createOutputMock();
    const command = createUploadCommand(
      tempDir,
      output,
      baseProjectServiceMock(),
      storageService,
      baseBranchServiceMock(),
      baseDirectoryServiceMock(),
      fileService,
    );

    await expect(command.uploadSourcesAction(commandContext({}))).rejects.toThrow(
      'Current execution finished with errors',
    );
    expect(output.error).toHaveBeenCalledWith('boom a.json');
    expect(output.error).toHaveBeenCalledWith('boom b.json');
  });
});

function baseProjectServiceMock() {
  return {
    loadProject: mock(async () => ({
      data: {
        id: 123,
        languageMapping: {},
        targetLanguages: [language('es', 'es', 'spa'), language('uk', 'uk', 'ukr'), language('fr', 'fr', 'fra')],
      },
    })),
  };
}

function baseBranchServiceMock() {
  return {
    getBranch: mock(async () => undefined as never),
    getOrCreateBranch: mock(async () => undefined as never),
  };
}

function baseFileServiceMock() {
  return {
    loadProjectFiles: mock(async () => ({ data: [] })),
    updateProjectFile: mock(async () => undefined),
    deleteProjectFile: mock(async () => undefined),
    createProjectFile: mock(async () => undefined),
  };
}

function baseDirectoryServiceMock() {
  return {
    loadProjectDirectories: mock(async () => []),
    createProjectDirectory: mock(async () => ({ data: { id: 1, path: '/src' } })),
    deleteProjectDirectory: mock(async () => undefined),
  };
}

function baseLabelServiceMock() {
  return {
    resolveLabelIds: mock(async () => undefined),
  };
}

function baseTranslationServiceMock() {
  return {
    importProjectTranslation: mock(async () => undefined),
    importProjectTranslationStringsBased: mock(async () => ({
      data: { identifier: 'import-1', status: 'finished', progress: 100 },
    })),
    getImportTranslationsStatus: mock(async () => ({
      data: { identifier: 'import-1', status: 'finished', progress: 100 },
    })),
  };
}

function baseStringServiceMock() {
  return {
    uploadStrings: mock(async () => ({ data: { identifier: 'upload-1', status: 'finished', progress: 100 } })),
    getUploadStringsStatus: mock(async () => ({
      data: { identifier: 'upload-1', status: 'finished', progress: 100 },
    })),
  };
}

function createUploadCommand(
  basePath: string,
  output: ReturnType<typeof createOutputMock>,
  projectService: unknown = baseProjectServiceMock(),
  storageService: unknown = {},
  branchService: unknown = baseBranchServiceMock(),
  directoryService: unknown = baseDirectoryServiceMock(),
  fileService: unknown = baseFileServiceMock(),
  labelService: unknown = baseLabelServiceMock(),
  translationService: unknown = baseTranslationServiceMock(),
  fileOverrides: Record<string, unknown> = {},
  configOverrides: Record<string, unknown> = {},
  stringService: unknown = baseStringServiceMock(),
) {
  const config = ConfigSchema.parse({
    projectId: 123,
    apiToken: 'a'.repeat(80),
    basePath,
    baseUrl: 'https://api.crowdin.com',
    preserveHierarchy: true,
    files: [
      {
        source: '/src/*.json',
        translation: '/locale/%two_letters_code%/%original_file_name%',
        ...fileOverrides,
      },
    ],
    ...configOverrides,
  });

  return new UploadCommand(
    async () => config,
    () => output as never,
    async () => projectService as unknown as ProjectService,
    async () => storageService as unknown as StorageService,
    async () => branchService as unknown as BranchService,
    async () => directoryService as unknown as DirectoryService,
    async () => fileService as unknown as FileService,
    async () => labelService as unknown as LabelService,
    async () => translationService as unknown as TranslationService,
    async () => stringService as unknown as StringService,
  );
}

function commandContext(options: Record<string, unknown>): Command {
  return {
    optsWithGlobals: () => options,
  } as Command;
}

function createOutputMock() {
  return {
    info: mock(() => undefined),
    success: mock(() => undefined),
    warning: mock(() => undefined),
    error: mock(() => undefined),
    spinner: mock(() => undefined),
  };
}

function language(id: string, twoLettersCode: string, threeLettersCode: string) {
  return {
    id,
    name: id,
    editorCode: id,
    twoLettersCode,
    threeLettersCode,
    locale: `${id}-${id.toUpperCase()}`,
    androidCode: id,
    osxCode: id,
    osxLocale: id,
  };
}

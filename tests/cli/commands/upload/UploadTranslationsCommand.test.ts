import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import WrongLanguageError from '@/cli/errors/WrongLanguageError.ts';
import type { TranslationService } from '@/cli/services/TranslationService.ts';
import {
  baseBranchServiceMock,
  baseDirectoryServiceMock,
  baseFileServiceMock,
  baseLabelServiceMock,
  baseTranslationServiceMock,
  commandContext,
  createOutputMock,
  createUploadCommand,
  flatOptions,
  language,
} from './uploadTestHelpers.ts';

describe('UploadTranslationsCommand', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-upload-command-'));
    await Bun.$`mkdir -p ${tempDir}/src ${tempDir}/locale/es`.quiet();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('warns and skips upload translations when project has no manager access', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({ data: { id: 123, targetLanguages: [language('es', 'es', 'spa')] } })),
    };
    const translationService = baseTranslationServiceMock();
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

  test('soft-matches an existing project file when uploading translations', async () => {
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
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.xml' } }] })),
    };
    const translationService = baseTranslationServiceMock();
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

    expect(translationService.importProjectTranslation).toHaveBeenCalledWith(
      10,
      77,
      ['es'],
      'locale/es/app.json',
      undefined,
      undefined,
      undefined,
      expect.any(Function),
    );
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
    const translationService = baseTranslationServiceMock();
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
      expect.any(Function),
    );
    expect(output.success).toHaveBeenCalledWith("File 'locale/es/app.json'");
  });

  // The service polls to completion (TranslationService.test covers it); the command prints the init
  // line always and a per-poll percent line only under --verbose (output.debug gates it).
  test('prints the init line and gates the per-poll progress line behind --verbose', async () => {
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
    const translationService = {
      ...baseTranslationServiceMock(),
      // Drive the service's onProgress callback so the command's wiring is exercised.
      importProjectTranslation: mock(async (...args: Parameters<TranslationService['importProjectTranslation']>) => {
        args[7]?.({ progress: 50, identifier: 'import-1' } as never);
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

    expect(output.success).toHaveBeenCalledWith("File 'locale/es/app.json'");
    expect(output.log).toHaveBeenCalledWith("Importing translations for file 'locale/es/app.json'");
    expect(output.debug).toHaveBeenCalledWith("Importing translations for file 'locale/es/app.json' (50%) (import-1)");
  });

  test('surfaces a failed import and reports no success', async () => {
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
    // A failed status makes the service throw (TranslationService.test covers the poll).
    const translationService = {
      ...baseTranslationServiceMock(),
      importProjectTranslation: mock(async () => {
        throw new CliError(
          "Failed to upload the translation file 'locale/es/app.json'. Please contact our support team for help",
        );
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

    expect(command.uploadTranslationsAction(commandContext({}))).rejects.toThrow(
      'Current execution finished with errors',
    );
    expect(output.error).toHaveBeenCalledWith(
      "Failed to upload the translation file 'locale/es/app.json'. Please contact our support team for help",
    );
    expect(output.success).not.toHaveBeenCalled();
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
    const translationService = baseTranslationServiceMock();
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
      expect.any(Function),
    );
    expect(output.success).toHaveBeenCalledWith("File 'locale/es/app.json'");
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
      ...baseTranslationServiceMock(),
      importProjectTranslation: mock(async (_storageId: number, _fileId: number, languageIds: string[]) => {
        if (languageIds.includes('es')) {
          throw new WrongLanguageError();
        }
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
    expect(output.success).toHaveBeenCalledWith("File 'locale/fr/app.json'");
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
    const translationService = baseTranslationServiceMock();
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
    const translationService = baseTranslationServiceMock();
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
      expect.any(Function),
    );
    expect(translationService.importProjectTranslation).toHaveBeenCalledWith(
      expect.any(Number),
      77,
      ['fr'],
      'locale/fr/app.json',
      undefined,
      undefined,
      undefined,
      expect.any(Function),
    );
    expect(output.success).toHaveBeenCalledWith("File 'locale/es/app.json'");
    expect(output.success).toHaveBeenCalledWith("File 'locale/fr/app.json'");
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
    const translationService = baseTranslationServiceMock();
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

  test('dry-run reports missing source as error but does not fail the process', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, languageMapping: {}, targetLanguages: [language('es', 'es', 'spa')] },
      })),
    };
    const fileService = { ...baseFileServiceMock(), loadProjectFiles: mock(async () => ({ data: [] })) };
    const translationService = baseTranslationServiceMock();
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

    // Must not throw under dry-run even though the source is missing from the project.
    await command.uploadTranslationsAction(commandContext({ dryrun: true }));

    expect(output.error).toHaveBeenCalledWith("Source file 'src/app.json' does not exist in the project");
    expect(translationService.importProjectTranslation).not.toHaveBeenCalled();
  });

  test('does nothing when project has no source files', async () => {
    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, languageMapping: {}, targetLanguages: [language('es', 'es', 'spa')] },
      })),
    };
    const translationService = baseTranslationServiceMock();
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
    const translationService = baseTranslationServiceMock();
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
      expect.any(Function),
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
      expect.any(Function),
    );
    expect(output.success).toHaveBeenCalledWith("File 'locale/es/app.json'");
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
    const translationService = baseTranslationServiceMock();
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
      expect.any(Function),
    );
  });

  test('errors and exits when a source file is missing from the project during translation upload', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, languageMapping: {}, targetLanguages: [language('es', 'es', 'spa')] },
      })),
    };
    const fileService = { ...baseFileServiceMock(), loadProjectFiles: mock(async () => ({ data: [] })) };
    const translationService = baseTranslationServiceMock();
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

    expect(command.uploadTranslationsAction(commandContext({}))).rejects.toThrow(
      'Current execution finished with errors',
    );
    expect(translationService.importProjectTranslation).not.toHaveBeenCalled();
    expect(output.error).toHaveBeenCalledWith("Source file 'src/app.json' does not exist in the project");
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
    const translationService = baseTranslationServiceMock();
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
      expect.any(Function),
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
    const translationService = baseTranslationServiceMock();
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
      expect.any(Function),
    );
  });

  test('reports an error and continues when a source pattern matches no files during translation upload', async () => {
    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, languageMapping: {}, targetLanguages: [language('es', 'es', 'spa')] },
      })),
    };
    const translationService = baseTranslationServiceMock();
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

  test('respects an ignore pattern with a mapped language placeholder', async () => {
    await Bun.write(`${tempDir}/src/messages.po`, '{}');
    await Bun.write(`${tempDir}/src/messages-ukrainian.po`, '{}');
    await Bun.write(`${tempDir}/locale/ua/messages.po`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: {
          id: 123,
          languageMapping: { ua: { locale: 'ukrainian' } },
          targetLanguages: [language('ua', 'ua', 'ukr')],
        },
      })),
    };
    const fileService = {
      ...baseFileServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/messages.po' } }] })),
    };
    const translationService = baseTranslationServiceMock();
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
      {
        source: '/src/*.po',
        ignore: ['src/*-%locale%.po'],
        translation: '/locale/%language_id%/%original_file_name%',
      },
      { preserveHierarchy: true },
    );

    await command.uploadTranslationsAction(commandContext({}));

    expect(output.error).not.toHaveBeenCalled();
    expect(translationService.importProjectTranslation).toHaveBeenCalledTimes(1);
    expect(translationService.importProjectTranslation).toHaveBeenCalledWith(
      10,
      77,
      ['ua'],
      'locale/ua/messages.po',
      undefined,
      undefined,
      undefined,
      expect.any(Function),
    );
  });
});

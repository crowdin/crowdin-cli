import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Command } from 'commander';
import UploadCommand from '@/cli/commands/upload/UploadCommand.ts';
import type { BranchService } from '@/cli/services/BranchService.ts';
import type { DirectoryService } from '@/cli/services/DirectoryService.ts';
import type { FileService } from '@/cli/services/FileService.ts';
import type { LabelService } from '@/cli/services/LabelService.ts';
import type { ProjectService } from '@/cli/services/ProjectService.ts';
import type { StorageService } from '@/cli/services/StorageService.ts';
import type { TranslationService } from '@/cli/services/TranslationService.ts';
import type { OptionDef, OptionGroupDef } from '@/cli/types.ts';
import { ConfigSchema } from '@/lib/config.ts';

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

    await command.uploadSourcesAction(commandContext({ dryRun: true }));

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
    expect(output.success).toHaveBeenCalledWith('File src/app.json created');
  });

  test('creates source files under requested branch', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = { loadProject: mock(async () => ({ data: { id: 123 } })) };
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
    expect(output.success).toHaveBeenCalledWith('File src/app.json created');
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
    expect(output.success).toHaveBeenCalledWith('File src/app.json created');
    expect(output.success).toHaveBeenCalledWith('File src/utils.json created');
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
    expect(output.success).toHaveBeenCalledWith('File src/app.json created');
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
      '/locale/%two_letters_code%/%original_file_name%',
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
    expect(output.success).toHaveBeenCalledWith('File src/app.json updated');
    expect(output.success).toHaveBeenCalledWith('File src/new.json created');
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

    await command.uploadSourcesAction(commandContext({ deleteObsolete: true, dryRun: true }));

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
        data: { id: 123, targetLanguages: [language('es', 'es', 'spa')] },
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

  test('warns when local translation file does not exist', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, targetLanguages: [language('es', 'es', 'spa')] },
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
        data: { id: 123, targetLanguages: [language('es', 'es', 'spa')] },
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

    await command.uploadTranslationsAction(commandContext({ dryRun: true }));

    expect(storageService.addStorage).not.toHaveBeenCalled();
    expect(translationService.importProjectTranslation).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith('File locale/es/app.json would be queued for translations import');
  });

  test('does nothing when project has no source files', async () => {
    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      loadProject: mock(async () => ({
        data: { id: 123, targetLanguages: [language('es', 'es', 'spa')] },
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
        data: { id: 123, targetLanguages: [language('es', 'es', 'spa')] },
      })),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService);

    expect(command.uploadTranslationsAction(commandContext({ language: 'fr' }))).rejects.toThrow(
      "Language 'fr' does not exist in the project",
    );
  });
});

function baseProjectServiceMock() {
  return {
    loadProject: mock(async () => ({ data: { id: 123 } })),
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

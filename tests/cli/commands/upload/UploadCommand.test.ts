import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Command } from 'commander';
import UploadCommand from '@/cli/commands/upload/UploadCommand.ts';
import type { ProjectService } from '@/cli/services/ProjectService.ts';
import type { StorageService } from '@/cli/services/StorageService.ts';
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
    const command = createUploadCommand(tempDir, createOutputMock(), {}, {}, {});
    const definition = command.getDefinition();

    const topOpts = flatOptions(definition.options ?? []);
    expect(topOpts.find((o) => o.name === 'label')?.variadic).toBe(true);
    expect(topOpts.find((o) => o.name === 'excluded-language')?.variadic).toBe(true);

    const sourcesOpts = flatOptions(
      definition.subcommands?.find((s) => s.name === 'sources')?.options ?? [],
    );
    expect(sourcesOpts.find((o) => o.name === 'label')?.variadic).toBe(true);
    expect(sourcesOpts.find((o) => o.name === 'excluded-language')?.variadic).toBe(true);
  });

  test('default action delegates to sources upload', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      ...baseProjectServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [] })),
      directory: {
        loadProjectDirectories: mock(async () => []),
        createProjectDirectory: mock(async () => ({ data: { id: 1, path: '/src' } })),
      },
    };
    const apiClient = { sourceFilesApi: { createFile: mock(async () => undefined) } };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, apiClient);

    await command.defaultAction(commandContext({}));

    expect(apiClient.sourceFilesApi.createFile).toHaveBeenCalled();
  });

  test('skips existing source file when no-auto-update is enabled', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      ...baseProjectServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
      directory: { loadProjectDirectories: mock(async () => []) },
      file: { updateProjectFile: mock(async () => undefined) },
    };
    const apiClient = { sourceFilesApi: { createFile: mock(async () => undefined) } };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, apiClient);

    await command.uploadSourcesAction(commandContext({ noAutoUpdate: true }));

    expect(storageService.addStorage).not.toHaveBeenCalled();
    expect(projectService.file.updateProjectFile).not.toHaveBeenCalled();
    expect(apiClient.sourceFilesApi.createFile).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith('File src/app.json already exists and will not be updated');
  });

  test('dry-runs source upload without mutating project', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      ...baseProjectServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [] })),
      directory: {
        loadProjectDirectories: mock(async () => []),
        createProjectDirectory: mock(async () => ({ data: { id: 1, path: '/src' } })),
      },
      file: { updateProjectFile: mock(async () => undefined) },
    };
    const apiClient = { sourceFilesApi: { createFile: mock(async () => undefined) } };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, apiClient);

    await command.uploadSourcesAction(commandContext({ dryRun: true }));

    expect(storageService.addStorage).not.toHaveBeenCalled();
    expect(projectService.directory.createProjectDirectory).not.toHaveBeenCalled();
    expect(apiClient.sourceFilesApi.createFile).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith('File src/app.json would be created');
  });

  test('passes merged labels and excluded languages when creating source files', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      ...baseProjectServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [] })),
      directory: {
        loadProjectDirectories: mock(async () => []),
        createProjectDirectory: mock(async () => ({ data: { id: 1, path: '/src' } })),
      },
      label: { resolveLabelIds: mock(async () => [11, 12]) },
    };
    const apiClient = { sourceFilesApi: { createFile: mock(async () => undefined) } };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, apiClient, {
      labels: ['existing-label'],
      excluded_target_languages: ['uk'],
    });

    await command.uploadSourcesAction(commandContext({
      label: ['cli-label', 'existing-label'],
      excludedLanguage: ['es', 'uk'],
    }));

    expect(projectService.label.resolveLabelIds).toHaveBeenCalledWith(['existing-label', 'cli-label']);
    expect(apiClient.sourceFilesApi.createFile).toHaveBeenCalledWith(
      123, {
        storageId: 10,
        name: 'app.json',
        directoryId: 1,
        branchId: undefined,
        exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
        excludedTargetLanguages: ['uk', 'es'],
        attachLabelIds: [11, 12],
      },
    );
    expect(output.success).toHaveBeenCalledWith('File src/app.json created');
  });

  test('creates source files under requested branch', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      branch: { getOrCreateBranch: mock(async () => ({ id: 44, name: 'feature' })) },
      loadProject: mock(async () => ({ data: { id: 123 } })),
      loadProjectFiles: mock(async () => ({ data: [] })),
      directory: {
        loadProjectDirectories: mock(async () => []),
        createProjectDirectory: mock(async () => ({ data: { id: 1, path: '/src' } })),
      },
      label: { resolveLabelIds: mock(async () => undefined) },
    };
    const apiClient = { sourceFilesApi: { createFile: mock(async () => undefined) } };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, apiClient);

    await command.uploadSourcesAction(commandContext({ branch: 'feature' }));

    expect(projectService.branch.getOrCreateBranch).toHaveBeenCalledWith('feature');
    expect(projectService.loadProjectFiles).toHaveBeenCalledWith(44);
    expect(projectService.directory.loadProjectDirectories).toHaveBeenCalledWith(44);
    expect(projectService.directory.createProjectDirectory).toHaveBeenCalledWith('src', undefined, 44);
    expect(apiClient.sourceFilesApi.createFile).toHaveBeenCalledWith(
      123, {
        storageId: 10,
        name: 'app.json',
        directoryId: 1,
        branchId: 44,
        exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
        excludedTargetLanguages: undefined,
        attachLabelIds: undefined,
      },
    );
    expect(output.success).toHaveBeenCalledWith('Directory src created');
    expect(output.success).toHaveBeenCalledWith('File src/app.json created');
  });

  test('creates directory once and reuses its id for multiple files in the same directory', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/src/utils.json`, '{}');

    let storageIdCounter = 10;
    const storageService = { addStorage: mock(async () => ({ data: { id: storageIdCounter++ } })) };
    const projectService = {
      ...baseProjectServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [] })),
      directory: {
        loadProjectDirectories: mock(async () => []),
        createProjectDirectory: mock(async () => ({ data: { id: 1, path: '/src' } })),
      },
    };
    const apiClient = { sourceFilesApi: { createFile: mock(async () => undefined) } };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, apiClient);

    await command.uploadSourcesAction(commandContext({}));

    expect(projectService.directory.createProjectDirectory).toHaveBeenCalledTimes(1);
    expect(projectService.directory.createProjectDirectory).toHaveBeenCalledWith('src', undefined, undefined);
    expect(apiClient.sourceFilesApi.createFile).toHaveBeenCalledTimes(2);
    expect(apiClient.sourceFilesApi.createFile).toHaveBeenCalledWith(
      123, {
        storageId: 10,
        name: 'app.json',
        directoryId: 1,
        branchId: undefined,
        exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
        excludedTargetLanguages: undefined,
        attachLabelIds: undefined,
      },
    );
    expect(apiClient.sourceFilesApi.createFile).toHaveBeenCalledWith(
      123, {
        storageId: 11,
        name: 'utils.json',
        directoryId: 1,
        branchId: undefined,
        exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
        excludedTargetLanguages: undefined,
        attachLabelIds: undefined,
      },
    );
    expect(output.success).toHaveBeenCalledWith('Directory src created');
    expect(output.success).toHaveBeenCalledWith('File src/app.json created');
    expect(output.success).toHaveBeenCalledWith('File src/utils.json created');
  });

  test('reuses existing project directory without recreating it', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      ...baseProjectServiceMock(),
      loadProjectFiles: mock(async () => ({ data: [] })),
      directory: {
        loadProjectDirectories: mock(async () => [{ data: { id: 5, path: '/src' } }]),
        createProjectDirectory: mock(async () => ({ data: { id: 999, path: '/src' } })),
      },
    };
    const apiClient = { sourceFilesApi: { createFile: mock(async () => undefined) } };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, apiClient);

    await command.uploadSourcesAction(commandContext({}));

    expect(projectService.directory.createProjectDirectory).not.toHaveBeenCalled();
    expect(apiClient.sourceFilesApi.createFile).toHaveBeenCalledWith(
      123, {
        storageId: 10,
        name: 'app.json',
        directoryId: 5,
        branchId: undefined,
        exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
        excludedTargetLanguages: undefined,
        attachLabelIds: undefined,
      },
    );
    expect(output.success).not.toHaveBeenCalledWith(expect.stringContaining('Directory'));
    expect(output.success).toHaveBeenCalledWith('File src/app.json created');
  });

  test('updates existing source files and creates new ones in the same run', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/src/new.json`, '{}');

    let storageIdCounter = 10;
    const storageService = { addStorage: mock(async () => ({ data: { id: storageIdCounter++ } })) };
    const projectService = {
      ...baseProjectServiceMock(),
      loadProjectFiles: mock(async () => ({
        data: [{ data: { id: 77, path: '/src/app.json' } }],
      })),
      directory: {
        loadProjectDirectories: mock(async () => [{ data: { id: 5, path: '/src' } }]),
        createProjectDirectory: mock(async () => ({ data: { id: 5, path: '/src' } })),
      },
      file: { updateProjectFile: mock(async () => undefined) },
    };
    const apiClient = { sourceFilesApi: { createFile: mock(async () => undefined) } };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, apiClient);

    await command.uploadSourcesAction(commandContext({}));

    expect(projectService.file.updateProjectFile).toHaveBeenCalledWith(
      77, expect.any(Number), 'src/app.json',
      '/locale/%two_letters_code%/%original_file_name%',
      undefined, undefined,
    );
    expect(apiClient.sourceFilesApi.createFile).toHaveBeenCalledWith(
      123, {
        storageId: expect.any(Number),
        name: 'new.json',
        directoryId: 5,
        branchId: undefined,
        exportOptions: { exportPattern: '/locale/%two_letters_code%/%original_file_name%' },
        excludedTargetLanguages: undefined,
        attachLabelIds: undefined,
      },
    );
    expect(projectService.directory.createProjectDirectory).not.toHaveBeenCalled();
    expect(output.success).toHaveBeenCalledWith('File src/app.json updated');
    expect(output.success).toHaveBeenCalledWith('File src/new.json created');
  });

  test('deletes obsolete project files and directories', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      ...baseProjectServiceMock(),
      loadProjectFiles: mock(async () => ({
        data: [
          { data: { id: 77, path: '/src/app.json' } },
          { data: { id: 88, path: '/old/removed.json' } },
        ],
      })),
      directory: {
        loadProjectDirectories: mock(async () => [
          { data: { id: 1, path: '/src' } },
          { data: { id: 2, path: '/old' } },
        ]),
        deleteProjectDirectory: mock(async () => undefined),
      },
      file: {
        updateProjectFile: mock(async () => undefined),
        deleteProjectFile: mock(async () => undefined),
      },
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, {});

    await command.uploadSourcesAction(commandContext({ deleteObsolete: true, noAutoUpdate: true }));

    expect(projectService.file.deleteProjectFile).toHaveBeenCalledWith(88, '/old/removed.json');
    expect(projectService.directory.deleteProjectDirectory).toHaveBeenCalledWith(2, '/old');
    expect(projectService.directory.deleteProjectDirectory).not.toHaveBeenCalledWith(1, '/src');
    expect(output.success).toHaveBeenCalledWith('File /old/removed.json deleted as obsolete');
    expect(output.success).toHaveBeenCalledWith('Directory /old deleted as obsolete');
  });

  test('dry-runs obsolete project deletion without mutating project', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      ...baseProjectServiceMock(),
      loadProjectFiles: mock(async () => ({
        data: [
          { data: { id: 77, path: '/src/app.json' } },
          { data: { id: 88, path: '/old/removed.json' } },
        ],
      })),
      directory: {
        loadProjectDirectories: mock(async () => [
          { data: { id: 1, path: '/src' } },
          { data: { id: 2, path: '/old' } },
        ]),
        deleteProjectDirectory: mock(async () => undefined),
      },
      file: {
        updateProjectFile: mock(async () => undefined),
        deleteProjectFile: mock(async () => undefined),
      },
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, {});

    await command.uploadSourcesAction(commandContext({ deleteObsolete: true, dryRun: true }));

    expect(projectService.file.deleteProjectFile).not.toHaveBeenCalled();
    expect(projectService.directory.deleteProjectDirectory).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith('File /old/removed.json would be deleted as obsolete');
    expect(output.info).toHaveBeenCalledWith('Directory /old would be deleted as obsolete');
  });

  test('filters translation upload by language and passes import flags', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/fr/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      branch: { getOrCreateBranch: mock(async () => undefined) },
      loadProject: mock(async () => ({
        data: {
          id: 123,
          targetLanguages: [language('es', 'es', 'spa'), language('fr', 'fr', 'fra')],
        },
      })),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
      translation: { importProjectTranslation: mock(async () => undefined) },
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, {});

    await command.uploadTranslationsAction(commandContext({
      language: 'es',
      autoApproveImported: true,
      importEqSuggestions: true,
      translateHidden: true,
    }));

    expect(storageService.addStorage).toHaveBeenCalledTimes(1);
    expect(projectService.translation.importProjectTranslation).toHaveBeenCalledWith(
      10, 77, ['es'], 'locale/es/app.json',
      true, true, true,
    );
    expect(output.success).toHaveBeenCalledWith('File locale/es/app.json was queued for translations import');
  });

  test('uploads translations from requested branch files', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      branch: { getOrCreateBranch: mock(async () => ({ id: 44, name: 'feature' })) },
      loadProject: mock(async () => ({
        data: { id: 123, targetLanguages: [language('es', 'es', 'spa')] },
      })),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
      translation: { importProjectTranslation: mock(async () => undefined) },
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, {});

    await command.uploadTranslationsAction(commandContext({ branch: 'feature' }));

    expect(projectService.branch.getOrCreateBranch).toHaveBeenCalledWith('feature');
    expect(projectService.loadProjectFiles).toHaveBeenCalledWith(44);
    expect(projectService.translation.importProjectTranslation).toHaveBeenCalledWith(
      10, 77, ['es'], 'locale/es/app.json',
      undefined, undefined, undefined,
    );
    expect(output.success).toHaveBeenCalledWith('File locale/es/app.json was queued for translations import');
  });

  test('warns when local translation file does not exist', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      branch: { getOrCreateBranch: mock(async () => undefined) },
      loadProject: mock(async () => ({
        data: { id: 123, targetLanguages: [language('es', 'es', 'spa')] },
      })),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
      translation: { importProjectTranslation: mock(async () => undefined) },
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, {});

    await command.uploadTranslationsAction(commandContext({}));

    expect(storageService.addStorage).not.toHaveBeenCalled();
    expect(projectService.translation.importProjectTranslation).not.toHaveBeenCalled();
    expect(output.warning).toHaveBeenCalledWith(
      'File locale/es/app.json does not exist in the specified location',
    );
  });

  test('uploads translations for all languages when no language filter is specified', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/fr/app.json`, '{}');

    let storageIdCounter = 10;
    const storageService = { addStorage: mock(async () => ({ data: { id: storageIdCounter++ } })) };
    const projectService = {
      branch: { getOrCreateBranch: mock(async () => undefined) },
      loadProject: mock(async () => ({
        data: {
          id: 123,
          targetLanguages: [language('es', 'es', 'spa'), language('fr', 'fr', 'fra')],
        },
      })),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
      translation: { importProjectTranslation: mock(async () => undefined) },
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, {});

    await command.uploadTranslationsAction(commandContext({}));

    expect(projectService.translation.importProjectTranslation).toHaveBeenCalledTimes(2);
    expect(projectService.translation.importProjectTranslation).toHaveBeenCalledWith(
      expect.any(Number), 77, ['es'], 'locale/es/app.json',
      undefined, undefined, undefined,
    );
    expect(projectService.translation.importProjectTranslation).toHaveBeenCalledWith(
      expect.any(Number), 77, ['fr'], 'locale/fr/app.json',
      undefined, undefined, undefined,
    );
    expect(output.success).toHaveBeenCalledWith('File locale/es/app.json was queued for translations import');
    expect(output.success).toHaveBeenCalledWith('File locale/fr/app.json was queued for translations import');
  });

  test('dry-run skips translation import and logs info', async () => {
    await Bun.write(`${tempDir}/src/app.json`, '{}');
    await Bun.write(`${tempDir}/locale/es/app.json`, '{}');

    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      branch: { getOrCreateBranch: mock(async () => undefined) },
      loadProject: mock(async () => ({
        data: { id: 123, targetLanguages: [language('es', 'es', 'spa')] },
      })),
      loadProjectFiles: mock(async () => ({ data: [{ data: { id: 77, path: '/src/app.json' } }] })),
      translation: { importProjectTranslation: mock(async () => undefined) },
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, {});

    await command.uploadTranslationsAction(commandContext({ dryRun: true }));

    expect(storageService.addStorage).not.toHaveBeenCalled();
    expect(projectService.translation.importProjectTranslation).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith(
      'File locale/es/app.json would be queued for translations import',
    );
  });

  test('does nothing when project has no source files', async () => {
    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      branch: { getOrCreateBranch: mock(async () => undefined) },
      loadProject: mock(async () => ({
        data: { id: 123, targetLanguages: [language('es', 'es', 'spa')] },
      })),
      loadProjectFiles: mock(async () => ({ data: [] })),
      translation: { importProjectTranslation: mock(async () => undefined) },
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, {});

    await command.uploadTranslationsAction(commandContext({}));

    expect(storageService.addStorage).not.toHaveBeenCalled();
    expect(projectService.translation.importProjectTranslation).not.toHaveBeenCalled();
    expect(output.warning).not.toHaveBeenCalled();
  });

  test('throws when specified language does not exist in project', async () => {
    const storageService = { addStorage: mock(async () => ({ data: { id: 10 } })) };
    const projectService = {
      branch: { getOrCreateBranch: mock(async () => undefined) },
      loadProject: mock(async () => ({
        data: { id: 123, targetLanguages: [language('es', 'es', 'spa')] },
      })),
      loadProjectFiles: mock(async () => ({ data: [] })),
    };
    const output = createOutputMock();
    const command = createUploadCommand(tempDir, output, projectService, storageService, {});

    expect(
      command.uploadTranslationsAction(commandContext({ language: 'fr' })),
    ).rejects.toThrow('Language \'fr\' does not exist in the project');
  });
});

function baseProjectServiceMock() {
  return {
    branch: {
      getOrCreateBranch: mock(async () => undefined as any),
    },
    loadProject: mock(async () => ({ data: { id: 123 } })),
  };
}

function createUploadCommand(
  basePath: string,
  output: ReturnType<typeof createOutputMock>,
  projectService: unknown,
  storageService: unknown,
  apiClient: unknown,
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
    async () => apiClient as never,
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

import { mock } from 'bun:test';
import type { Command } from 'commander';
import UploadCommand from '@/cli/commands/upload/UploadCommand.ts';
import type { BranchService } from '@/cli/services/BranchService.ts';
import type { DirectoryService } from '@/cli/services/DirectoryService.ts';
import type { FileService } from '@/cli/services/FileService.ts';
import type { LabelService } from '@/cli/services/LabelService.ts';
import type { ProjectService } from '@/cli/services/ProjectService.ts';
import type { StorageService } from '@/cli/services/StorageService.ts';
import type { StringService } from '@/cli/services/StringService.ts';
import type { TranslationService } from '@/cli/services/TranslationService.ts';
import type { OptionDef, OptionGroupDef } from '@/cli/types.ts';
import { ConfigSchema } from '@/lib/config.ts';

export function flatOptions(options: (OptionDef | OptionGroupDef)[]): OptionDef[] {
  return options.flatMap((item) => ('group' in item ? item.options : [item]));
}

export function baseProjectServiceMock() {
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

export function baseBranchServiceMock() {
  return {
    getBranch: mock(async () => undefined as never),
    getOrCreateBranch: mock(async () => undefined as never),
  };
}

export function baseFileServiceMock() {
  return {
    loadProjectFiles: mock(async () => ({ data: [] })),
    updateProjectFile: mock(async () => undefined),
    deleteProjectFile: mock(async () => undefined),
    createProjectFile: mock(async () => undefined),
  };
}

export function baseDirectoryServiceMock() {
  return {
    loadProjectDirectories: mock(async () => []),
    createProjectDirectory: mock(async () => ({ data: { id: 1, path: '/src' } })),
    deleteProjectDirectory: mock(async () => undefined),
  };
}

export function baseLabelServiceMock() {
  return {
    resolveLabelIds: mock(async () => undefined),
  };
}

export function baseTranslationServiceMock() {
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

export function baseStringServiceMock() {
  return {
    uploadStrings: mock(async () => ({ data: { identifier: 'upload-1', status: 'finished', progress: 100 } })),
    getUploadStringsStatus: mock(async () => ({
      data: { identifier: 'upload-1', status: 'finished', progress: 100 },
    })),
  };
}

export function createUploadCommand(
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

export function commandContext(options: Record<string, unknown>): Command {
  return {
    optsWithGlobals: () => options,
  } as Command;
}

export function createOutputMock() {
  return {
    info: mock(() => undefined),
    success: mock(() => undefined),
    warning: mock(() => undefined),
    error: mock(() => undefined),
    spinner: mock(() => undefined),
  };
}

export function language(id: string, twoLettersCode: string, threeLettersCode: string) {
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

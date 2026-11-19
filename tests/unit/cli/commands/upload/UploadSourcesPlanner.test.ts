import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type SourcePaths, UploadSourcesPlanner } from '@/cli/commands/upload/UploadSourcesPlanner.ts';
import { ProjectFileIndex } from '@/cli/services/file/ProjectFileIndex.ts';
import { type Config, ConfigSchema } from '@/lib/config.ts';

type ProjectFile = { id: number; path: string; exportOptions?: unknown };

function buildConfig(group: Record<string, unknown> = {}, preserveHierarchy = true, basePath = '.'): Config {
  return ConfigSchema.parse({
    projectId: 123,
    apiToken: 'a'.repeat(80),
    basePath,
    baseUrl: 'https://api.crowdin.com',
    preserveHierarchy,
    files: [{ source: '/src/**/*.json', translation: '/l/%locale%/%original_file_name%', ...group }],
  }) as Config;
}

const sameAsLocal = (projectPath: string): SourcePaths => ({
  localFilePath: projectPath.replace(/^\//, ''),
  projectPath: projectPath.replace(/^\//, ''),
});

interface ObsoleteCase {
  files: ProjectFile[];
  directories?: { id: number; path: string }[];
  // Project paths of the local sources.
  expected?: string[];
  group?: Record<string, unknown>;
  preserveHierarchy?: boolean;
  branchName?: string;
  deleteObsolete?: boolean;
}

function planObsolete({
  files,
  directories = [],
  expected = [],
  group,
  preserveHierarchy = true,
  branchName,
  deleteObsolete = true,
}: ObsoleteCase) {
  const config = buildConfig(group, preserveHierarchy);
  const result = new UploadSourcesPlanner().plan({
    config,
    groups: [
      { patterns: config.files[0] as Config['files'][number], fileOptions: {}, files: expected.map(sameAsLocal) },
    ],
    isStringsBased: false,
    autoUpdate: true,
    deleteObsolete,
    projectFiles: new ProjectFileIndex(files as never, branchName),
    projectDirectories: directories as never,
    branchName,
  });

  return {
    files: result.obsoleteFiles.map((file) => file.id),
    directories: result.obsoleteDirectories.map((directory) => directory.path),
  };
}

describe('UploadSourcesPlanner', () => {
  describe('delete-obsolete', () => {
    test('plans nothing without --delete-obsolete', () => {
      expect(planObsolete({ files: [{ id: 2, path: '/src/stale.json' }], deleteObsolete: false })).toEqual({
        files: [],
        directories: [],
      });
    });

    test('deletes files under the group pattern and the directories they leave empty', () => {
      const result = planObsolete({
        files: [
          { id: 1, path: '/src/app.json' },
          { id: 2, path: '/src/legacy/stale.json' },
          { id: 3, path: '/external/keep.json' },
        ],
        directories: [
          { id: 10, path: '/src' },
          { id: 11, path: '/src/legacy' },
          { id: 12, path: '/external' },
        ],
        expected: ['/src/app.json'],
      });

      expect(result).toEqual({ files: [2], directories: ['/src/legacy'] });
    });

    test('plans nothing when every project file still has a local source', () => {
      expect(planObsolete({ files: [{ id: 1, path: '/src/app.json' }], expected: ['/src/app.json'] })).toEqual({
        files: [],
        directories: [],
      });
    });

    test('keeps a file the upload will rename', () => {
      const result = planObsolete({
        files: [
          { id: 1, path: '/src/app.xml' },
          { id: 2, path: '/src/stale.json' },
        ],
        expected: ['/src/app.json'],
      });

      expect(result.files).toEqual([2]);
    });

    test('matches trailing segments when preserve_hierarchy is off', () => {
      const result = planObsolete({
        files: [
          { id: 1, path: '/app.json' },
          { id: 2, path: '/stale.json' },
          { id: 3, path: '/notes.txt' },
        ],
        expected: ['/app.json'],
        group: { source: '/src/*.json' },
        preserveHierarchy: false,
      });

      expect(result.files).toEqual([2]);
    });

    test('matches a dest-mapped group by its dest pattern, not its source', () => {
      const result = planObsolete({
        files: [
          { id: 1, path: '/out/app.json' },
          { id: 2, path: '/out/stale.json' },
          { id: 3, path: '/out/notes.txt' },
          { id: 4, path: '/src/legacy.json' },
        ],
        expected: ['/out/app.json'],
        group: { source: '/src/*.json', dest: '/out/%original_file_name%' },
      });

      expect(result.files).toEqual([2]);
    });

    test('keeps ignored files and their directories', () => {
      const result = planObsolete({
        files: [
          { id: 1, path: '/src/app.json' },
          { id: 2, path: '/src/vendor/lib.json' },
          { id: 3, path: '/src/legacy/stale.json' },
        ],
        directories: [
          { id: 10, path: '/src' },
          { id: 11, path: '/src/vendor' },
          { id: 12, path: '/src/legacy' },
        ],
        expected: ['/src/app.json'],
        group: { ignore: ['/src/vendor/**'] },
      });

      expect(result).toEqual({ files: [3], directories: ['/src/legacy'] });
    });

    test('orders directories deepest first', () => {
      const result = planObsolete({
        files: [
          { id: 1, path: '/src/app.json' },
          { id: 2, path: '/src/old/deep/stale.json' },
        ],
        directories: [
          { id: 10, path: '/src' },
          { id: 11, path: '/src/old' },
          { id: 12, path: '/src/old/deep' },
        ],
        expected: ['/src/app.json'],
      });

      expect(result.directories).toEqual(['/src/old/deep', '/src/old']);
    });

    test('leaves an empty directory alone when no deleted file lived in it', () => {
      const result = planObsolete({
        files: [
          { id: 1, path: '/src/app.json' },
          { id: 2, path: '/src/stale.json' },
        ],
        directories: [
          { id: 10, path: '/src' },
          { id: 11, path: '/manual-empty-dir' },
        ],
        expected: ['/src/app.json'],
      });

      expect(result).toEqual({ files: [2], directories: [] });
    });

    test.each([
      ['/elsewhere/%original_file_name%', []],
      ['/l/%locale%/other.json', [2]],
    ])('checks the stored export pattern %p against the group translation', (exportPattern, deleted) => {
      const result = planObsolete({
        files: [
          { id: 1, path: '/src/app.json' },
          { id: 2, path: '/src/other.json', exportOptions: { exportPattern } },
        ],
        expected: ['/src/app.json'],
      });

      expect(result.files).toEqual(deleted);
    });

    test('expands file placeholders in the source pattern', () => {
      const result = planObsolete({
        files: [
          { id: 1, path: '/src/app.json' },
          { id: 2, path: '/src/stale.json' },
        ],
        group: { source: '/src/%original_file_name%' },
      });

      expect(result.files).toEqual([1, 2]);
    });

    test('returns branch directories under branch-relative paths', () => {
      const result = planObsolete({
        files: [
          { id: 1, path: '/dev/src/app.json' },
          { id: 2, path: '/dev/src/old/stale.json' },
        ],
        directories: [
          { id: 10, path: '/dev/src' },
          { id: 11, path: '/dev/src/old' },
        ],
        expected: ['/src/app.json'],
        branchName: 'dev',
      });

      expect(result).toEqual({ files: [2], directories: ['/src/old'] });
    });
  });

  describe('per-file actions', () => {
    let basePath: string;

    beforeEach(async () => {
      basePath = await mkdtemp(join(tmpdir(), 'crowdin-planner-'));
    });

    afterEach(async () => {
      await rm(basePath, { recursive: true, force: true });
    });

    const planFiles = (
      groups: SourcePaths[][],
      projectFiles: ProjectFile[] = [],
      options: { isStringsBased?: boolean; autoUpdate?: boolean } = {},
    ) => {
      const config = buildConfig({}, true, basePath);
      const patterns = config.files[0] as Config['files'][number];

      return new UploadSourcesPlanner()
        .plan({
          config,
          groups: groups.map((files) => ({ patterns, fileOptions: {}, files })),
          isStringsBased: options.isStringsBased ?? false,
          autoUpdate: options.autoUpdate ?? true,
          deleteObsolete: false,
          projectFiles: new ProjectFileIndex(projectFiles as never),
          projectDirectories: [],
        })
        .groups.map((group) =>
          group.files.map((file) => ({
            action: file.action,
            path: file.paths.projectPath,
            ...('reason' in file ? { reason: file.reason } : {}),
            ...('rename' in file ? { id: file.projectFile.id, rename: file.rename } : {}),
          })),
        );
    };

    const local = async (projectPath: string, content = '{}') => {
      await Bun.write(join(basePath, projectPath), content);
      return sameAsLocal(projectPath);
    };

    test('creates a file the project lacks', async () => {
      expect(planFiles([[await local('src/app.json')]])).toEqual([[{ action: 'create', path: 'src/app.json' }]]);
    });

    test('updates an exact match in place and renames an extension-only match', async () => {
      const result = planFiles(
        [[await local('src/app.json'), await local('src/other.yaml')]],
        [
          { id: 1, path: '/src/app.json' },
          { id: 2, path: '/src/other.yml' },
        ],
      );

      expect(result).toEqual([
        [
          { action: 'update', path: 'src/app.json', id: 1, rename: false },
          { action: 'update', path: 'src/other.yaml', id: 2, rename: true },
        ],
      ]);
    });

    test('skips an existing file with --no-auto-update, but still creates new ones', async () => {
      const result = planFiles(
        [[await local('src/app.json'), await local('src/new.json')]],
        [{ id: 1, path: '/src/app.json' }],
        {
          autoUpdate: false,
        },
      );

      expect(result).toEqual([
        [
          { action: 'skip', path: 'src/app.json', reason: 'auto-update disabled' },
          { action: 'create', path: 'src/new.json' },
        ],
      ]);
    });

    test('skips an empty local file', async () => {
      expect(planFiles([[await local('src/empty.json', '')]])).toEqual([
        [{ action: 'skip', path: 'src/empty.json', reason: 'empty' }],
      ]);
    });

    test('lets the first group win a project path two groups resolve to', async () => {
      const file = await local('src/app.json');

      expect(planFiles([[file], [file]])).toEqual([
        [{ action: 'create', path: 'src/app.json' }],
        [{ action: 'skip', path: 'src/app.json', reason: 'already uploading' }],
      ]);
    });

    test('uploads strings for a strings-based project, whatever the project files', async () => {
      const result = planFiles([[await local('src/app.json')]], [{ id: 1, path: '/src/app.json' }], {
        isStringsBased: true,
        autoUpdate: false,
      });

      expect(result).toEqual([[{ action: 'upload-strings', path: 'src/app.json' }]]);
    });

    test('keeps a group that matched nothing, with no files', () => {
      expect(planFiles([[]])).toEqual([[]]);
    });
  });
});

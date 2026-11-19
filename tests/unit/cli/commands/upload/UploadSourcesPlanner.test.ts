import { describe, expect, test } from 'bun:test';
import { UploadSourcesPlanner } from '@/cli/commands/upload/UploadSourcesPlanner.ts';
import { ProjectFileIndex } from '@/cli/services/file/ProjectFileIndex.ts';
import { type Config, ConfigSchema } from '@/lib/config.ts';

interface PlanCase {
  files: { id: number; path: string; exportOptions?: unknown }[];
  directories?: { id: number; path: string }[];
  /** Project paths of the local sources. */
  expected?: string[];
  group?: Record<string, unknown>;
  preserveHierarchy?: boolean;
  branchName?: string;
  deleteObsolete?: boolean;
}

function plan({
  files,
  directories = [],
  expected = [],
  group,
  preserveHierarchy = true,
  branchName,
  deleteObsolete = true,
}: PlanCase) {
  const config = ConfigSchema.parse({
    projectId: 123,
    apiToken: 'a'.repeat(80),
    basePath: '.',
    baseUrl: 'https://api.crowdin.com',
    preserveHierarchy,
    files: [{ source: '/src/**/*.json', translation: '/l/%locale%/%original_file_name%', ...group }],
  }) as Config;

  const result = new UploadSourcesPlanner().plan({
    config,
    deleteObsolete,
    projectFiles: new ProjectFileIndex(files as never, branchName),
    projectDirectories: directories as never,
    expectedProjectFilePaths: new Set(expected),
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
      expect(plan({ files: [{ id: 2, path: '/src/stale.json' }], deleteObsolete: false })).toEqual({
        files: [],
        directories: [],
      });
    });

    test('deletes files under the group pattern and the directories they leave empty', () => {
      const result = plan({
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
      expect(plan({ files: [{ id: 1, path: '/src/app.json' }], expected: ['/src/app.json'] })).toEqual({
        files: [],
        directories: [],
      });
    });

    test('keeps a file the upload will rename', () => {
      const result = plan({
        files: [
          { id: 1, path: '/src/app.xml' },
          { id: 2, path: '/src/stale.json' },
        ],
        expected: ['/src/app.json'],
      });

      expect(result.files).toEqual([2]);
    });

    test('matches trailing segments when preserve_hierarchy is off', () => {
      const result = plan({
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
      const result = plan({
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
      const result = plan({
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
      const result = plan({
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
      const result = plan({
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
      const result = plan({
        files: [
          { id: 1, path: '/src/app.json' },
          { id: 2, path: '/src/other.json', exportOptions: { exportPattern } },
        ],
        expected: ['/src/app.json'],
      });

      expect(result.files).toEqual(deleted);
    });

    test('expands file placeholders in the source pattern', () => {
      const result = plan({
        files: [
          { id: 1, path: '/src/app.json' },
          { id: 2, path: '/src/stale.json' },
        ],
        group: { source: '/src/%original_file_name%' },
      });

      expect(result.files).toEqual([1, 2]);
    });

    test('returns branch directories under branch-relative paths', () => {
      const result = plan({
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
});

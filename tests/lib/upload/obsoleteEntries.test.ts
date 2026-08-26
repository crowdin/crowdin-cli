import { describe, expect, test } from 'bun:test';
import { deleteObsoleteProjectEntries } from '@/lib/upload/obsoleteEntries.ts';

const group = { source: '/src/**/*.json', translation: '/l/%locale%/%original_file_name%' };

async function deleteObsolete(options: {
  projectFiles: { id: number; path: string; exportOptions?: unknown }[];
  projectDirectories?: { id: number; path: string }[];
  expected?: string[];
  groups?: { source: string; translation: string; ignore?: string[] }[];
}) {
  const deletedFiles: string[] = [];
  const deletedDirectories: string[] = [];
  const output = { info() {}, success() {}, warning() {} };
  const fileService = {
    async deleteProjectFile(_id: number, path: string) {
      deletedFiles.push(path);
    },
  };
  const directoryService = {
    async deleteProjectDirectory(_id: number, path: string) {
      deletedDirectories.push(path);
    },
  };

  await deleteObsoleteProjectEntries(
    options.projectFiles.map((data) => ({ data })) as never,
    (options.projectDirectories ?? []).map((data) => ({ data })) as never,
    new Set(options.expected ?? []),
    options.groups ?? [group],
    true,
    fileService as never,
    directoryService as never,
    output as never,
    false,
  );

  return { deletedFiles, deletedDirectories };
}

describe('deleteObsoleteProjectEntries', () => {
  // Java builds its directory candidates from the files it just deleted, so a directory nobody's
  // config references (created in the Crowdin UI, say) is never touched.
  test('leaves an unrelated empty directory alone', async () => {
    const result = await deleteObsolete({
      projectFiles: [{ id: 1, path: '/src/app.json' }],
      projectDirectories: [
        { id: 10, path: '/src' },
        { id: 11, path: '/manual-empty-dir' },
      ],
      expected: ['/src/app.json'],
    });

    expect(result.deletedFiles).toEqual([]);
    expect(result.deletedDirectories).toEqual([]);
  });

  test('still deletes the directories an obsolete file leaves empty, deepest first', async () => {
    const result = await deleteObsolete({
      projectFiles: [{ id: 1, path: '/src/gone/old.json' }],
      projectDirectories: [
        { id: 10, path: '/src' },
        { id: 11, path: '/src/gone' },
      ],
    });

    expect(result.deletedFiles).toEqual(['/src/gone/old.json']);
    expect(result.deletedDirectories).toEqual(['/src/gone', '/src']);
  });

  // ObsoleteSourcesUtils.checkExportPattern: the file's stored export pattern has to satisfy the
  // same group's `translation`, otherwise the file belongs to another group.
  test('keeps a path-matching file whose export pattern belongs to another group', async () => {
    const result = await deleteObsolete({
      projectFiles: [
        { id: 1, path: '/src/other.json', exportOptions: { exportPattern: '/elsewhere/%original_file_name%' } },
      ],
    });

    expect(result.deletedFiles).toEqual([]);
  });

  // Matching runs on the config-pattern matcher (Java's formatSourcePatternForRegex machinery),
  // which expands file placeholders. The CLI-filter matcher this used to call does not, so a
  // placeholder `source` matched nothing and its obsolete files were never cleaned up.
  test('treats a file as managed when the source pattern carries a file placeholder', async () => {
    const result = await deleteObsolete({
      projectFiles: [{ id: 1, path: '/src/app.json' }],
      groups: [{ source: '/src/%original_file_name%', translation: '/l/%locale%/%original_file_name%' }],
    });

    expect(result.deletedFiles).toEqual(['/src/app.json']);
  });

  test('deletes a path-matching file whose export pattern satisfies the group', async () => {
    const result = await deleteObsolete({
      projectFiles: [{ id: 1, path: '/src/other.json', exportOptions: { exportPattern: '/l/%locale%/other.json' } }],
    });

    expect(result.deletedFiles).toEqual(['/src/other.json']);
  });
});

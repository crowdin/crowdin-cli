import { describe, expect, test } from 'bun:test';
import { ProjectFileIndex } from '@/cli/services/file/ProjectFileIndex.ts';

describe('ProjectFileIndex', () => {
  const file = (id: number, path: string) => ({ id, path }) as never;

  test('drops the branch name from every path', () => {
    const index = new ProjectFileIndex([file(1, '/dev/src/app.json')], 'dev');

    expect(index.files.map((entry) => entry.path)).toEqual(['/src/app.json']);
    expect(index.exact('/dev/src/app.json')).toBeUndefined();
  });

  test.each(['src/app.json', '/src/app.json', '/src/app.json/', '//src/app.json', 'src\\app.json'])(
    'finds a file by %p',
    (path) => {
      expect(new ProjectFileIndex([file(1, '/src/app.json')]).exact(path)?.id).toBe(1);
    },
  );

  test('soft prefers the exact path and flags an extension-only match', () => {
    const index = new ProjectFileIndex([file(1, '/src/app.json'), file(2, '/src/other.yml')]);

    expect(index.soft('src/app.json')).toEqual({ file: expect.objectContaining({ id: 1 }), exact: true });
    expect(index.soft('src/other.yaml')).toEqual({ file: expect.objectContaining({ id: 2 }), exact: false });
    expect(index.soft('src/missing.json')).toBeUndefined();
  });

  test('soft never falls back to a path that has a local file of its own', () => {
    const index = new ProjectFileIndex([file(2, '/src/app.yml')]);

    expect(index.soft('src/app.yaml', new Set(['/src/app.yml']))).toBeUndefined();
  });
});

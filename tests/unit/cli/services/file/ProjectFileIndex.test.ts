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

  test('soft falls back to a path with one extra extension', () => {
    expect(new ProjectFileIndex([file(10, '/src/app.json')]).soft('src/app')).toEqual({
      file: expect.objectContaining({ id: 10 }),
      exact: false,
    });
  });

  test('soft prefers the exact path over an extra-extension fallback', () => {
    const index = new ProjectFileIndex([file(1, '/src/app'), file(2, '/src/app.json')]);

    expect(index.soft('src/app.json')).toEqual({ file: expect.objectContaining({ id: 2 }), exact: true });
  });

  test('soft prefers a different extension over an earlier extra-extension fallback', () => {
    // '/src/app.json.bak' only differs by an extra extension; '/src/app.xml' by the extension itself.
    const index = new ProjectFileIndex([file(1, '/src/app.json.bak'), file(2, '/src/app.xml')]);

    expect(index.soft('src/app.json')).toEqual({ file: expect.objectContaining({ id: 2 }), exact: false });
  });

  test('soft leaves a sibling alone when it is uploaded from its own local file', () => {
    const index = new ProjectFileIndex([file(42, '/de.lproj/Foo.stringsdict')]);
    const localPaths = new Set(['/de.lproj/Foo.strings', '/de.lproj/Foo.stringsdict']);

    expect(index.soft('de.lproj/Foo.strings', localPaths)).toBeUndefined();
    expect(index.soft('de.lproj/Foo.strings', new Set(['/de.lproj/Foo.strings']))?.file.id).toBe(42);
  });

  test.each([
    ['/src.v2/app', '/src.json'],
    ['/src/.env', '/src/.npmrc'],
  ])('soft takes the extension from the file name only: %p does not match %p', (wanted, existing) => {
    expect(new ProjectFileIndex([file(1, existing)]).soft(wanted)).toBeUndefined();
  });
});

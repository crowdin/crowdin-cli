import { describe, expect, test } from 'bun:test';
import { fileLookup } from '@/lib/upload/fileLookup.ts';

describe('fileLookup', () => {
  test('returns an exact match', () => {
    const files = new Map([['/src/app.json', 10]]);
    expect(fileLookup('/src/app.json', files)).toEqual({ id: 10, exact: true });
  });

  test('returns a soft match ignoring the extension', () => {
    const files = new Map([['/src/app.xml', 10]]);
    expect(fileLookup('/src/app.json', files)).toEqual({ id: 10, exact: false });
  });

  test('returns a soft match when one side has an extra extension', () => {
    const files = new Map([['/src/app.json', 10]]);
    expect(fileLookup('/src/app', files)).toEqual({ id: 10, exact: false });
  });

  test('prefers an exact match over a soft fallback', () => {
    const files = new Map([
      ['/src/app', 1],
      ['/src/app.json', 2],
    ]);
    expect(fileLookup('/src/app.json', files)).toEqual({ id: 2, exact: true });
  });

  test('prefers an ignore-extension match over an earlier extra-extension fallback', () => {
    // '/src/app.json.bak' is only an extra-extension match for '/src/app.json' (removeExtension ->
    // '/src/app.json'), while '/src/app.xml' is an ignore-extension match (removeExtension ->
    // '/src/app'). Despite appearing first, the fallback must lose to the ignore-extension match.
    const files = new Map([
      ['/src/app.json.bak', 1],
      ['/src/app.xml', 2],
    ]);
    expect(fileLookup('/src/app.json', files)).toEqual({ id: 2, exact: false });
  });

  test('returns undefined when nothing matches', () => {
    const files = new Map([['/src/app.json', 10]]);
    expect(fileLookup('/other/file.json', files)).toBeUndefined();
  });

  test('skips soft match when sibling is a local file being uploaded', () => {
    // Remote only has Foo.stringsdict; local batch includes both Foo.strings and Foo.stringsdict.
    // fileLookup for Foo.strings must NOT soft-match remote Foo.stringsdict — that file
    // belongs to the local Foo.stringsdict upload.
    const strings = 'de.lproj/Foo.strings';
    const stringsdict = 'de.lproj/Foo.stringsdict';

    const localFiles = new Set([strings, stringsdict]);
    const remotePaths = new Map([[stringsdict, 42]]);

    // Without the local-file guard the old code would return stringsdict as a soft match.
    expect(fileLookup(strings, remotePaths, localFiles)).toBeUndefined();

    // The rename use-case must still work: local Foo.txt, remote only Foo.json — soft-match fires.
    const localTxt = 'path/to/Foo.txt';
    const remoteJson = 'path/to/Foo.json';
    const localFilesRename = new Set([localTxt]);
    expect(fileLookup(localTxt, new Map([[remoteJson, 99]]), localFilesRename)).toEqual({
      id: 99,
      exact: false,
    });
  });
});

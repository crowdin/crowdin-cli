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
});

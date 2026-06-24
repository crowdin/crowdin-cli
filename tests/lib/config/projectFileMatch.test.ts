import { describe, expect, test } from 'bun:test';
import {
  containsPattern,
  globToRegex,
  matchesExportPattern,
  matchesManagerSourceFile,
  matchesSourcePattern,
  replaceUnaryAsterisk,
} from '@/lib/config/projectFileMatch.ts';

describe('globToRegex', () => {
  test('translates glob wildcards and file placeholders', () => {
    expect(globToRegex('*.json')).toBe('[^/]+\\.json');
    expect(globToRegex('**/*.json')).toBe('.+/[^/]+\\.json');
    expect(globToRegex('file?.json')).toBe('file[^/]\\.json');
    expect(globToRegex('%original_path%')).toBe('.+');
    expect(globToRegex('%original_file_name%')).toBe('[^/]+');
  });
});

describe('matchesSourcePattern', () => {
  test('matches the whole path when preserveHierarchy is true', () => {
    expect(matchesSourcePattern('resources/en/messages.json', '/resources/en/*.json', true)).toBe(true);
    expect(matchesSourcePattern('other/en/messages.json', '/resources/en/*.json', true)).toBe(false);
  });

  test('matches double asterisk across separators', () => {
    expect(matchesSourcePattern('a/b/c/messages.json', '/**/*.json', true)).toBe(true);
  });

  test('matches only trailing segments when preserveHierarchy is false', () => {
    expect(matchesSourcePattern('messages.json', 'resources/en/messages.json', false)).toBe(true);
    expect(matchesSourcePattern('en/messages.json', 'resources/en/messages.json', false)).toBe(true);
    expect(matchesSourcePattern('resources/en/messages.json', 'resources/en/messages.json', false)).toBe(true);
    expect(matchesSourcePattern('other/messages.xml', 'resources/en/messages.json', false)).toBe(false);
  });
});

describe('matchesExportPattern', () => {
  test('passes when the file has no export pattern', () => {
    expect(matchesExportPattern(undefined, '/%locale%/%original_file_name%', true)).toBe(true);
  });

  test('delegates to matchesSourcePattern when an export pattern is present', () => {
    // Stored export patterns keep their placeholders, which match the config pattern literally.
    expect(matchesExportPattern('/%locale%/messages.json', '/%locale%/*.json', true)).toBe(true);
    expect(matchesExportPattern('/%locale%/messages.xml', '/%locale%/*.json', true)).toBe(false);
  });
});

describe('replaceUnaryAsterisk', () => {
  test('substitutes the matched file segment into a wildcard source segment', () => {
    expect(replaceUnaryAsterisk('/resources/en/*.json', 'uploaded/messages.json')).toBe('/resources/en/messages.json');
  });

  test('aligns from the right and keeps non-matching pattern segments literal', () => {
    expect(replaceUnaryAsterisk('/resources/*/*.json', 'a/b/strings.json')).toBe('/resources/b/strings.json');
  });

  test('leaves ** segments untouched', () => {
    expect(replaceUnaryAsterisk('/resources/**/*.json', 'x/y/messages.json')).toBe('/resources/**/messages.json');
  });
});

describe('containsPattern', () => {
  test('detects glob metacharacters', () => {
    expect(containsPattern('*.json')).toBe(true);
    expect(containsPattern('a/**/b')).toBe(true);
    expect(containsPattern('file?.txt')).toBe(true);
    expect(containsPattern('[abc].json')).toBe(true);
    expect(containsPattern('messages.json')).toBe(false);
  });
});

describe('matchesManagerSourceFile', () => {
  const bean = (overrides: { source?: string; translation?: string; dest?: string } = {}) => ({
    source: '/resources/en/*.json',
    translation: '/%locale%/%original_file_name%',
    ...overrides,
  });

  test('preserve_hierarchy=false: keeps files with no export pattern', () => {
    expect(
      matchesManagerSourceFile(bean(), 'resources/en/messages.json', undefined, '/resources/en/*.json', false),
    ).toBe(true);
  });

  test('preserve_hierarchy=false: matches the translation (with /** optional) against the export pattern', () => {
    const file = bean({ translation: '/%locale%/%original_file_name%' });

    expect(
      matchesManagerSourceFile(
        file,
        'resources/en/messages.json',
        '/%locale%/%original_file_name%',
        '/resources/en/*.json',
        false,
      ),
    ).toBe(true);
    expect(
      matchesManagerSourceFile(
        file,
        'resources/en/messages.json',
        '/strings/%original_file_name%',
        '/resources/en/*.json',
        false,
      ),
    ).toBe(false);
  });

  test('preserve_hierarchy=true: keeps when export pattern is a suffix of the translation', () => {
    const file = bean();

    expect(
      matchesManagerSourceFile(
        file,
        'resources/en/messages.json',
        '/%locale%/%original_file_name%',
        '/resources/en/*.json',
        true,
      ),
    ).toBe(true);
    expect(
      matchesManagerSourceFile(file, 'resources/en/messages.json', '/de/strings.json', '/resources/en/*.json', true),
    ).toBe(false);
  });

  test('preserve_hierarchy=true with dest: file path must match the dest glob', () => {
    const file = bean({ dest: '/uploaded/%original_file_name%' });

    expect(
      matchesManagerSourceFile(
        file,
        'uploaded/messages.json',
        '/%locale%/%original_file_name%',
        '/uploaded/%original_file_name%',
        true,
      ),
    ).toBe(true);
    expect(
      matchesManagerSourceFile(
        file,
        'other/messages.json',
        '/%locale%/%original_file_name%',
        '/uploaded/%original_file_name%',
        true,
      ),
    ).toBe(false);
  });

  test('preserve_hierarchy=true: expands ** before the export-pattern suffix check', () => {
    const file = bean({ source: '/resources/en/**/*.json', translation: '/%locale%/**/%original_file_name%' });

    // ** resolves to 'sub' from the file path, so only the matching export pattern is kept.
    expect(
      matchesManagerSourceFile(
        file,
        'resources/en/sub/messages.json',
        '/%locale%/sub/%original_file_name%',
        '/resources/en/**/*.json',
        true,
      ),
    ).toBe(true);
    expect(
      matchesManagerSourceFile(
        file,
        'resources/en/sub/messages.json',
        '/%locale%/elsewhere/%original_file_name%',
        '/resources/en/**/*.json',
        true,
      ),
    ).toBe(false);
  });

  test('preserve_hierarchy=true: a literal source name must equal the file name', () => {
    // source has no wildcard, so containsPattern(sourceName) is false and the file name must match.
    const file = bean({ source: '/resources/en/messages.json' });

    expect(
      matchesManagerSourceFile(
        file,
        'resources/en/messages.json',
        '/%locale%/%original_file_name%',
        '/resources/en/messages.json',
        true,
      ),
    ).toBe(true);
    expect(
      matchesManagerSourceFile(
        file,
        'resources/en/other.json',
        '/%locale%/%original_file_name%',
        '/resources/en/messages.json',
        true,
      ),
    ).toBe(false);
  });
});

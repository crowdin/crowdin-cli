import { describe, expect, test } from 'bun:test';
import { globToRegex, matchesExportPattern, matchesSourcePattern } from '@/lib/config/projectFileMatch.ts';

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

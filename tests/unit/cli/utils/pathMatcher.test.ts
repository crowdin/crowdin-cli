import { describe, expect, test } from 'bun:test';
import { isPathMatch } from '@/cli/utils/pathMatcher.ts';

describe('isPathMatch', () => {
  test('matches an exact file name regardless of leading slash', () => {
    expect(isPathMatch('/android-new-file.xml', 'android-new-file.xml')).toBe(true);
    expect(isPathMatch('android-new-file.xml', '/android-new-file.xml')).toBe(true);
    expect(isPathMatch('/android-new-file2.xml', 'android-new-file.xml')).toBe(false);
  });

  test("treats '.' literally", () => {
    expect(isPathMatch('/fileaxml', 'file.xml')).toBe(false);
  });

  test("matches '*' within a single path segment", () => {
    expect(isPathMatch('/strings.xml', '*.xml')).toBe(true);
    expect(isPathMatch('/dir/strings.xml', '*.xml')).toBe(false);
    expect(isPathMatch('/dir/strings.xml', '/dir/*.xml')).toBe(true);
  });

  test("matches '**' across directories", () => {
    expect(isPathMatch('/a/b/c/strings.xml', '/**/*.xml')).toBe(true);
    expect(isPathMatch('/strings.xml', '/**/*.xml')).toBe(true);
    expect(isPathMatch('/a/b/c/strings.json', '/**/*.xml')).toBe(false);
  });

  test("matches '?' as a single character", () => {
    expect(isPathMatch('/file1.xml', 'file?.xml')).toBe(true);
    expect(isPathMatch('/file12.xml', 'file?.xml')).toBe(false);
  });

  test('treats square brackets in folder names literally', () => {
    expect(isPathMatch('/[test.Folder dev]/resources/js/lang/en/auth.php', '/[test.Folder dev]/**/*.php')).toBe(true);
    expect(isPathMatch('/[test.Folder dev]/resources/js/lang/en/email.php', '/[test.Folder dev]/**/*.php')).toBe(true);
    expect(isPathMatch('/t/resources/js/lang/en/auth.php', '/[test.Folder dev]/**/*.php')).toBe(false);
  });

  test('normalizes windows path separators', () => {
    expect(isPathMatch('dir\\strings.xml', '/dir/*.xml')).toBe(true);
  });
});

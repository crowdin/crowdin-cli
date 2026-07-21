import { describe, expect, test } from 'bun:test';
import { stripBranchPrefix, toPosixPath } from '@/lib/utils/path.ts';

describe('stripBranchPrefix', () => {
  test('drops the branch segment', () => {
    expect(stripBranchPrefix('/dev/sources/en.json', 'dev')).toBe('/sources/en.json');
  });

  test('returns the path unchanged without a branch', () => {
    expect(stripBranchPrefix('/sources/en.json')).toBe('/sources/en.json');
  });

  test('leaves a directory that merely starts with the branch name', () => {
    expect(stripBranchPrefix('/development/en.json', 'dev')).toBe('/development/en.json');
  });

  test('strips only the first segment', () => {
    expect(stripBranchPrefix('/dev/dev/en.json', 'dev')).toBe('/dev/en.json');
  });

  test('adds the leading slash a relative path is missing', () => {
    expect(stripBranchPrefix('dev/en.json', 'dev')).toBe('/en.json');
  });
});

describe('toPosixPath', () => {
  test('returns forward-slash path unchanged', () => {
    expect(toPosixPath('src/locales/en.json')).toBe('src/locales/en.json');
  });

  test('converts single backslash separator', () => {
    expect(toPosixPath('src\\locales\\en.json')).toBe('src/locales/en.json');
  });

  test('converts mixed separators', () => {
    expect(toPosixPath('src/locales\\en.json')).toBe('src/locales/en.json');
  });

  test('converts Windows absolute path', () => {
    expect(toPosixPath('C:\\Users\\project\\crowdin.yml')).toBe('C:/Users/project/crowdin.yml');
  });

  test('handles empty string', () => {
    expect(toPosixPath('')).toBe('');
  });

  test('handles filename with no separators', () => {
    expect(toPosixPath('en.json')).toBe('en.json');
  });

  test('handles leading backslash', () => {
    expect(toPosixPath('\\src\\file.ts')).toBe('/src/file.ts');
  });

  test('handles consecutive backslashes', () => {
    expect(toPosixPath('src\\\\file.ts')).toBe('src//file.ts');
  });
});

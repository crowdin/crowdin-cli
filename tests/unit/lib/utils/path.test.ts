import { describe, expect, test } from 'bun:test';
import { getCommonPath, stripBranchPrefix, toPosixPath, toSafeFileName } from '@/lib/utils/path.ts';

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

describe('toSafeFileName', () => {
  test('keeps an ordinary name', () => {
    expect(toSafeFileName("Bun CLI's Glossary")).toBe("Bun CLI's Glossary");
  });

  test('replaces path separators so the name cannot leave the directory', () => {
    expect(toSafeFileName('../outside')).toBe('.._outside');
    expect(toSafeFileName('..\\outside')).toBe('.._outside');
    expect(toSafeFileName('/etc/passwd')).toBe('_etc_passwd');
    expect(toSafeFileName('UI/UX Guide')).toBe('UI_UX Guide');
  });

  test('replaces characters Windows rejects in file names', () => {
    expect(toSafeFileName('a:b*c?d"e<f>g|h\tI')).toBe('a_b_c_d_e_f_g_h_I');
  });
});

describe('getCommonPath', () => {
  test('returns the shared parent directory with a trailing slash', () => {
    expect(getCommonPath(['src/foo/a.json', 'src/foo/b.json'])).toBe('src/foo/');
  });

  test('trims back to the last separator when files diverge inside a directory', () => {
    expect(getCommonPath(['src/foo/a.json', 'src/bar/b.json'])).toBe('src/');
  });

  test('does not strip a partial directory-name match', () => {
    // Raw string prefix is "src/foo", but it must trim to "src/" so "foobar" is not cut mid-name.
    expect(getCommonPath(['src/foo/a.json', 'src/foobar/b.json'])).toBe('src/');
  });

  test('returns the directory of a single file', () => {
    expect(getCommonPath(['src/foo/a.json'])).toBe('src/foo/');
  });

  test('returns empty string for top-level files with no shared directory', () => {
    expect(getCommonPath(['a.json', 'b.json'])).toBe('');
  });

  test('returns empty string for no files', () => {
    expect(getCommonPath([])).toBe('');
  });
});

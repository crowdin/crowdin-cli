import { describe, expect, test } from 'bun:test';
import { toPosixPath } from '@/lib/utils/path.ts';

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

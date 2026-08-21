import { describe, expect, test } from 'bun:test';
import { fileTree } from '@/cli/utils/fileTree.ts';

describe('fileTree', () => {
  test('empty input returns only root', () => {
    expect(fileTree([])).toEqual(['.']);
  });

  test('flat files render under root', () => {
    expect(fileTree(['a.txt', 'b.txt'])).toEqual(['.', '├─ a.txt', '╰─ b.txt']);
  });

  test('single file uses last-element marker', () => {
    expect(fileTree(['file.txt'])).toEqual(['.', '╰─ file.txt']);
  });

  test('nested files render with indentation', () => {
    const result = fileTree(['src/index.ts', 'src/utils.ts']);
    expect(result).toEqual(['.', '╰─ src', '   ├─ index.ts', '   ╰─ utils.ts']);
  });

  test('multiple directories render with continuation lines', () => {
    const result = fileTree(['a/x.ts', 'b/y.ts']);
    expect(result).toEqual(['.', '├─ a', '│  ╰─ x.ts', '╰─ b', '   ╰─ y.ts']);
  });

  test('deeply nested path renders with stacked indentation', () => {
    const result = fileTree(['a/b/c/file.ts']);
    expect(result).toEqual(['.', '╰─ a', '   ╰─ b', '      ╰─ c', '         ╰─ file.ts']);
  });

  test('sibling directories each with multiple files', () => {
    const result = fileTree(['src/a.ts', 'src/b.ts', 'tests/a.test.ts']);
    expect(result).toEqual(['.', '├─ src', '│  ├─ a.ts', '│  ╰─ b.ts', '╰─ tests', '   ╰─ a.test.ts']);
  });

  test('output is sorted alphabetically', () => {
    const result = fileTree(['z.txt', 'a.txt', 'm.txt']);
    expect(result).toEqual(['.', '├─ a.txt', '├─ m.txt', '╰─ z.txt']);
  });

  test('leading slashes are stripped', () => {
    expect(fileTree(['/foo/bar.ts'])).toEqual(fileTree(['foo/bar.ts']));
  });

  test('shared directory prefix is not duplicated', () => {
    const result = fileTree(['src/a.ts', 'src/b.ts', 'src/c.ts']);
    const srcLines = result.filter((l) => l.includes('src'));
    expect(srcLines).toHaveLength(1);
  });
});

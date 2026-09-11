import { describe, expect, test } from 'bun:test';
import type { SourceFilesModel } from '@crowdin/crowdin-api-client';
import { fileVerboseView, fileView } from '@/cli/commands/file/views.ts';

describe('file views', () => {
  const createFile = (overrides: Partial<SourceFilesModel.File> = {}): SourceFilesModel.File =>
    ({ id: 1, path: '/docs/readme.md', type: 'md', ...overrides }) as SourceFilesModel.File;

  test('renders id and path, leading slashes stripped', () => {
    expect(fileView.text(createFile())).toBe('#1 docs/readme.md');
    expect(fileView.plain?.(createFile())).toBe('1 docs/readme.md');
  });

  test('renders parser and revision when the file carries them', () => {
    const file = createFile({ parserVersion: 4, revisionId: 7 });

    expect(fileVerboseView.text(file)).toBe('#1 docs/readme.md md parser:4 revision:7');
    expect(fileVerboseView.plain?.(file)).toBe('1 docs/readme.md md 4 7');
  });

  test('falls back to the type alone when parser and revision are missing', () => {
    // Java's FileListAction switches on FileInfo vs File for the same reason.
    expect(fileVerboseView.text(createFile())).toBe('#1 docs/readme.md md');
    expect(fileVerboseView.plain?.(createFile())).toBe('1 docs/readme.md md');
  });
});

import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import os from 'node:os';
import { openUrl } from '@/cli/utils/open.ts';

describe('openUrl', () => {
  afterEach(() => {
    mock.restore();
  });

  test('uses "open" on macOS', () => {
    spyOn(os, 'platform').mockReturnValue('darwin');
    const spawn = spyOn(Bun, 'spawn').mockReturnValue({} as never);

    openUrl('https://example.com');

    expect(spawn).toHaveBeenCalledWith(['open', 'https://example.com']);
  });

  test('uses "start" on Windows', () => {
    spyOn(os, 'platform').mockReturnValue('win32');
    const spawn = spyOn(Bun, 'spawn').mockReturnValue({} as never);

    openUrl('https://example.com');

    expect(spawn).toHaveBeenCalledWith(['cmd', '/c', 'start', '', 'https://example.com']);
  });

  test('uses "xdg-open" on Linux', () => {
    spyOn(os, 'platform').mockReturnValue('linux');
    const spawn = spyOn(Bun, 'spawn').mockReturnValue({} as never);

    const result = openUrl('https://example.com');

    expect(spawn).toHaveBeenCalledWith(['xdg-open', 'https://example.com']);
    expect(result).toBe(true);
  });

  test('returns false when opener binary is missing (e.g. xdg-open on headless Linux)', () => {
    spyOn(os, 'platform').mockReturnValue('linux');
    spyOn(Bun, 'spawn').mockImplementation(() => {
      throw new Error('Executable not found in $PATH: "xdg-open"');
    });

    expect(openUrl('https://example.com')).toBe(false);
  });
});

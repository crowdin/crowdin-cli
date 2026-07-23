import { describe, expect, test } from 'bun:test';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { expandTilde } from '@/cli/utils/localPath.ts';

describe('expandTilde', () => {
  test('expands a leading ~ or ~/ to the home directory', () => {
    expect(expandTilde('~')).toBe(homedir());
    expect(expandTilde('~/code/app')).toBe(join(homedir(), 'code/app'));
  });

  test('leaves other paths untouched', () => {
    expect(expandTilde('~backup')).toBe('~backup');
    expect(expandTilde('relative/path')).toBe('relative/path');
    expect(expandTilde('/absolute/path')).toBe('/absolute/path');
  });
});

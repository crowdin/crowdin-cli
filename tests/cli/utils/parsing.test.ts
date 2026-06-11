import { describe, expect, test } from 'bun:test';
import { normalizeBranchName } from '@/cli/utils/parsing.ts';

describe('normalizeBranchName', () => {
  test('replaces unallowed symbols with dots', () => {
    expect(normalizeBranchName('main|1>2')).toBe('main.1.2');
    expect(normalizeBranchName('dev/1')).toBe('dev.1');
    expect(normalizeBranchName('dev\\1')).toBe('dev.1');
    expect(normalizeBranchName('feat:123?')).toBe('feat.123.');
    expect(normalizeBranchName('base*')).toBe('base.');
    expect(normalizeBranchName('test?"')).toBe('test..');
    expect(normalizeBranchName('test<')).toBe('test.');
    expect(normalizeBranchName('main')).toBe('main');
  });
});

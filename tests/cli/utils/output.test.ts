import { describe, expect, test } from 'bun:test';
import { getOutputFormatFromArgs } from '@/cli/utils/output.ts';

describe('getOutputFormat', () => {
  test('defaults to text when no output flag is present', () => {
    expect(getOutputFormatFromArgs(['file', 'upload']).output).toBe('text');
  });

  test('reads a spaced --output value', () => {
    expect(getOutputFormatFromArgs(['--output', 'plain']).output).toBe('plain');
  });

  test('reads the -o short flag', () => {
    expect(getOutputFormatFromArgs(['-o', 'json']).output).toBe('json');
  });

  test('reads an --output=value form', () => {
    expect(getOutputFormatFromArgs(['--output=toon']).output).toBe('toon');
  });

  test('ignores an unknown output value and keeps the default', () => {
    expect(getOutputFormatFromArgs(['--output', 'xml']).output).toBe('text');
  });
});

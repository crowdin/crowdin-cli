import { describe, expect, test } from 'bun:test';
import { ExitCode, getExitCode } from '@/cli/errors/CliError.ts';
import { normalizeBranchName, parseNumericId, toNumberArray } from '@/cli/utils/parsing.ts';

// Java declares these ids as Long, so picocli's Long.parseLong rejects anything else with a usage
// error. Number() would accept all of the below and forward junk to the API as a real id.
describe('parseNumericId', () => {
  test('accepts the integer forms Long.parseLong does', () => {
    expect(parseNumericId('12', 'Bundle')).toBe(12);
    expect(parseNumericId('-3', 'Bundle')).toBe(-3);
    expect(parseNumericId('+7', 'Bundle')).toBe(7);
  });

  test.each(['1.5', '1e3', '0x10', ' 12 ', 'Infinity', '  ', 'abc'])('rejects %p', (value) => {
    expect(() => parseNumericId(value, 'Bundle')).toThrow('Bundle id');
  });

  test('rejects with the validation exit code, as picocli does', () => {
    try {
      parseNumericId('1.5', 'Bundle');
      throw new Error('expected parseNumericId to throw');
    } catch (error) {
      expect(getExitCode(error)).toBe(ExitCode.VALIDATION);
    }
  });
});

describe('toNumberArray', () => {
  test('accepts integers and passes through real numbers', () => {
    expect(toNumberArray(['1', '2'], 'bad')).toEqual([1, 2]);
    expect(toNumberArray([3, '4'], 'bad')).toEqual([3, 4]);
  });

  test.each(['1.5', '1e3', ' 1 '])('rejects %p', (value) => {
    expect(() => toNumberArray([value], "'--label' value must be numeric")).toThrow('must be numeric');
  });
});

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

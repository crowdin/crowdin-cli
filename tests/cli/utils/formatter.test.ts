import { describe, expect, test } from 'bun:test';
import { formatData } from '@/cli/utils/formatter.ts';

describe('plain formatter', () => {
  test('array of objects outputs first value per item newline-joined', () => {
    const data = [
      { code: 'en', name: 'English' },
      { code: 'de', name: 'German' },
      { code: 'uk', name: 'Ukrainian' },
    ];
    expect(formatData(data, 'plain')).toBe('en\nde\nuk');
  });

  test('array of primitives outputs each item newline-joined', () => {
    expect(formatData(['en', 'de', 'uk'], 'plain')).toBe('en\nde\nuk');
  });

  test('empty array outputs empty string', () => {
    expect(formatData([], 'plain')).toBe('');
  });

  test('single-item array outputs first value without newline', () => {
    expect(formatData([{ code: 'en', name: 'English' }], 'plain')).toBe('en');
  });

  test('single object outputs first value', () => {
    expect(formatData({ code: 'en', name: 'English' }, 'plain')).toBe('en');
  });

  test('primitive string outputs as-is', () => {
    expect(formatData('hello', 'plain')).toBe('hello');
  });

  test('null first value falls back to empty string', () => {
    expect(formatData([{ code: null, name: 'English' }], 'plain')).toBe('');
  });
});

import { describe, expect, test } from 'bun:test';
import { formatPlain } from '@/cli/utils/formatter/plainFormatter.ts';

describe('plain formatter', () => {
  test('array of objects outputs first value per item newline-joined', () => {
    const data = [
      { code: 'en', name: 'English' },
      { code: 'de', name: 'German' },
      { code: 'uk', name: 'Ukrainian' },
    ];
    expect(formatPlain(data)).toBe('en\nde\nuk');
  });

  test('array of primitives outputs each item newline-joined', () => {
    expect(formatPlain(['en', 'de', 'uk'])).toBe('en\nde\nuk');
  });

  test('empty array outputs empty string', () => {
    expect(formatPlain([])).toBe('');
  });

  test('single-item array outputs first value without newline', () => {
    expect(formatPlain([{ code: 'en', name: 'English' }])).toBe('en');
  });

  test('single object outputs first value', () => {
    expect(formatPlain({ code: 'en', name: 'English' })).toBe('en');
  });

  test('primitive string outputs as-is', () => {
    expect(formatPlain('hello')).toBe('hello');
  });

  test('null first value falls back to empty string', () => {
    expect(formatPlain([{ code: null, name: 'English' }])).toBe('');
  });

  test('nested object descends to first leaf value', () => {
    const data = {
      translation: { fr: '87%', de: '92%' },
      proofread: { fr: '75%', de: '88%' },
    };
    expect(formatPlain(data)).toBe('87%');
  });
});

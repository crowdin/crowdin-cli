import { describe, expect, test } from 'bun:test';
import { validTranslationPattern } from '@/lib/export/patterns.ts';

describe('validTranslationPattern', () => {
  test('accepts known placeholders and literal/glob segments', () => {
    expect(validTranslationPattern('/resources/%two_letters_code%/%original_file_name%')).toBe(true);
    expect(validTranslationPattern('/locales/en/**/*.json')).toBe(true);
    expect(validTranslationPattern('%locale%')).toBe(true);
  });

  test('rejects an unknown %-wrapped segment', () => {
    expect(validTranslationPattern('/resources/%bogus%/%original_file_name%')).toBe(false);
    expect(validTranslationPattern('%not_a_placeholder%')).toBe(false);
  });
});

import { describe, expect, test } from 'bun:test';
import type { LanguagesModel } from '@crowdin/crowdin-api-client';
import { containsLanguagePlaceholder, resolveLanguagePlaceholders } from '@/lib/export/languagePlaceholders.ts';

const afrikaans = {
  id: 'af',
  name: 'Afrikaans',
  locale: 'af-ZA',
  twoLettersCode: 'af',
  androidCode: 'af-rZA',
} as LanguagesModel.Language;

describe('%android_code% placeholder', () => {
  test('counts as a language placeholder (validation)', () => {
    expect(containsLanguagePlaceholder('/res/values-%android_code%/strings.xml')).toBe(true);
  });

  test('resolves to the android code', () => {
    expect(resolveLanguagePlaceholders('/res/values-%android_code%/strings.xml', afrikaans)).toBe(
      '/res/values-af-rZA/strings.xml',
    );
  });
});

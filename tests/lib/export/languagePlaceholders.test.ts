import { describe, expect, test } from 'bun:test';
import type { LanguagesModel, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import {
  containsLanguagePlaceholder,
  expandIgnorePatterns,
  resolveLanguagePlaceholders,
} from '@/lib/export/languagePlaceholders.ts';

const afrikaans = {
  id: 'af',
  name: 'Afrikaans',
  locale: 'af-ZA',
  twoLettersCode: 'af',
  androidCode: 'af-rZA',
} as LanguagesModel.Language;

const ukrainian = {
  id: 'ua',
  name: 'Ukrainian',
  locale: 'uk',
  twoLettersCode: 'uk',
  androidCode: 'uk',
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

describe('expandIgnorePatterns', () => {
  test('leaves a pattern without a language placeholder unchanged', () => {
    expect(expandIgnorePatterns(['vendor/**'], [afrikaans, ukrainian])).toEqual(['vendor/**']);
  });

  test('expands a placeholder pattern once per language, deduped', () => {
    expect(expandIgnorePatterns(['*-%locale%.po'], [afrikaans, ukrainian]).sort()).toEqual(
      ['*-af-ZA.po', '*-uk.po'].sort(),
    );
  });

  test('honors a server language mapping override', () => {
    const serverLanguageMapping = { ua: { locale: 'ukrainian' } } as unknown as ProjectsGroupsModel.LanguageMapping;

    expect(expandIgnorePatterns(['*-%locale%.po'], [ukrainian], serverLanguageMapping)).toEqual(['*-ukrainian.po']);
  });

  test('a per-file mapping overrides the server mapping', () => {
    const serverLanguageMapping = { ua: { locale: 'ukrainian' } } as unknown as ProjectsGroupsModel.LanguageMapping;
    const fileLanguageMapping = { locale: { ua: 'ua-local' } };

    expect(expandIgnorePatterns(['*-%locale%.po'], [ukrainian], serverLanguageMapping, fileLanguageMapping)).toEqual([
      '*-ua-local.po',
    ]);
  });
});

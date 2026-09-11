import { describe, expect, test } from 'bun:test';
import { resolveDownloadLanguages } from '@/lib/download/languages.ts';

const language = (id: string) => ({ id, name: id }) as never;
const projectLanguages = [language('de'), language('fr'), language('uk')];
const ids = (result: { languages: { id: string }[] }) => result.languages.map((l) => l.id);

describe('resolveDownloadLanguages', () => {
  test('defaults to every project language and pins nothing', () => {
    const result = resolveDownloadLanguages(projectLanguages, {});

    expect(ids(result)).toEqual(['de', 'fr', 'uk']);
    // Java leaves targetLanguageIds off the build request when the set was never narrowed.
    expect(result.languageIds).toBeUndefined();
  });

  test('--language replaces the set and pins the build', () => {
    const result = resolveDownloadLanguages(projectLanguages, { language: ['fr'] });

    expect(ids(result)).toEqual(['fr']);
    expect(result.languageIds).toEqual(['fr']);
  });

  test('--exclude-language subtracts and pins the remainder', () => {
    const result = resolveDownloadLanguages(projectLanguages, { excludeLanguage: ['fr'] });

    expect(ids(result)).toEqual(['de', 'uk']);
    expect(result.languageIds).toEqual(['de', 'uk']);
  });

  test('export_languages narrows the base set and pins it', () => {
    const result = resolveDownloadLanguages(projectLanguages, {}, ['de', 'uk']);

    expect(ids(result)).toEqual(['de', 'uk']);
    expect(result.languageIds).toEqual(['de', 'uk']);
  });

  test('excludes apply on top of export_languages', () => {
    const result = resolveDownloadLanguages(projectLanguages, { excludeLanguage: ['uk'] }, ['de', 'uk']);

    expect(ids(result)).toEqual(['de']);
    expect(result.languageIds).toEqual(['de']);
  });

  test('--language wins over export_languages', () => {
    const result = resolveDownloadLanguages(projectLanguages, { language: ['uk'] }, ['de']);

    expect(ids(result)).toEqual(['uk']);
    expect(result.languageIds).toEqual(['uk']);
  });

  test('rejects --language together with --exclude-language', () => {
    expect(() => resolveDownloadLanguages(projectLanguages, { language: ['de'], excludeLanguage: ['fr'] })).toThrow(
      "can't be used simultaneously",
    );
  });

  test.each([
    ['--language', { language: ['es'] }, undefined],
    ['--exclude-language', { excludeLanguage: ['es'] }, undefined],
    ['export_languages', {}, ['es']],
  ])('rejects a language the project does not have via %s', (_label, options, exportLanguages) => {
    expect(() => resolveDownloadLanguages(projectLanguages, options, exportLanguages)).toThrow(
      "Language 'es' doesn't exist in the project",
    );
  });

  // getProjectLanguages(true) includes the in-context pseudo language, so it is selectable.
  test('accepts a language only present because of the in-context pseudo language', () => {
    const result = resolveDownloadLanguages([...projectLanguages, language('pseudo')], { language: ['pseudo'] });

    expect(ids(result)).toEqual(['pseudo']);
  });
});

import { describe, expect, test } from 'bun:test';
import type { SourceFilesModel } from '@crowdin/crowdin-api-client';
import { buildAllProjectTranslations } from '@/lib/download/projectTranslations.ts';

const language = (id: string, locale: string) =>
  ({
    id,
    name: id,
    locale,
    twoLettersCode: id,
    threeLettersCode: id,
    osxCode: '',
    osxLocale: '',
  }) as never;

const projectFile = (fields: object) => fields as SourceFilesModel.File;

describe('buildAllProjectTranslations', () => {
  test('maps a project file to its per-language export paths', () => {
    const result = buildAllProjectTranslations(
      [
        projectFile({
          path: '/resources/en/messages.json',
          exportOptions: { exportPattern: '/resources/%locale%/%original_file_name%' },
        }),
      ],
      [language('fr', 'fr-FR'), language('de', 'de-DE')],
      undefined,
    );

    expect(result.get('resources/en/messages.json')).toEqual([
      'resources/fr-FR/messages.json',
      'resources/de-DE/messages.json',
    ]);
  });

  test('prefixes language id when export pattern has no language placeholder', () => {
    const result = buildAllProjectTranslations(
      [projectFile({ path: '/docs/readme.md', exportOptions: { exportPattern: '/docs/%original_file_name%' } })],
      [language('fr', 'fr-FR')],
      undefined,
    );

    expect(result.get('docs/readme.md')).toEqual(['fr/docs/readme.md']);
  });

  test('lists a multilingual file itself plus a copy per language, by name', () => {
    const result = buildAllProjectTranslations(
      [projectFile({ path: '/docs/strings.xliff', name: 'strings.xliff', exportOptions: null })],
      [language('fr', 'fr-FR'), language('de', 'de-DE')],
      undefined,
    );

    expect(result.get('docs/strings.xliff')).toEqual(['strings.xliff', 'fr/strings.xliff', 'de/strings.xliff']);
  });
});

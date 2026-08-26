import { describe, expect, test } from 'bun:test';
import { buildAllProjectTranslations, sortOmittedFiles } from '@/lib/download/projectTranslations.ts';

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

describe('buildAllProjectTranslations', () => {
  test('maps a project file to its per-language export paths', () => {
    const result = buildAllProjectTranslations(
      [
        {
          data: {
            path: '/resources/en/messages.json',
            exportOptions: { exportPattern: '/resources/%locale%/%original_file_name%' },
          },
        },
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
      [{ data: { path: '/docs/readme.md', exportOptions: { exportPattern: '/docs/%original_file_name%' } } }],
      [language('fr', 'fr-FR')],
      undefined,
    );

    expect(result.get('docs/readme.md')).toEqual(['fr/docs/readme.md']);
  });
});

describe('sortOmittedFiles', () => {
  const allProjectTranslations = new Map<string, string[]>([
    ['resources/en/other.json', ['resources/fr-FR/other.json']],
  ]);

  test('buckets omitted files under their source', () => {
    const { withSources, withoutSources } = sortOmittedFiles(['resources/fr-FR/other.json'], allProjectTranslations);

    expect(withSources.get('resources/en/other.json')).toEqual(['resources/fr-FR/other.json']);
    expect(withoutSources).toEqual([]);
  });

  test('collects omitted files with no matching source', () => {
    const { withSources, withoutSources } = sortOmittedFiles(['unrelated/file.json'], allProjectTranslations);

    expect(withSources.size).toBe(0);
    expect(withoutSources).toEqual(['unrelated/file.json']);
  });
});

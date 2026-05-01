import { describe, expect, test } from 'bun:test';
import TranslationPathResolver from '../../../src/lib/config/translationPathResolver.ts';
import { ConfigSchema } from '../../../src/lib/config.ts';

describe('translation path resolver', () => {
  test('resolves path for export pattern', async () => {
    const basePath = await mkdtemp();

    const dataProvider = [
      {
        name: 'one file section',
        config: ConfigSchema.parse({
          projectId: 123,
          apiToken: 'a'.repeat(80),
          basePath,
          baseUrl: 'https://api.crowdin.com',
          preserveHierarchy: true,
          files: [
            {
              source: '/resources/en/*.md',
              translation: '/resources/%two_letters_code%/%original_file_name%',
            },
          ],
        }),
        file: {
          path: 'resources/en/readme.md',
        },
        language: {
          id: 'es',
          name: 'Spanish',
          editorCode: 'es',
          twoLettersCode: 'es',
          threeLettersCode: 'spa',
          locale: 'es-ES',
          androidCode: 'es-rES',
          osxCode: 'es.lproj',
          osxLocale: 'es',
          pluralCategoryNames: ['one'],
          pluralRules: '(n != 1)',
          pluralExamples: ['0, 2-999; 1.2, 2.07...'],
          textDirection: 'ltr',
          dialectOf: 'es',
        },
        expected: '/resources/es/readme.md',
      },
      {
        name: 'two file sections',
        config: ConfigSchema.parse({
          projectId: 123,
          apiToken: 'a'.repeat(80),
          basePath,
          baseUrl: 'https://api.crowdin.com',
          preserveHierarchy: true,
          files: [
            {
              source: '/resources/en/*.md',
              translation: '/resources/%two_letters_code%/%original_file_name%',
            },
            {
              source: '/resources/emails/en/*.md',
              translation: '/resources/emails/%two_letters_code%/%original_file_name%',
            },
          ],
        }),
        file: {
          path: 'resources/emails/en/welcome.md',
        },
        language: {
          id: 'es',
          name: 'Spanish',
          editorCode: 'es',
          twoLettersCode: 'es',
          threeLettersCode: 'spa',
          locale: 'es-ES',
          androidCode: 'es-rES',
          osxCode: 'es.lproj',
          osxLocale: 'es',
          pluralCategoryNames: ['one'],
          pluralRules: '(n != 1)',
          pluralExamples: ['0, 2-999; 1.2, 2.07...'],
          textDirection: 'ltr',
          dialectOf: 'es',
        },
        expected: '/resources/emails/es/welcome.md',
      },
      {
        name: 'complex translation pattern',
        config: ConfigSchema.parse({
          projectId: 123,
          apiToken: 'a'.repeat(80),
          basePath,
          baseUrl: 'https://api.crowdin.com',
          preserveHierarchy: true,
          files: [
            {
              source: '/resources/en/*.md',
              translation: '/resources/%three_letters_code%/%file_name%.%file_extension%',
            },
          ],
        }),
        file: {
          path: 'resources/en/readme.md',
        },
        language: {
          id: 'es',
          name: 'Spanish',
          editorCode: 'es',
          twoLettersCode: 'es',
          threeLettersCode: 'spa',
          locale: 'es-ES',
          androidCode: 'es-rES',
          osxCode: 'es.lproj',
          osxLocale: 'es',
          pluralCategoryNames: ['one'],
          pluralRules: '(n != 1)',
          pluralExamples: ['0, 2-999; 1.2, 2.07...'],
          textDirection: 'ltr',
          dialectOf: 'es',
        },
        expected: '/resources/spa/readme.md',
      },
    ];

    await Bun.write(`${basePath}/resources/en/readme.md`, 'readme');
    await Bun.write(`${basePath}/resources/emails/en/welcome.md`, 'welcome');

    for (const { config, file, language, expected } of dataProvider) {
      const actual = new TranslationPathResolver(config).resolve(Bun.file(file.path), language);

      expect(actual).toBe(expected);
    }
  });
});

async function mkdtemp(): Promise<string> {
  const basePath = `/tmp/crowdin-translation-path-resolver-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  await Bun.$`mkdir -p ${basePath}/resources/en ${basePath}/resources/emails/en`.quiet();

  return basePath;
}

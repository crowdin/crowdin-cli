import { describe, expect, test } from 'bun:test';
import TranslationPathResolver from '@/lib/config/translationPathResolver.ts';
import { ConfigSchema } from '@/lib/config.ts';

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

  test('expands ** in the translation pattern from the matched source subpath', async () => {
    const config = ConfigSchema.parse({
      projectId: 123,
      apiToken: 'a'.repeat(80),
      basePath: '/tmp',
      baseUrl: 'https://api.crowdin.com',
      preserveHierarchy: true,
      files: [
        {
          source: '/resources/en/**/*.md',
          translation: '/resources/%two_letters_code%/**/%original_file_name%',
        },
      ],
    });
    const language = {
      id: 'es',
      name: 'Spanish',
      twoLettersCode: 'es',
      threeLettersCode: 'spa',
      locale: 'es-ES',
      androidCode: 'es-rES',
      osxCode: 'es.lproj',
      osxLocale: 'es',
      editorCode: 'es',
    } as never;
    const resolver = new TranslationPathResolver(config);
    const fileConfig = config.files[0] as never;

    // Local destination expands ** to the matched subpath 'sub'.
    expect(resolver.resolveWithConfig(fileConfig, 'resources/en/sub/readme.md', language, undefined)).toBe(
      '/resources/es/sub/readme.md',
    );

    // Server/archive path (serverOnly) expands ** the same way.
    expect(
      resolver.resolveWithConfig(fileConfig, 'resources/en/sub/readme.md', language, undefined, {
        serverOnly: true,
        preserveHierarchy: true,
      }),
    ).toBe('/resources/es/sub/readme.md');
  });

  test('resolves translation path using per-file languagesMapping override', async () => {
    const basePath = await mkdtemp();
    await Bun.write(`${basePath}/resources/en/readme.md`, 'readme');

    const config = ConfigSchema.parse({
      projectId: 123,
      apiToken: 'a'.repeat(80),
      basePath,
      baseUrl: 'https://api.crowdin.com',
      preserveHierarchy: true,
      files: [
        {
          source: '/resources/en/*.md',
          translation: '/resources/%two_letters_code%/%original_file_name%',
          languages_mapping: {
            two_letters_code: {
              es: 'es-custom',
            },
          },
        },
      ],
    });

    const actual = new TranslationPathResolver(config).resolve(Bun.file('resources/en/readme.md'), language('es'));

    expect(actual).toBe('/resources/es-custom/readme.md');
  });

  test('resolves translation path using server language mapping', async () => {
    const basePath = await mkdtemp();
    await Bun.write(`${basePath}/resources/en/readme.md`, 'readme');

    const config = ConfigSchema.parse({
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
    });

    const serverMapping = { es: { two_letters_code: 'es-server' } } as never;
    const actual = new TranslationPathResolver(config).resolve(
      Bun.file('resources/en/readme.md'),
      language('es'),
      serverMapping,
    );

    expect(actual).toBe('/resources/es-server/readme.md');
  });

  test('per-file languagesMapping takes precedence over server mapping', async () => {
    const basePath = await mkdtemp();
    await Bun.write(`${basePath}/resources/en/readme.md`, 'readme');

    const config = ConfigSchema.parse({
      projectId: 123,
      apiToken: 'a'.repeat(80),
      basePath,
      baseUrl: 'https://api.crowdin.com',
      preserveHierarchy: true,
      files: [
        {
          source: '/resources/en/*.md',
          translation: '/resources/%two_letters_code%/%original_file_name%',
          languages_mapping: { two_letters_code: { es: 'es-local' } },
        },
      ],
    });

    const serverMapping = { es: { two_letters_code: 'es-server' } } as never;
    const actual = new TranslationPathResolver(config).resolve(
      Bun.file('resources/en/readme.md'),
      language('es'),
      serverMapping,
    );

    expect(actual).toBe('/resources/es-local/readme.md');
  });

  test('applies translationReplace to resolved translation file name', async () => {
    const basePath = await mkdtemp();
    await Bun.write(`${basePath}/resources/en/readme.md`, 'readme');

    const config = ConfigSchema.parse({
      projectId: 123,
      apiToken: 'a'.repeat(80),
      basePath,
      baseUrl: 'https://api.crowdin.com',
      preserveHierarchy: true,
      files: [
        {
          source: '/resources/en/*.md',
          translation: '/resources/%two_letters_code%/%original_file_name%',
          translation_replace: {
            readme: 'guide',
          },
        },
      ],
    });

    const actual = new TranslationPathResolver(config).resolve(Bun.file('resources/en/readme.md'), language('es'));

    expect(actual).toBe('/resources/es/guide.md');
  });
});

function language(id: string) {
  return {
    id,
    name: id,
    editorCode: id,
    twoLettersCode: id,
    threeLettersCode: `${id}${id}${id}`,
    locale: `${id}-${id.toUpperCase()}`,
    androidCode: id,
    osxCode: id,
    osxLocale: id,
    pluralCategoryNames: ['one'],
    pluralRules: '(n != 1)',
    pluralExamples: ['0'],
    textDirection: 'ltr',
    dialectOf: id,
  } as never;
}

async function mkdtemp(): Promise<string> {
  const basePath = `/tmp/crowdin-translation-path-resolver-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  await Bun.$`mkdir -p ${basePath}/resources/en ${basePath}/resources/emails/en`.quiet();

  return basePath;
}

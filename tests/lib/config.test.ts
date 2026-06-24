import { describe, expect, test } from 'bun:test';
import { ConfigSchema } from '@/lib/config.ts';

function baseConfig(fileOverrides: Record<string, unknown> = {}) {
  return {
    projectId: 123,
    apiToken: 'a'.repeat(80),
    basePath: '.',
    baseUrl: 'https://api.crowdin.com',
    files: [
      {
        source: '/src/*.json',
        translation: '/locale/%two_letters_code%/%original_file_name%',
        ...fileOverrides,
      },
    ],
  };
}

describe('ConfigSchema files[] parity fields', () => {
  test('parses a config with all new file fields set', () => {
    const config = ConfigSchema.parse(
      baseConfig({
        context: '/context/app.txt',
        scheme: 'identifier,source_phrase,context',
        update_option: 'keep_translations_and_approvals',
        escape_quotes: 3,
        escape_special_characters: 1,
        export_quotes: 'double',
        first_line_contains_header: true,
        translate_content: true,
        translate_attributes: false,
        translatable_elements: ['/string'],
        content_segmentation: true,
        custom_segmentation: '/segmentation.srx',
        import_translations: true,
        languages_mapping: { locale: { en: 'en-US' } },
        translation_replace: { '.json': '.po' },
      }),
    );

    expect(config.files[0]).toMatchObject({
      context: '/context/app.txt',
      scheme: 'identifier,source_phrase,context',
      update_option: 'keep_translations_and_approvals',
      escape_quotes: 3,
      escape_special_characters: 1,
      export_quotes: 'double',
      first_line_contains_header: true,
      translate_content: true,
      translate_attributes: false,
      translatable_elements: ['/string'],
      content_segmentation: true,
      custom_segmentation: '/segmentation.srx',
      import_translations: true,
      languages_mapping: { locale: { en: 'en-US' } },
      translation_replace: { '.json': '.po' },
    });
  });

  test('accepts scheme as an object map', () => {
    const config = ConfigSchema.parse(baseConfig({ scheme: { identifier: 0, source_phrase: 1 } }));

    expect(config.files[0]?.scheme).toEqual({ identifier: 0, source_phrase: 1 });
  });

  test('rejects an invalid update_option value', () => {
    expect(() => ConfigSchema.parse(baseConfig({ update_option: 'invalid_option' }))).toThrow();
  });

  test('rejects an out-of-range escape_quotes value', () => {
    expect(() => ConfigSchema.parse(baseConfig({ escape_quotes: 4 }))).toThrow();
  });

  test('rejects an out-of-range escape_special_characters value', () => {
    expect(() => ConfigSchema.parse(baseConfig({ escape_special_characters: 2 }))).toThrow();
  });

  test('defaults preserveHierarchy to false to match the Java CLI', () => {
    const config = ConfigSchema.parse(baseConfig());

    expect(config.preserveHierarchy).toBe(false);
  });

  test('parses ignore patterns', () => {
    const config = ConfigSchema.parse(baseConfig({ ignore: ['**/node_modules/**', 'src/skip.json'] }));

    expect(config.files[0]?.ignore).toEqual(['**/node_modules/**', 'src/skip.json']);
  });

  test('rejects dest without preserve_hierarchy enabled', () => {
    expect(() => ConfigSchema.parse(baseConfig({ dest: '/foo/%original_file_name%' }))).toThrow(
      "The 'dest' parameter only works for single files with the specified 'preserve_hierarchy': true option",
    );
  });

  test('accepts dest when preserve_hierarchy is enabled', () => {
    const config = ConfigSchema.parse({
      ...baseConfig({ dest: '/foo/%original_file_name%' }),
      preserveHierarchy: true,
    });

    expect(config.files[0]?.dest).toBe('/foo/%original_file_name%');
  });

  test('requires a language placeholder when not multilingual', () => {
    expect(() => ConfigSchema.parse(baseConfig({ translation: '/locale/strings.xml' }))).toThrow(
      'should contain at least one language placeholder',
    );
  });

  test('allows a placeholder-free translation when multilingual is true', () => {
    const config = ConfigSchema.parse(baseConfig({ translation: '/locale/strings.xml', multilingual: true }));

    expect(config.files[0]?.multilingual).toBe(true);
  });

  test('parses multilingual_spreadsheet without relaxing the placeholder requirement', () => {
    // multilingual_spreadsheet is accepted for Java parity but does not mark the file as multilingual.
    expect(() =>
      ConfigSchema.parse(baseConfig({ translation: '/locale/strings.xml', multilingual_spreadsheet: true })),
    ).toThrow('should contain at least one language placeholder');

    const config = ConfigSchema.parse(baseConfig({ multilingual_spreadsheet: true }));
    expect(config.files[0]?.multilingual_spreadsheet).toBe(true);
  });
});

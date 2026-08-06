import { describe, expect, test } from 'bun:test';
import { assertFilesConfigured, ConfigSchema } from '@/lib/config.ts';

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

describe('files section optional + guard', () => {
  const credsOnly = { projectId: 123, apiToken: 'a'.repeat(80), baseUrl: 'https://api.crowdin.com' };

  test('credential-only config parses with files defaulting to []', () => {
    expect(ConfigSchema.parse(credsOnly).files).toEqual([]);
  });

  test('assertFilesConfigured throws Java-parity message when files empty', () => {
    expect(() => assertFilesConfigured(ConfigSchema.parse(credsOnly))).toThrow(
      "Required section 'files' is missing (or empty) in the configuration file",
    );
  });

  test('assertFilesConfigured passes when files present', () => {
    expect(() => assertFilesConfigured(ConfigSchema.parse(baseConfig()))).not.toThrow();
  });
});

// Java FileBean.populateWithDefaultValues normalizes the file section at config load, so every
// consumer reads settled values instead of re-deriving them.
describe('ConfigSchema files[] path normalization (Java FileBean parity)', () => {
  const parseFile = (overrides: Record<string, unknown>, configOverrides: Record<string, unknown> = {}) =>
    ConfigSchema.parse({ ...baseConfig(overrides), ...configOverrides }).files[0];

  test('forces a leading slash on translation when it carries a language placeholder', () => {
    expect(parseFile({ translation: 'locale/%two_letters_code%/%original_file_name%' })?.translation).toBe(
      '/locale/%two_letters_code%/%original_file_name%',
    );
  });

  test('keeps an existing leading slash on translation', () => {
    expect(parseFile({ translation: '/locale/%locale%/%original_file_name%' })?.translation).toBe(
      '/locale/%locale%/%original_file_name%',
    );
  });

  // The API rejects an exportPattern that starts with '/' unless it carries a language placeholder,
  // so a multilingual group must not keep one.
  test('strips the leading slash for a multilingual translation with no language placeholder', () => {
    expect(parseFile({ translation: '/out/%original_file_name%', multilingual: true })?.translation).toBe(
      'out/%original_file_name%',
    );
  });

  test('strips the leading slash for a scheme-based translation with no language placeholder', () => {
    expect(
      parseFile({ translation: '/out/%original_file_name%', scheme: 'identifier,source_phrase' })?.translation,
    ).toBe('out/%original_file_name%');
  });

  test('a multilingual group that still has a language placeholder keeps the leading slash', () => {
    expect(parseFile({ translation: 'out/%locale%/%original_file_name%', multilingual: true })?.translation).toBe(
      '/out/%locale%/%original_file_name%',
    );
  });

  test('collapses separator runs in source, translation, ignore and dest', () => {
    const file = parseFile(
      {
        source: '/src//nested///*.json',
        translation: '//locale//%locale%//%original_file_name%',
        ignore: ['/a//b/**'],
        dest: '/out//%original_file_name%',
      },
      { preserveHierarchy: true },
    );

    expect(file?.source).toBe('/src/nested/*.json');
    expect(file?.translation).toBe('/locale/%locale%/%original_file_name%');
    expect(file?.ignore).toEqual(['/a/b/**']);
    expect(file?.dest).toBe('/out/%original_file_name%');
  });

  test('leaves the leading slash of source, ignore and dest as written', () => {
    const hierarchy = { preserveHierarchy: true };
    const withSlash = parseFile(
      { source: '/src/*.json', ignore: ['/skip/**'], dest: '/out/%original_file_name%' },
      hierarchy,
    );
    const without = parseFile(
      { source: 'src/*.json', ignore: ['skip/**'], dest: 'out/%original_file_name%' },
      hierarchy,
    );

    expect(withSlash?.source).toBe('/src/*.json');
    expect(without?.source).toBe('src/*.json');
    expect(withSlash?.ignore).toEqual(['/skip/**']);
    expect(without?.ignore).toEqual(['skip/**']);
    expect(withSlash?.dest).toBe('/out/%original_file_name%');
    expect(without?.dest).toBe('out/%original_file_name%');
  });
});

describe('ConfigSchema files[] parity fields', () => {
  test('parses a config with all new file fields set', () => {
    const config = ConfigSchema.parse(
      baseConfig({
        context: '/context/app.txt',
        scheme: 'identifier,source_phrase,context',
        update_option: 'update_without_changes',
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

  test('maps documented Java update_option values to the API enum', () => {
    expect(ConfigSchema.parse(baseConfig({ update_option: 'update_as_unapproved' })).files[0]?.update_option).toBe(
      'keep_translations',
    );
    expect(ConfigSchema.parse(baseConfig({ update_option: 'update_without_changes' })).files[0]?.update_option).toBe(
      'keep_translations_and_approvals',
    );
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

  test('rejects a constant dest when source matches more than one file', () => {
    expect(() => ConfigSchema.parse({ ...baseConfig({ dest: '/foo/strings.json' }), preserveHierarchy: true })).toThrow(
      "The 'dest' parameter only works for single files specified in the 'source' parameter",
    );
  });

  test.each([
    '/foo/%file_name%.json',
    '/foo/**/strings.json',
  ])('accepts a per-file dest for a patterned source: %p', (dest) => {
    const config = ConfigSchema.parse({ ...baseConfig({ dest }), preserveHierarchy: true });

    expect(config.files[0]?.dest).toBe(dest);
  });

  test('accepts a constant dest when source names a single file', () => {
    const config = ConfigSchema.parse({
      ...baseConfig({ source: '/src/app.json', dest: '/foo/strings.json' }),
      preserveHierarchy: true,
    });

    expect(config.files[0]?.dest).toBe('/foo/strings.json');
  });

  // Java validates both of these at config load (FileBean.checkProperties), so they are validation
  // errors rather than runtime failures raised later from path resolution.
  test('rejects ** in translation when source has none', () => {
    expect(() =>
      ConfigSchema.parse(baseConfig({ source: '/src/*.json', translation: '/l/**/%locale%/%original_file_name%' })),
    ).toThrow("The mask '**' can be used in the 'translation' pattern only if it's used in the 'source' pattern");
  });

  test('accepts ** in translation when source has it too', () => {
    const config = ConfigSchema.parse(
      baseConfig({ source: '/src/**/*.json', translation: '/l/**/%locale%/%original_file_name%' }),
    );

    expect(config.files[0]?.translation).toBe('/l/**/%locale%/%original_file_name%');
  });

  test.each([
    '/l/../%locale%/%original_file_name%',
    '/l/./%locale%/%original_file_name%',
  ])('rejects a relative path in translation: %p', (translation) => {
    expect(() => ConfigSchema.parse(baseConfig({ translation }))).toThrow("can't contain any relative paths");
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

describe('ConfigSchema boolean coercion (Java setBooleanPropertyIfExists parity)', () => {
  test('coerces 0/1 (and string forms) to booleans', () => {
    const config = ConfigSchema.parse({
      ...baseConfig({ content_segmentation: 1, import_translations: 0 }),
      preserveHierarchy: 1,
      ignoreHiddenFiles: '0',
    });

    expect(config.preserveHierarchy).toBe(true);
    expect(config.ignoreHiddenFiles).toBe(false);
    expect(config.files[0]?.content_segmentation).toBe(true);
    expect(config.files[0]?.import_translations).toBe(false);
  });

  test('still rejects a non-boolean-ish value', () => {
    expect(() => ConfigSchema.parse({ ...baseConfig(), preserveHierarchy: 'yes' })).toThrow();
  });
});

describe('ConfigSchema base_url (Java isUrlValid / normalization parity)', () => {
  const withBaseUrl = (baseUrl: string) => ({ ...baseConfig(), baseUrl });
  const parseBaseUrl = (baseUrl: string) => ConfigSchema.parse(withBaseUrl(baseUrl)).baseUrl;

  test('defaults to https://api.crowdin.com when omitted', () => {
    const { baseUrl: _omit, ...noBaseUrl } = withBaseUrl('');
    expect(ConfigSchema.parse(noBaseUrl).baseUrl).toBe('https://api.crowdin.com');
  });

  test.each([
    'https://api.crowdin.com',
    'https://crowdin.com',
    'https://acme.crowdin.com',
    'https://acme.api.crowdin.com',
    'https://org.crowdin.dev',
    'https://org.env.crowdin.dev',
    'https://foo.test.crowdin.com',
    'https://foo.e-test.crowdin.com',
  ])('accepts %s', (url) => {
    expect(parseBaseUrl(url)).toBe(url);
  });

  test.each([
    ['https://acme.crowdin.com/api/v2', 'https://acme.crowdin.com'],
    ['https://api.crowdin.com/api', 'https://api.crowdin.com'],
    ['https://acme.crowdin.com/', 'https://acme.crowdin.com'],
  ])('normalizes %s -> %s', (input, expected) => {
    expect(parseBaseUrl(input)).toBe(expected);
  });

  test.each([
    'https://evil.example.com',
    'https://evilcrowdin.com', // no dot before crowdin.com
    'http://api.crowdin.com', // http rejected (Java requires https)
    'https://acme.crowdin.com/api/v3', // unknown suffix not normalized away
  ])('rejects %s', (url) => {
    expect(() => parseBaseUrl(url)).toThrow();
  });
});

// a present-but-short --token must not be rejected as an invalid config file. Java never
// length-checks the token (only rejects empty), letting the API return 401 for a bad one.
describe('ConfigSchema apiToken', () => {
  const parse = (apiToken: unknown) => ConfigSchema.safeParse({ projectId: 123, apiToken });

  test('accepts a short token (validity is the API job, not the config)', () => {
    expect(parse('SHORTTOKEN_1234567').success).toBe(true);
  });

  test('accepts an omitted token', () => {
    expect(ConfigSchema.safeParse({ projectId: 123 }).success).toBe(true);
  });

  test('rejects an empty token, matching Java missed_api_token', () => {
    const result = parse('');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Required option 'api_token' is missing");
  });
});

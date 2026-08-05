import { describe, expect, test } from 'bun:test';
import { SourceFilesModel } from '@crowdin/crowdin-api-client';
import { type Config, ConfigSchema } from '@/lib/config.ts';
import {
  buildExportOptions,
  buildImportOptions,
  getCommonPath,
  prepareDest,
  resolveContextPath,
} from '@/lib/upload/fileOptions.ts';

function fileConfig(overrides: Record<string, unknown> = {}) {
  const config = ConfigSchema.parse({
    projectId: 123,
    apiToken: 'a'.repeat(80),
    basePath: '.',
    baseUrl: 'https://api.crowdin.com',
    files: [
      {
        source: '/src/*.json',
        translation: '/locale/%two_letters_code%/%original_file_name%',
        ...overrides,
      },
    ],
  });

  return config.files[0] as Config['files'][number];
}

describe('buildExportOptions', () => {
  test('builds PropertyExportOptions with escapeQuotes/escapeSpecialCharacters for .properties files', () => {
    const options = buildExportOptions(
      'src/app.properties',
      fileConfig({ escape_quotes: 3, escape_special_characters: 0 }),
      '/locale/%two_letters_code%/app.properties',
    );

    expect(options).toEqual({
      exportPattern: '/locale/%two_letters_code%/app.properties',
      escapeQuotes: 3,
      escapeSpecialCharacters: 0,
    });
  });

  test('defaults escapeSpecialCharacters to 1 for .properties files when not configured', () => {
    const options = buildExportOptions('src/app.properties', fileConfig(), '/locale/%two_letters_code%/app.properties');

    expect(options).toEqual({
      exportPattern: '/locale/%two_letters_code%/app.properties',
      escapeQuotes: undefined,
      escapeSpecialCharacters: 1,
    });
  });

  test('builds JavaScriptExportOptions with exportQuotes for .js files', () => {
    const options = buildExportOptions(
      'src/app.js',
      fileConfig({ export_quotes: 'double' }),
      '/locale/%two_letters_code%/app.js',
    );

    expect(options).toEqual({
      exportPattern: '/locale/%two_letters_code%/app.js',
      exportQuotes: SourceFilesModel.ExportQuotes.DOUBLE,
    });
  });

  test('builds GeneralExportOptions for other file types', () => {
    const options = buildExportOptions('src/app.json', fileConfig(), '/locale/%two_letters_code%/app.json');

    expect(options).toEqual({ exportPattern: '/locale/%two_letters_code%/app.json' });
  });
});

describe('buildImportOptions', () => {
  test('builds SpreadsheetImportOptions with scheme and firstLineContainsHeader for .csv files', () => {
    const options = buildImportOptions(
      'src/app.csv',
      fileConfig({
        first_line_contains_header: true,
        scheme: 'identifier,source_phrase,context',
        import_translations: true,
      }),
    );

    expect(options).toEqual({
      firstLineContainsHeader: true,
      scheme: { identifier: 0, source_phrase: 1, context: 2 } as unknown as SourceFilesModel.Scheme,
      importTranslations: true,
    });
  });

  test('accepts scheme already given as an object map', () => {
    const options = buildImportOptions('src/app.csv', fileConfig({ scheme: { identifier: 0, source_phrase: 1 } }));

    expect(options).toEqual({ scheme: { identifier: 0, source_phrase: 1 } as unknown as SourceFilesModel.Scheme });
  });

  test('builds XmlImportOptions with translateContent/translateAttributes/contentSegmentation for .xml files', () => {
    const options = buildImportOptions(
      'src/app.xml',
      fileConfig({
        translate_content: true,
        translate_attributes: false,
        content_segmentation: true,
        translatable_elements: ['/string'],
      }),
      42,
    );

    expect(options).toEqual({
      translateContent: true,
      translateAttributes: false,
      contentSegmentation: true,
      translatableElements: ['/string'],
      srxStorageId: 42,
    });
  });

  test('builds OtherImportOptions with contentSegmentation and srxStorageId for other file types', () => {
    const options = buildImportOptions('src/app.json', fileConfig({ content_segmentation: true }), 42);

    expect(options).toEqual({ contentSegmentation: true, srxStorageId: 42 });
  });

  test('returns undefined when no relevant options are configured', () => {
    expect(buildImportOptions('src/app.json', fileConfig())).toBeUndefined();
  });
});

describe('%original_path%', () => {
  test('prepareDest resolves it to the parent directory', () => {
    expect(prepareDest('/out/%original_path%/%original_file_name%', 'src/nested/app.json')).toBe(
      'out/src/nested/app.json',
    );
  });

  test('prepareDest collapses the separator for a top-level source file', () => {
    expect(prepareDest('/out/%original_path%/%original_file_name%', 'app.json')).toBe('out/app.json');
  });

  test('resolveContextPath resolves it to the parent directory', () => {
    expect(resolveContextPath('context/%original_path%.md', 'src/nested/app.json')).toBe('context/src/nested.md');
  });
});

describe('getCommonPath', () => {
  test('returns the shared parent directory with a trailing slash', () => {
    expect(getCommonPath(['src/foo/a.json', 'src/foo/b.json'])).toBe('src/foo/');
  });

  test('trims back to the last separator when files diverge inside a directory', () => {
    expect(getCommonPath(['src/foo/a.json', 'src/bar/b.json'])).toBe('src/');
  });

  test('does not strip a partial directory-name match', () => {
    // Raw string prefix is "src/foo", but it must trim to "src/" so "foobar" is not cut mid-name.
    expect(getCommonPath(['src/foo/a.json', 'src/foobar/b.json'])).toBe('src/');
  });

  test('returns the directory of a single file', () => {
    expect(getCommonPath(['src/foo/a.json'])).toBe('src/foo/');
  });

  test('returns empty string for top-level files with no shared directory', () => {
    expect(getCommonPath(['a.json', 'b.json'])).toBe('');
  });

  test('returns empty string for no files', () => {
    expect(getCommonPath([])).toBe('');
  });
});

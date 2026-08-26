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

// Java PlaceholderUtil.replaceFileDependentPlaceholders:234-249 expands `**` in dest/context from
// the source file's parent path. Distinct from replaceDoubleAsterisk, which serves `translation`.
describe('** in dest and context', () => {
  test('expands to the full parent path when the prefix is unrelated to it', () => {
    expect(prepareDest('/out/**/%original_file_name%', 'src/nested/deep/app.json')).toBe(
      'out/src/nested/deep/app.json',
    );
  });

  test('trims the pattern prefix off the parent path when it matches', () => {
    expect(prepareDest('/src/**/%original_file_name%', 'src/nested/deep/app.json')).toBe('src/nested/deep/app.json');
  });

  test('keeps a directory that follows the wildcard', () => {
    expect(prepareDest('/out/**/sub/%original_file_name%', 'src/nested/deep/app.json')).toBe(
      'out/src/nested/deep/sub/app.json',
    );
  });

  test('collapses to nothing for a source file in the project root', () => {
    expect(prepareDest('/out/**/%original_file_name%', 'app.json')).toBe('out/app.json');
  });

  test('expands in a context pattern too', () => {
    expect(resolveContextPath('ctx/**/%file_name%.md', 'src/nested/deep/app.json')).toBe('ctx/src/nested/deep/app.md');
  });

  test('leaves a pattern without the wildcard untouched', () => {
    expect(prepareDest('/out/%original_file_name%', 'src/nested/app.json')).toBe('out/app.json');
  });

  // Java's String.replace(CharSequence, CharSequence) substitutes every occurrence. Replacing only
  // the first left a literal `**` in the project path — the very bug this expansion exists to avoid.
  test('substitutes every wildcard in the pattern, not just the first', () => {
    expect(prepareDest('/out/**/mid/**/%original_file_name%', 'src/nested/deep/app.json')).toBe(
      'out/src/nested/deep/mid/src/nested/deep/app.json',
    );
  });

  // The tail after `**` appears mid-path, so Java re-extends it to cover the whole remainder.
  test('extends the tail when it appears midway through the file path', () => {
    expect(prepareDest('/out/**/nested/%original_file_name%', 'src/nested/deep/nested/app.json')).toBe(
      'out/src/nested/deep/nested/app.json',
    );
  });

  // postfix is '/deep/', and the parent path ends with it, so it is trimmed off the expansion.
  test('trims the postfix off the expansion when the parent path ends with it', () => {
    expect(prepareDest('/out/**/deep/%original_file_name%', 'src/nested/deep/app.json')).toBe(
      'out/src/nested/deep/app.json',
    );
  });

  // The prefix occurs mid-parent, so everything before it is dropped from the expansion.
  test('drops the part of the parent path before a mid-path prefix', () => {
    expect(prepareDest('/nested/**/%original_file_name%', 'src/nested/deep/app.json')).toBe('nested/deep/app.json');
  });

  // `Product.Core` is a string prefix of `Product.Core.Implementation` but not a path segment of
  // it, so nothing may be trimmed off the parent path.
  test('keeps a folder whose name merely starts with the dest prefix', () => {
    expect(
      prepareDest(
        '/Product.Core/**/%file_name%.resx',
        'Product.Core.Implementation/Localization/UniversalStrings.resx',
      ),
    ).toBe('Product.Core/Product.Core.Implementation/Localization/UniversalStrings.resx');
  });

  test('keeps a folder whose name merely starts with the last segment of a multi-segment prefix', () => {
    expect(prepareDest('/a/b/**/%original_file_name%', 'a/bc/deep/app.json')).toBe('a/b/a/bc/deep/app.json');
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

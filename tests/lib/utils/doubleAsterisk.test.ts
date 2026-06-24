import { describe, expect, test } from 'bun:test';
import { replaceDoubleAsterisk } from '@/lib/utils/doubleAsterisk.ts';

describe('replaceDoubleAsterisk', () => {
  // Ported verbatim from Java TranslationsUtilsTest.testReplaceDoubleAsterisk.
  const cases: [source: string, translation: string, sourceFile: string, expected: string][] = [
    [
      '/folder/**/*.txt',
      '/f/**/%original_file_name%',
      'folder/folder2/folder3/file.txt',
      '/f/folder2/folder3/%original_file_name%',
    ],
    [
      '/folder/folder2/**/*.txt',
      '/f/**/%original_file_name%',
      'folder/folder2/folder3/file.txt',
      '/f/folder3/%original_file_name%',
    ],
    ['/f1/**/*.*', '/%locale%/%original_file_name%', 'f1/android.xml', '/%locale%/%original_file_name%'],
    [
      '/folder1/folder2/**/messages.properties',
      '/folder1/folder2/**/%file_name%_%two_letters_code%.properties',
      '/folder_on_crowdin/folder1/folder2/folder3/folder4/messages.properties',
      '/folder1/folder2/folder3/folder4/%file_name%_%two_letters_code%.properties',
    ],
    [
      '/home/daanya/Documents/**/*.txt',
      '/**/%locale%/%original_file_name%',
      '/home/daanya/Documents/here/and/there/file.txt',
      '/here/and/there/%locale%/%original_file_name%',
    ],
    [
      '/folder/**/*.txt',
      '/**/%locale%/%original_file_name%',
      'folder/folder2/file.txt',
      '/folder2/%locale%/%original_file_name%',
    ],
    [
      '/en/**/*.po',
      '/%two_letters_code%/**/%original_file_name%',
      'en/here/file.po',
      '/%two_letters_code%/here/%original_file_name%',
    ],
    [
      '/en/**/folder/*.po',
      '/%two_letters_code%/**/%original_file_name%',
      'en/folder/file.po',
      '/%two_letters_code%/%original_file_name%',
    ],
    [
      '/en/**/folder/*.po',
      '/%two_letters_code%/**/folder/%original_file_name%',
      'en/here/folder/file.po',
      '/%two_letters_code%/here/folder/%original_file_name%',
    ],
    [
      '/*/**/*.po',
      '/%two_letters_code%/**/%original_file_name%',
      'hmm/here/file.po',
      '/%two_letters_code%/hmm/here/%original_file_name%',
    ],
    [
      '/english/**/*.yml',
      '/%language%/**/%file_name%_l_%language%.%file_extension%',
      'english/folder/messages_l_english.yml',
      '/%language%/folder/%file_name%_l_%language%.%file_extension%',
    ],
  ];

  test.each(cases)('source %p translation %p file %p', (source, translation, sourceFile, expected) => {
    expect(replaceDoubleAsterisk(source, translation, sourceFile)).toBe(expected);
  });

  test('returns the translation unchanged when it has no double asterisk', () => {
    expect(
      replaceDoubleAsterisk('/src/*.json', '/locale/%two_letters_code%/%original_file_name%', 'src/app.json'),
    ).toBe('/locale/%two_letters_code%/%original_file_name%');
  });

  test('throws when the translation or source file is empty', () => {
    expect(() => replaceDoubleAsterisk('*', '', 'first.po')).toThrow();
    expect(() => replaceDoubleAsterisk('*', '/**/%locale%', '')).toThrow();
  });

  test('throws when translation has ** but source does not', () => {
    expect(() => replaceDoubleAsterisk('*', '**/%locale%', 'first.po')).toThrow(
      "The mask '**' can be used in the 'translation' pattern only if it's used in the 'source' pattern",
    );
  });
});

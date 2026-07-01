import { describe, expect, test } from 'bun:test';
import InvalidConfigurationError from '@/lib/config/errors/InvalidConfigurationError.ts';
import { loadFromString } from '@/lib/config/yamlLoader.ts';
import { ConfigSchema } from '@/lib/config.ts';

describe('config loader', () => {
  test('loads config', async () => {
    const string = `#
# Basic Crowdin CLI configuration
# See https://crowdin.github.io/crowdin-cli/configuration for more information
# See https://support.crowdin.com/developer/configuration-file/ for all available options
#

#
# Your Crowdin credentials
#
"project_id": "750373"
"api_token": "${'a'.repeat(80)}"
"base_path": "."
"base_url": "https://api.crowdin.com"

#
# Defines whether to preserve the original directory structure in the Crowdin project
# Recommended to set to true
#
"preserve_hierarchy": true

#
# Files configuration.
# See https://support.crowdin.com/developer/configuration-file/ for all available options
#
files: [
  {
    #
    # Source files filter
    # e.g. "/resources/en/*.json"
    #
    "source": "/resources/en/*.csv",

    #
    # Translation files filter
    # e.g. "/resources/%two_letters_code%/%original_file_name%"
    #
    "translation": "/resources/%locale%/%original_file_name%",
  }
]`;

    const expected = ConfigSchema.parse({
      projectId: 750373,
      apiToken: 'a'.repeat(80),
      basePath: '.',
      baseUrl: 'https://api.crowdin.com',
      preserveHierarchy: true,
      files: [
        {
          source: '/resources/en/*.csv',
          translation: '/resources/%locale%/%original_file_name%',
        },
      ],
    });

    const config = loadFromString(string);

    expect(config).toEqual(expected);
  });

  test('loads export_languages and pseudo_localization', async () => {
    const string = `"project_id": "750373"
"api_token": "${'a'.repeat(80)}"
"base_path": "."
"base_url": "https://api.crowdin.com"
"preserve_hierarchy": true
"export_languages": ["fr", "es"]
"pseudo_localization":
  "length_correction": 10
  "prefix": "["
  "suffix": "]"
  "character_transformation": "cyrillic"
files: [
  {
    "source": "/resources/en/*.csv",
    "translation": "/resources/%locale%/%original_file_name%",
  }
]`;

    const config = loadFromString(string);

    expect(config.exportLanguages).toEqual(['fr', 'es']);
    expect(config.pseudoLocalization).toEqual({
      length_correction: 10,
      prefix: '[',
      suffix: ']',
      character_transformation: 'cyrillic',
    });
  });

  test('rejects pseudo_localization length_correction out of bounds', async () => {
    const string = `"project_id": "750373"
"api_token": "${'a'.repeat(80)}"
"base_path": "."
"base_url": "https://api.crowdin.com"
"preserve_hierarchy": true
"pseudo_localization":
  "length_correction": 200
files: [
  {
    "source": "/resources/en/*.csv",
    "translation": "/resources/%locale%/%original_file_name%",
  }
]`;

    expect(() => loadFromString(string)).toThrow();
  });

  test('rejects a file that sets both skip_untranslated_strings and skip_untranslated_files', async () => {
    const string = `"project_id": "750373"
"api_token": "${'a'.repeat(80)}"
"base_path": "."
"base_url": "https://api.crowdin.com"
"preserve_hierarchy": true
files: [
  {
    "source": "/resources/en/*.csv",
    "translation": "/resources/%locale%/%original_file_name%",
    "skip_untranslated_strings": true,
    "skip_untranslated_files": true,
  }
]`;

    expect(() => loadFromString(string)).toThrow(
      'You cannot skip strings and files at the same time. Please use one of these parameters instead.',
    );
  });

  test('wraps malformed YAML syntax as an InvalidConfigurationError', () => {
    // Unterminated flow sequence -> the YAML parser throws; the loader must surface exit-2 instead.
    expect(() => loadFromString('files: [ { source: "a"')).toThrow(InvalidConfigurationError);
  });

  test('rejects an empty config as an InvalidConfigurationError', () => {
    expect(() => loadFromString('')).toThrow(InvalidConfigurationError);
  });
});

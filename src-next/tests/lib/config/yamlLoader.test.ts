import { describe, expect, test } from 'bun:test';
import { loadFromString } from '../../../src/lib/config/yamlLoader.ts';
import { ConfigSchema } from '../../../src/lib/config.ts';

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
});

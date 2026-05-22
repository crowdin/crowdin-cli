import type { Config } from '../config.ts';

export function generate(config: Config): string {
  return `#
# Basic Crowdin CLI configuration
# See https://crowdin.github.io/crowdin-cli/configuration for more information
# See https://support.crowdin.com/developer/configuration-file/ for all available options
#

#
# Your Crowdin credentials
#
"project_id": "${config.projectId}"
"api_token": "${config.apiToken}"
"base_path": "${config.basePath}"
"base_url": "${config.baseUrl}"

#
# Defines whether to preserve the original directory structure in the Crowdin project
# Recommended to set to true
#
"preserve_hierarchy": ${config.preserveHierarchy}

${generateFilesSection(config.files)}`;
}

function generateFilesSection(files: Config['files']) {
  return `#
# Files configuration.
# See https://support.crowdin.com/developer/configuration-file/ for all available options
#
"files": [
  ${files.map((file) => {
    return `{
    #
    # Source files filter
    # e.g. "/resources/en/*.json"
    #
    "source": "${file.source}",

    #
    # Translation files filter
    # e.g. "/resources/%two_letters_code%/%original_file_name%"
    #
    "translation": "${file.translation}",
  }`;
  })}
]`;
}

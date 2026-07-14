// generate() only stringifies these fields, so it takes a minimal input rather
// than the full zod Config — lets `init --quiet` pass an empty project id.
export interface GenerateInput {
  projectId: string | number;
  apiToken?: string;
  basePath: string;
  baseUrl: string;
  preserveHierarchy: boolean;
  ignoreHiddenFiles?: boolean;
  files: { source: string; translation: string }[];
}

export function generate(config: GenerateInput): string {
  const credentialLines = [`"project_id": "${config.projectId}"`];

  if (config.apiToken !== undefined) {
    credentialLines.push(`"api_token": "${config.apiToken}"`);
  }

  credentialLines.push(`"base_path": "${config.basePath}"`, `"base_url": "${config.baseUrl}"`);

  return `#
# Basic Crowdin CLI configuration
# See https://crowdin.github.io/crowdin-cli/configuration for more information
# See https://support.crowdin.com/developer/configuration-file/ for all available options
#

#
# Your Crowdin credentials
#
${credentialLines.join('\n')}

#
# Defines whether to preserve the original directory structure in the Crowdin project
# Recommended to set to true
#
"preserve_hierarchy": ${config.preserveHierarchy}

${generateFilesSection(config.files)}`;
}

function generateFilesSection(files: GenerateInput['files']) {
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

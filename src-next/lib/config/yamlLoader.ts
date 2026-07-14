import YAML from 'yaml';
import FileNotFoundError from '../common/errors/FileNotFoundError.ts';
import InvalidConfigurationError from './errors/InvalidConfigurationError.ts';

// Reads and YAML-parses a config file to a raw record, without validation or env resolution.
// The full resolution pipeline (mapping, env, all sources, validation) lives in cli/config.ts,
// so validation happens once, after everything is merged (mirrors Java build()).
export async function loadRawFromFile(filePath: string): Promise<Record<string, unknown>> {
  if (!(await Bun.file(filePath).exists())) {
    throw new FileNotFoundError(`File ${filePath} does not exist`);
  }

  return parseYaml(await Bun.file(filePath).text());
}

export function parseYaml(string: string): Record<string, unknown> {
  let config: unknown;

  try {
    config = YAML.parse(string);
  } catch (error) {
    // Java surfaces a broken config file as a validation failure (exit 2); mirror that
    // instead of leaking the raw YAML parser error.
    throw new InvalidConfigurationError('Configuration file has invalid YAML syntax.', { cause: error });
  }

  if (config === null || typeof config !== 'object') {
    throw new InvalidConfigurationError('Configuration file is empty or malformed.');
  }

  return config as Record<string, unknown>;
}

// Maps a raw YAML config record's literal keys to ConfigSchema input (snake_case -> camelCase).
// Env-variable resolution is a separate pipeline layer (see cli/config.ts), not here.
export function mapConfig(raw: Record<string, unknown>): Record<string, unknown> {
  // Java nests ignore_hidden_files under a `settings:` map (SettingsBean).
  const settings = (raw.settings ?? {}) as Record<string, unknown>;

  return {
    projectId: raw.project_id,
    apiToken: raw.api_token,
    basePath: raw.base_path,
    baseUrl: raw.base_url,
    preserveHierarchy: raw.preserve_hierarchy,
    ignoreHiddenFiles: settings.ignore_hidden_files,
    exportLanguages: raw.export_languages,
    pseudoLocalization: raw.pseudo_localization,
    files: raw.files,
  };
}

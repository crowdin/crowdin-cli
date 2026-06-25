import YAML from 'yaml';
import { z } from 'zod';
import FileNotFoundError from '../common/errors/FileNotFoundError.ts';
import { type Config, ConfigSchema } from '../config.ts';
import InvalidConfigurationError from './errors/InvalidConfigurationError.ts';

export async function loadFromFile(filePath: string): Promise<Config> {
  if (!(await Bun.file(filePath).exists())) {
    throw new FileNotFoundError(`File ${filePath} does not exist`);
  }

  return loadFromString(await Bun.file(filePath).text());
}

export function loadFromString(string: string): Config {
  const config = YAML.parse(string);

  const parsed = ConfigSchema.safeParse({
    projectId: config.project_id,
    apiToken: config.api_token ?? undefined,
    basePath: config.base_path,
    baseUrl: config.base_url,
    preserveHierarchy: config.preserve_hierarchy,
    ignoreHiddenFiles: config.ignore_hidden_files,
    exportLanguages: config.export_languages,
    pseudoLocalization: config.pseudo_localization,
    files: config.files,
  });

  // Java throws ValidationException (exit 2) for an invalid config; surface zod errors as the same.
  if (!parsed.success) {
    throw new InvalidConfigurationError(z.prettifyError(parsed.error), { cause: parsed.error });
  }

  return parsed.data;
}

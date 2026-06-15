import YAML from 'yaml';
import FileNotFoundError from '../common/errors/FileNotFoundError.ts';
import { type Config, ConfigSchema } from '../config.ts';

export async function loadFromFile(filePath: string): Promise<Config> {
  if (!(await Bun.file(filePath).exists())) {
    throw new FileNotFoundError(`File ${filePath} does not exist`);
  }

  return loadFromString(await Bun.file(filePath).text());
}

export function loadFromString(string: string): Config {
  const config = YAML.parse(string);

  return ConfigSchema.parse({
    projectId: config.project_id,
    apiToken: config.api_token ?? undefined,
    basePath: config.base_path,
    baseUrl: config.base_url,
    preserveHierarchy: config.preserve_hierarchy,
    ignoreHiddenFiles: config.ignore_hidden_files,
    files: config.files,
  });
}

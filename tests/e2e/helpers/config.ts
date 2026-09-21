import { join } from 'node:path';

export interface ConfigValues {
  projectId: number | string;
  token: string;
  baseUrl: string;
  [placeholder: string]: unknown;
}

/**
 * Render a `crowdin.yml` template by replacing each `{{name}}` with `values[name]`. Strings go in
 * as-is; anything else is JSON-encoded, so an array lands as a YAML flow sequence.
 */
export function renderConfig(template: string, values: ConfigValues): string {
  return template.replace(/\{\{(\w+)}}/g, (_match, key: string) => {
    if (!(key in values)) {
      throw new Error(`No value provided for placeholder {{${key}}} in crowdin.yml template`);
    }

    const value = values[key];
    return typeof value === 'string' ? value : JSON.stringify(value);
  });
}

export async function writeConfig(workspace: string, template: string, values: ConfigValues): Promise<string> {
  const configPath = join(workspace, 'crowdin.yml');

  await Bun.write(configPath, renderConfig(template, values));

  return configPath;
}

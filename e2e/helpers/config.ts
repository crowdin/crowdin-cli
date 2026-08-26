import { join } from 'node:path';

export interface ConfigValues {
  projectId: number | string;
  token: string;
}

/**
 * Render a `crowdin.yml` template by replacing `{{projectId}}` and `{{token}}`.
 */
export function renderConfig(template: string, values: ConfigValues): string {
  const resolved: Record<string, string> = {
    projectId: String(values.projectId),
    token: values.token,
  };

  const rendered = template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    if (!(key in resolved)) {
      throw new Error(`No value provided for placeholder {{${key}}} in crowdin.yml template`);
    }

    return resolved[key] as string;
  });

  return rendered;
}

export async function writeConfig(workspace: string, template: string, values: ConfigValues): Promise<string> {
  const configPath = join(workspace, 'crowdin.yml');

  await Bun.write(configPath, renderConfig(template, values));

  return configPath;
}

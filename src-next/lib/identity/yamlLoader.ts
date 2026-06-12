import YAML from 'yaml';
import { type Identity, IdentitySchema } from '@/lib/identity.ts';

export async function loadFromFile(filePath: string): Promise<Identity> {
  const raw = YAML.parse(await Bun.file(filePath).text());

  return IdentitySchema.parse({
    projectId: raw.project_id,
    apiToken: raw.api_token,
    basePath: raw.base_path,
    baseUrl: raw.base_url,
  });
}

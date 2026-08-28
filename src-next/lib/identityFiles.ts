import os from 'node:os';
import path from 'node:path';
import { dump as dumpYaml, load as loadYaml } from 'js-yaml';

const ALT_IDENTITY_FILE = '.crowdin.yaml';

// Default identity files in the home directory, matching Java's BaseCli.DEFAULT_IDENTITY_FILES.
// Used as the fallback credentials source when --identity is not passed, and as the target that
// `crowdin init` writes the shared API token to.
export const DEFAULT_IDENTITY_FILE = '.crowdin.yml';
export const IDENTITY_FILE_NAMES = [DEFAULT_IDENTITY_FILE, ALT_IDENTITY_FILE];

export function getIdentityFilePath(fileName: string): string {
  return path.join(os.homedir(), fileName);
}

// Merges credentials into the default identity file, keeping whatever else it already holds.
// Used by `init` (token only) and `login` (token, plus base_url when the account is Enterprise).
// Returns false when the file can't be written — the caller falls back to the config file.
export async function saveCredentials({ apiToken, baseUrl }: { apiToken: string; baseUrl?: string }): Promise<boolean> {
  const identityFilePath = getIdentityFilePath(DEFAULT_IDENTITY_FILE);

  try {
    let existing: Record<string, unknown> = {};

    if (await Bun.file(identityFilePath).exists()) {
      existing = (loadYaml(await Bun.file(identityFilePath).text()) as Record<string, unknown>) ?? {};
    }

    existing.api_token = apiToken;

    if (baseUrl) {
      existing.base_url = baseUrl;
    }

    await Bun.write(identityFilePath, dumpYaml(existing));

    return true;
  } catch {
    return false;
  }
}

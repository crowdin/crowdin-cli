import os from 'node:os';
import path from 'node:path';

// Default identity files in the home directory, matching Java's BaseCli.DEFAULT_IDENTITY_FILES.
// Used as the fallback credentials source when --identity is not passed, and as the target that
// `crowdin init` writes the shared API token to.
export const DEFAULT_IDENTITY_FILE = '.crowdin.yml';
export const ALT_IDENTITY_FILE = '.crowdin.yaml';
export const IDENTITY_FILE_NAMES = [DEFAULT_IDENTITY_FILE, ALT_IDENTITY_FILE];

export function getIdentityFilePath(fileName: string): string {
  return path.join(os.homedir(), fileName);
}

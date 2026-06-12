import os from 'node:os';
import path from 'node:path';

export const DEFAULT_FILE_NAME = '.crowdin.yml';
export const ALT_FILE_NAME = '.crowdin.yaml';
export const FILE_NAMES = [DEFAULT_FILE_NAME, ALT_FILE_NAME];

export function getApiTokenFilePathFor(fileName: string): string {
  return path.join(os.homedir(), fileName);
}

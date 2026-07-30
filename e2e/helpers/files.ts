import { expect } from 'bun:test';
import { join } from 'node:path';

/**
 * Assert that every given path (relative to `workspace`) exists. Reports all
 * missing paths at once instead of failing on the first.
 */
export async function expectFilesExist(workspace: string, ...relativePaths: string[]): Promise<void> {
  const missing: string[] = [];

  for (const relativePath of relativePaths) {
    if (!(await Bun.file(join(workspace, relativePath)).exists())) {
      missing.push(relativePath);
    }
  }

  expect(missing).toEqual([]);
}

/**
 * Read back content a suite captured earlier (keyed by relative path), for comparing a re-downloaded
 * file against what was uploaded. Throws when the key was never recorded, so a typo'd key or a
 * capture step that silently didn't run fails the test instead of comparing against `undefined`.
 */
export function capturedContent(captured: Map<string, string>, key: string): string {
  const content = captured.get(key);

  if (content === undefined) {
    throw new Error(`No content was captured for '${key}'`);
  }

  return content;
}

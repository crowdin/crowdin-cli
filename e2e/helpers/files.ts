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

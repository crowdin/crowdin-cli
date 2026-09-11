import { expect } from 'bun:test';
import { rm } from 'node:fs/promises';
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
 * Record the content of every given path and delete it. Most suites' `translation` patterns resolve
 * to paths their upload fixtures already occupy, so a download that silently writes nothing would
 * still leave those files on disk and pass an existence check - and comparing a file against content
 * read from that same file would trivially pass too. Clearing first makes the download prove itself.
 *
 * Pair with `expectRestored`.
 */
export async function captureAndClear(workspace: string, ...relativePaths: string[]): Promise<Map<string, string>> {
  const captured = new Map<string, string>();

  for (const relativePath of relativePaths) {
    captured.set(relativePath, await Bun.file(join(workspace, relativePath)).text());
    await rm(join(workspace, relativePath), { force: true });
  }

  return captured;
}

/** Assert a download recreated every path `captureAndClear` cleared, with the content it had. */
export async function expectRestored(workspace: string, captured: Map<string, string>): Promise<void> {
  await expectFilesExist(workspace, ...captured.keys());

  for (const [relativePath, content] of captured) {
    expect(await Bun.file(join(workspace, relativePath)).text()).toBe(content);
  }
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

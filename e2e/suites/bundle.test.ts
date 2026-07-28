import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

describe('bundle', () => {
  let ctx: SuiteContext;
  let bundleId: string;

  beforeAll(async () => {
    ctx = await setupSuite('bundle', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources for the bundle', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sample.json'");
    expect(result.stdout).toContain("File 'sample.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('adds a bundle', async () => {
    const result = await ctx.runner.run([
      'bundle',
      'add',
      'RegularBundle',
      '--format',
      'macosx',
      '--source-pattern',
      '**',
      '--export-pattern',
      'all.string',
    ]);
    bundleId = result.stdout.match(/│\s*0\s*│\s*(\d+)\s*│/)?.[1] ?? '';

    expect(result.exitCode).toBe(0);
    expect(bundleId).not.toBe('');
    expect(maskBundleId(normalize(result.stdout), bundleId)).toMatchSnapshot();
  });

  test('adds a bundle with plain output', async () => {
    const result = await ctx.runner.run([
      'bundle',
      'add',
      'BundleCreatedWithPlainOutput',
      '--format',
      'xliff',
      '--source-pattern',
      '**',
      '--export-pattern',
      'all.xliff',
      '--output',
      'plain',
    ]);
    const localBundleId = normalize(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(localBundleId).toMatch(/^\d+$/);
    expect(maskBundleId(localBundleId, localBundleId)).toMatchSnapshot();
  });

  test('downloads the bundle', async () => {
    const result = await ctx.runner.run(['bundle', 'download', bundleId]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`#${bundleId} 'RegularBundle' has been successfully downloaded`);
    expect(result.stdout).toContain('it/all.string');
    expect(result.stdout).toContain('uk/all.string');
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await sortedLines(join(ctx.workspace, 'files/it/all.string'))).toEqual(
      await sortedLines(join(ctx.workspace, 'expected/it_all.string')),
    );
    expect(await sortedLines(join(ctx.workspace, 'files/uk/all.string'))).toEqual(
      await sortedLines(join(ctx.workspace, 'expected/uk_all.string')),
    );
  });
});

/**
 * Bundle ids are assigned by the server and are not project-scoped, so they differ on every run.
 * `normalize` only masks `#123`-style ids, which leaves the bare id in `bundle add` output (a table
 * cell, or the whole line with `--output plain`).
 *
 * Masking alone isn't enough for the table: its column widths are derived from the widest cell, so
 * an id one digit longer shifts every border. Collapsing runs of the padding characters makes the
 * snapshot width-independent while keeping the cell contents and structure.
 */
function maskBundleId(output: string, id: string): string {
  return output
    .replaceAll(new RegExp(`\\b${id}\\b`, 'g'), '<id>')
    .replaceAll(/─+/g, '─')
    .replaceAll(/ {2,}/g, ' ');
}

async function sortedLines(path: string): Promise<string[]> {
  const content = await Bun.file(path).text();
  return content
    .split('\n')
    .filter((line) => line.length > 0)
    .sort();
}

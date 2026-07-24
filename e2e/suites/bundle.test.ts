import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/** Order-independent content comparison, matching how the PHP suite compared exported .string files. */
async function sortedLines(path: string): Promise<string[]> {
  const content = await Bun.file(path).text();
  return content.split('\n').sort();
}

describe('bundle', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('bundle', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources for the bundle', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'first.json'");
    expect(result.stdout).toContain("File '1_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('adds a bundle', async () => {
    const result = await ctx.runner.run([
      'bundle',
      'add',
      'MyBundle',
      '--format',
      'macosx',
      '--source',
      '**',
      '--translation',
      'all.string',
    ]);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('adds a bundle with plain output', async () => {
    const result = await ctx.runner.run([
      'bundle',
      'add',
      'BundlePlainCreate',
      '--format',
      'xliff',
      '--source',
      '**',
      '--translation',
      'all.xliff',
      '--output',
      'plain',
    ]);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads the bundle', async () => {
    const result = await ctx.runner.run(['bundle', 'download', '1']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("#1 'MyBundle' has been successfully downloaded");
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

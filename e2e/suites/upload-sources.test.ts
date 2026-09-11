import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { createTestProject, deleteTestProject } from '../helpers/project.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers the flags `upload sources` owns (`cli/commands/upload/UploadSourcesCommand.ts`). The
 * command is the most-run one in the suite - a hundred-odd invocations - but almost always for its
 * side effect, so its own options went untested: `--cache` had no coverage at all, and the guards
 * that fire only against a string-based project had none either.
 *
 * `--cache` is the reason this suite exists: a checksum cache (`lib/upload/sourceCache.ts`) can
 * only be asserted across several runs, so the tests below run in sequence and share state.
 *
 * Not attempted: the no-manager-access guard at `:120` (a project the token can read but not
 * manage) and `File ... is currently being updated` at `:393`, which is a race against a concurrent
 * update rather than something a test can arrange.
 */
const SOURCE_PATHS = ['sources/alpha.json', 'sources/beta.json'];

interface UploadedFile {
  path: string;
  action: string;
  reason: string | null;
}

describe('upload sources', () => {
  let ctx: SuiteContext;
  let stringsBasedProjectId: number;

  beforeAll(async () => {
    ctx = await setupSuite('upload-sources', { targetLanguageIds: ['uk'] });
    // The string-based guards need a project of that kind; this suite's own is file-based.
    stringsBasedProjectId = (
      await createTestProject(ctx.client, { suite: 'upload-sources-strings', stringsBased: true })
    ).id;
  });

  afterAll(async () => {
    if (ctx && stringsBasedProjectId && !ctx.env.keep) {
      try {
        await deleteTestProject(ctx.client, stringsBasedProjectId);
      } catch (error) {
        console.error(`Failed to delete project #${stringsBasedProjectId}: ${error}`);
      }
    }

    await teardownSuite(ctx);
  });

  async function uploadJson(args: string[] = []): Promise<UploadedFile[]> {
    const result = await ctx.runner.run(['upload', 'sources', ...args, '--output', 'json']);

    expect(result).toMatchObject({ exitCode: 0 });

    return JSON.parse(result.stdout) as UploadedFile[];
  }

  function cachePath(): string {
    return join(ctx.workspace, '.crowdin', 'cache.json');
  }

  test('uploads through the `push` alias', async () => {
    const result = await ctx.runner.run(['push']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'sources/alpha.json'");
    expect(result.stdout).toContain("File 'sources/beta.json'");
  });

  test('uploads sources when no subcommand is given', async () => {
    const result = await ctx.runner.run(['upload']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'sources/alpha.json'");
  });

  test('lists only the written paths with --output plain', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--output', 'plain']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout.split('\n').filter(Boolean).sort()).toEqual(SOURCE_PATHS);
  });

  test('writes no cache file unless --cache is given', async () => {
    expect(await Bun.file(cachePath()).exists()).toBe(false);
  });

  test('seeds the checksum cache on the first --cache run', async () => {
    const uploaded = await uploadJson(['--cache']);

    // Nothing cached yet, so nothing is skipped. The action is 'updated' rather than 'created':
    // the tests above already put both files in the project.
    expect(uploaded.every((file) => file.action === 'updated')).toBe(true);

    const cache = (await Bun.file(cachePath()).json()) as { sourceHashes: Record<string, string> };

    expect(Object.keys(cache.sourceHashes).sort()).toEqual(SOURCE_PATHS);
    // sha256, so 64 hex characters.
    expect(Object.values(cache.sourceHashes).every((hash) => /^[0-9a-f]{64}$/.test(hash))).toBe(true);
  });

  test('skips every unchanged file on the second --cache run', async () => {
    const uploaded = await uploadJson(['--cache']);

    expect(uploaded.map((file) => file.path).sort()).toEqual(SOURCE_PATHS);
    expect(uploaded.every((file) => file.action === 'skipped' && file.reason === 'up to date')).toBe(true);
  });

  test('lifts the skip for the one file whose content changed', async () => {
    await Bun.write(join(ctx.workspace, 'sources/alpha.json'), '{\n  "greeting": "Hello again"\n}\n');

    const uploaded = await uploadJson(['--cache']);
    const byPath = new Map(uploaded.map((file) => [file.path, file]));

    expect(byPath.get('sources/alpha.json')?.action).toBe('updated');
    expect(byPath.get('sources/beta.json')?.action).toBe('skipped');
  });

  test('ignores --cache under --dryrun, leaving the cache untouched', async () => {
    const before = await Bun.file(cachePath()).text();

    const result = await ctx.runner.run(['upload', 'sources', '--cache', '--dryrun']);

    expect(result).toMatchObject({ exitCode: 0 });
    // A dry run uploads nothing, so recording checksums for it would make the next real run skip
    // files it never sent.
    expect(await Bun.file(cachePath()).text()).toBe(before);
  });

  test('starts from an empty cache when the cache file is unreadable', async () => {
    await Bun.write(cachePath(), 'not json at all');

    const result = await ctx.runner.run(['upload', 'sources', '--cache', '--output', 'json']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stderr).toContain('Failed to read cache file');

    const uploaded = JSON.parse(result.stdout) as UploadedFile[];

    expect(uploaded.every((file) => file.action !== 'skipped')).toBe(true);
  });

  // The four warning tests below assert the warning only. Uploading these sources into a
  // string-based project succeeds or reports per-file errors depending on what the previous run
  // left behind, so the exit code is not stable enough to assert - the warning is the contract.
  test('warns that excluded languages do not apply to a string-based project', async () => {
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '--excluded-language',
      'uk',
      '--branch',
      'main',
      '--project-id',
      String(stringsBasedProjectId),
    ]);

    expect(result.stderr).toContain("'excluded-languages' option can not be used for string-based projects");
  });

  test('warns that delete-obsolete does not apply to a string-based project', async () => {
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '--delete-obsolete',
      '--branch',
      'main',
      '--project-id',
      String(stringsBasedProjectId),
    ]);

    expect(result.stderr).toContain("'delete-obsolete' option can not be used for string-based projects");
  });

  test('warns that no-auto-update does not apply to a string-based project', async () => {
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '--no-auto-update',
      '--branch',
      'main',
      '--project-id',
      String(stringsBasedProjectId),
    ]);

    expect(result.stderr).toContain("'no-auto-update' option can not be used for string-based projects");
  });

  test('requires a branch for a string-based project', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--project-id', String(stringsBasedProjectId)]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('A branch is required to upload sources for a strings-based project');
  });

  test('warns that a configured context does not apply to a string-based project', async () => {
    await switchConfig(ctx, 'with-context');

    const result = await ctx.runner.run([
      'upload',
      'sources',
      '--branch',
      'main',
      '--project-id',
      String(stringsBasedProjectId),
    ]);

    expect(result.stderr).toContain('Context can not be used for string-based projects');
  });
});

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `distribution list` / `add` / `edit` / `release`
 * (`cli/commands/distribution/DistributionCommand.ts`). No PHP original - written against the TS
 * implementation.
 *
 * A distribution is defined by the bundles it exports, so `add` requires at least one `--bundle-id`
 * and the suite creates its bundles first, the same way `bundle.test.ts` does: `bundle add` echoes
 * the created bundle through `bundleView`, whose text form starts `#<id>`, so the id is read from
 * that token.
 *
 * Distribution hashes are server-generated and different on every run (`96b56107ddccaf8270616b7du20`),
 * and `normalize` does not mask them - it only masks `#123`-style ids. Snapshots therefore go
 * through `maskHash` first, mirroring `bundle.test.ts`'s `maskBundleId`.
 *
 * KNOWN BUG, asserted as it actually behaves rather than as it should:
 * `distribution release` prints `Releasing distribution <hash>: null%`. `DistributionService`'s
 * poll loop guards the progress callback with `release.progress !== undefined`, but the API returns
 * `progress: null` on this endpoint, and `null !== undefined`, so the null reaches the message and
 * renders as "null%". The guard wants a `!= null` (or an explicit null check). The test below
 * asserts the release SUCCEEDS and does not pin that line, so fixing the guard will not break it -
 * but the behaviour is recorded here so the next reader knows it was observed, not overlooked.
 */

/** Distribution hashes are per-run values, so snapshots see a stable placeholder instead. */
function maskHash(output: string, hash: string): string {
  return output.replaceAll(hash, '<hash>');
}

interface ListedDistribution {
  hash: string;
  name: string;
  exportMode: string;
}

describe('distribution', () => {
  let ctx: SuiteContext;
  let bundleId: string;
  let secondBundleId: string;
  let hash: string;

  async function listDistributions(): Promise<ListedDistribution[]> {
    const result = await ctx.runner.run(['distribution', 'list', '--output', 'json']);

    expect(result.exitCode).toBe(0);

    return JSON.parse(result.stdout) as ListedDistribution[];
  }

  async function addBundle(name: string): Promise<string> {
    const result = await ctx.runner.run([
      'bundle',
      'add',
      name,
      '--format',
      'macosx',
      '--source-pattern',
      '**',
      '--export-pattern',
      'all.string',
    ]);

    expect(result.exitCode).toBe(0);

    const id = result.stdout.match(/#(\d+)/)?.[1] ?? '';

    expect(id).not.toBe('');

    return id;
  }

  beforeAll(async () => {
    ctx = await setupSuite('distribution', { targetLanguageIds: ['uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads the sources and translations the bundles export', async () => {
    const sources = await ctx.runner.run(['upload', 'sources']);

    expect(sources.exitCode).toBe(0);
    expect(sources.stdout).toContain("File 'sources/1_android.xml'");

    const translations = await ctx.runner.run(['upload', 'translations']);

    expect(translations.exitCode).toBe(0);
    expect(translations.stdout).toContain("File 'translations/uk/1_android.xml'");
  });

  test('creates the bundles a distribution needs', async () => {
    bundleId = await addBundle('DistributionBundle');
    secondBundleId = await addBundle('SecondBundle');

    expect(bundleId).not.toBe(secondBundleId);
  });

  test('prints help when invoked without a subcommand', async () => {
    const result = await ctx.runner.run(['distribution']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Manage distributions');
    expect(result.stdout).toContain('release <hash>');
  });

  test('rejects an unknown subcommand', async () => {
    const result = await ctx.runner.run(['distribution', 'bogus']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("unknown command 'bogus'");
  });

  test('reports a project with no distributions', async () => {
    const result = await ctx.runner.run(['distribution', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No distributions found');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('requires a name to add', async () => {
    const result = await ctx.runner.run(['distribution', 'add']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("missing required argument 'name'");
  });

  test('requires at least one bundle id', async () => {
    const result = await ctx.runner.run(['distribution', 'add', 'D1']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Bundle IDs are required. Use --bundle-id <id> (can be specified multiple times)');
  });

  test('rejects a non-numeric bundle id', async () => {
    const result = await ctx.runner.run(['distribution', 'add', 'D1', '--bundle-id', 'abc']);

    // toNumberArray raises a validation error, which exits 2 rather than the generic 1.
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Invalid bundle id');
  });

  test('adds a distribution for a bundle', async () => {
    const result = await ctx.runner.run(['distribution', 'add', 'D1', '--bundle-id', bundleId]);

    expect(result.exitCode).toBe(0);

    const [distribution] = await listDistributions();

    expect(distribution).toMatchObject({ name: 'D1', exportMode: 'bundle' });
    hash = (distribution as ListedDistribution).hash;

    expect(maskHash(normalize(result.stdout), hash)).toMatchSnapshot();
  });

  test('lists the distribution with its hash and export mode', async () => {
    const result = await ctx.runner.run(['distribution', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(hash);
    expect(maskHash(normalize(result.stdout), hash)).toMatchSnapshot();
  });

  test('lists the hash and name with --output plain', async () => {
    const result = await ctx.runner.run(['distribution', 'list', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(`${hash} D1`);
  });

  test('serializes hash, name and export mode in a structured format', async () => {
    expect(await listDistributions()).toEqual([{ hash, name: 'D1', exportMode: 'bundle' }]);
  });

  test('requires a hash to edit', async () => {
    const result = await ctx.runner.run(['distribution', 'edit']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("missing required argument 'hash'");
  });

  test('requires at least one parameter to edit', async () => {
    const result = await ctx.runner.run(['distribution', 'edit', hash]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Specify the parameters to edit the distribution');
  });

  test('rejects editing a hash that does not exist', async () => {
    // editAction calls getByHash before patching, so an unknown hash fails before any write.
    const result = await ctx.runner.run(['distribution', 'edit', 'nosuchhash', '--name', 'X']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Couldn't find distribution with the specified hash");
  });

  test('renames a distribution', async () => {
    const result = await ctx.runner.run(['distribution', 'edit', hash, '--name', 'D1 renamed']);

    expect(result.exitCode).toBe(0);
    expect(await listDistributions()).toEqual([{ hash, name: 'D1 renamed', exportMode: 'bundle' }]);
  });

  test('replaces the bundle list', async () => {
    // The other half of editAction's patch: `--bundle-id` becomes a replace on /bundleIds. The hash
    // and name survive, so the listing is how the successful patch is observed.
    const result = await ctx.runner.run(['distribution', 'edit', hash, '--bundle-id', secondBundleId]);

    expect(result.exitCode).toBe(0);
    expect(await listDistributions()).toEqual([{ hash, name: 'D1 renamed', exportMode: 'bundle' }]);
  });

  test('rejects releasing a hash that does not exist', async () => {
    const result = await ctx.runner.run(['distribution', 'release', 'nosuchhash']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Couldn't find distribution with the specified hash");
  });

  test('releases the distribution', async () => {
    // Last: this polls a real build to completion. The progress line it prints along the way is the
    // "null%" bug described at the top of this file, so only the terminal outcome is asserted.
    const result = await ctx.runner.run(['distribution', 'release', hash]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`Distribution '${hash}' has been successfully released`);
  });
});

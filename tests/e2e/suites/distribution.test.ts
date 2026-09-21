import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { expectFailure } from '../helpers/cli.ts';
import { normalize } from '../helpers/normalize.ts';
import { runJson, type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `distribution list` / `add` / `edit` / `release`
 * (`cli/commands/distribution/DistributionCommand.ts`).
 *
 * A distribution is defined by the bundles it exports, so the suite creates its own first, reading
 * the id from `bundle add`'s `#<id>` echo as `bundle.test.ts` does.
 *
 * Hashes are server-generated and differ every run. `normalize` masks ids, not hashes (nothing in
 * the text marks one), so snapshots go through `maskHash` with the hash this run produced.
 */

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
    return runJson<ListedDistribution[]>(ctx, ['distribution', 'list']);
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

    expect(result).toMatchObject({ exitCode: 0 });

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

    expect(sources).toMatchObject({ exitCode: 0 });
    expect(sources.stdout).toContain("File 'sources/1_android.xml'");

    const translations = await ctx.runner.run(['upload', 'translations']);

    expect(translations).toMatchObject({ exitCode: 0 });
    expect(translations.stdout).toContain("File 'translations/uk/1_android.xml'");
  });

  test('creates the bundles a distribution needs', async () => {
    bundleId = await addBundle('DistributionBundle');
    secondBundleId = await addBundle('SecondBundle');

    expect(bundleId).not.toBe(secondBundleId);
  });

  test('prints help when invoked without a subcommand', async () => {
    const result = await ctx.runner.run(['distribution']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Manage distributions');
    expect(result.stdout).toContain('release <hash>');
  });

  test('rejects an unknown subcommand', async () => {
    const result = await ctx.runner.run(['distribution', 'bogus']);

    expectFailure(result, 2, "unknown command 'bogus'");
  });

  test('reports a project with no distributions', async () => {
    const result = await ctx.runner.run(['distribution', 'list']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('No distributions found');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('requires a name to add', async () => {
    const result = await ctx.runner.run(['distribution', 'add']);

    expectFailure(result, 2, "missing required argument 'name'");
  });

  test('requires at least one bundle id', async () => {
    const result = await ctx.runner.run(['distribution', 'add', 'D1']);

    expectFailure(result, 1, 'Bundle IDs are required. Use --bundle-id <id> (can be specified multiple times)');
  });

  test('rejects a non-numeric bundle id', async () => {
    const result = await ctx.runner.run(['distribution', 'add', 'D1', '--bundle-id', 'abc']);

    // toNumberArray raises a validation error, so exit 2 rather than the generic 1.
    expectFailure(result, 2, 'Invalid bundle id');
  });

  test('adds a distribution for a bundle', async () => {
    const result = await ctx.runner.run(['distribution', 'add', 'D1', '--bundle-id', bundleId]);

    expect(result).toMatchObject({ exitCode: 0 });

    const [distribution] = await listDistributions();

    expect(distribution).toMatchObject({ name: 'D1', exportMode: 'bundle' });
    hash = (distribution as ListedDistribution).hash;

    expect(maskHash(normalize(result.stdout), hash)).toMatchSnapshot();
  });

  test('lists the distribution with its hash and export mode', async () => {
    const result = await ctx.runner.run(['distribution', 'list']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain(hash);
    expect(maskHash(normalize(result.stdout), hash)).toMatchSnapshot();
  });

  test('lists the hash and name with --output plain', async () => {
    const result = await ctx.runner.run(['distribution', 'list', '--output', 'plain']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout.trim()).toBe(`${hash} D1`);
  });

  test('serializes hash, name and export mode in a structured format', async () => {
    expect(await listDistributions()).toEqual([{ hash, name: 'D1', exportMode: 'bundle' }]);
  });

  test('requires a hash to edit', async () => {
    const result = await ctx.runner.run(['distribution', 'edit']);

    expectFailure(result, 2, "missing required argument 'hash'");
  });

  test('requires at least one parameter to edit', async () => {
    const result = await ctx.runner.run(['distribution', 'edit', hash]);

    expectFailure(result, 1, 'Specify the parameters to edit the distribution');
  });

  test('rejects editing a hash that does not exist', async () => {
    // editAction calls getByHash before patching, so an unknown hash fails before any write.
    const result = await ctx.runner.run(['distribution', 'edit', 'nosuchhash', '--name', 'X']);

    expectFailure(result, 1, "Couldn't find distribution with the specified hash");
  });

  test('renames a distribution', async () => {
    const result = await ctx.runner.run(['distribution', 'edit', hash, '--name', 'D1 renamed']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(await listDistributions()).toEqual([{ hash, name: 'D1 renamed', exportMode: 'bundle' }]);
  });

  test('replaces the bundle list', async () => {
    // editAction's other patch branch: `--bundle-id` becomes a replace on /bundleIds.
    const result = await ctx.runner.run(['distribution', 'edit', hash, '--bundle-id', secondBundleId]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(await listDistributions()).toEqual([{ hash, name: 'D1 renamed', exportMode: 'bundle' }]);
  });

  test('rejects releasing a hash that does not exist', async () => {
    const result = await ctx.runner.run(['distribution', 'release', 'nosuchhash']);

    expectFailure(result, 1, "Couldn't find distribution with the specified hash");
  });

  test('releases the distribution', async () => {
    // Last: polls a real build to completion. Whether any poll catches a percentage is a timing
    // race, so only the terminal outcome is pinned.
    const result = await ctx.runner.run(['distribution', 'release', hash]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain(`Distribution '${hash}' has been successfully released`);
    expect(result.stdout).not.toContain('null%');
  });

  test('rejects an empty distribution name on add', async () => {
    const result = await ctx.runner.run(['distribution', 'add', '']);

    expectFailure(result, 1, 'Distribution name is required');
  });

  test.each([['edit'], ['release']])('rejects an empty distribution hash on %s', async (subcommand) => {
    const result = await ctx.runner.run(['distribution', subcommand, '']);

    expectFailure(result, 1, 'Distribution hash is required');
  });
});

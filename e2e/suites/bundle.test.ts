import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * `bundle browse` is not covered, for the reason `project browse` is not: `browseAction` calls
 * `openUrl`, which spawns a real `open`/`xdg-open`, so a test would pop a browser tab on every run.
 */
describe('bundle', () => {
  let ctx: SuiteContext;
  let bundleId: string;
  let clonedBundleId: string;
  let flaggedBundleId: string;

  beforeAll(async () => {
    ctx = await setupSuite('bundle', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  /**
   * The bundle as the API holds it. `includeInContextPseudoLanguage` is absent from the client's
   * `Bundle` model but is returned by the API, so it is read off a widened type.
   */
  async function apiBundle(id: string | number) {
    const response = await ctx.client.bundlesApi.getBundle(ctx.project.id, Number(id));

    return response.data as (typeof response)['data'] & { includeInContextPseudoLanguage?: boolean };
  }

  async function listedBundles(): Promise<{ id: number; name: string; format: string }[]> {
    const result = await ctx.runner.run(['bundle', 'list', '--output', 'json']);

    expect(result.exitCode).toBe(0);

    return JSON.parse(result.stdout) as { id: number; name: string; format: string }[];
  }

  test('prints help when invoked without a subcommand', async () => {
    const result = await ctx.runner.run(['bundle']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Manage bundles');

    for (const subcommand of ['list', 'add', 'delete', 'download', 'clone', 'browse']) {
      expect(result.stdout).toContain(subcommand);
    }
  });

  test('rejects an unknown subcommand', async () => {
    const result = await ctx.runner.run(['bundle', 'bogus']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("unknown command 'bogus'");
  });

  test('reports an empty bundle list', async () => {
    const result = await ctx.runner.run(['bundle', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No bundles found');
    expect(normalize(result.stdout)).toMatchSnapshot();
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
    // `bundle add` echoes the created bundle through output.item(bundleView): text renders
    // `#<id> <format> <exportPattern> <name>`, so the id comes from the `#<id>` token rather than
    // from a console.table cell (the grid this used to parse is not what the command prints).
    bundleId = result.stdout.match(/#(\d+)/)?.[1] ?? '';

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
    // bundleView's plain line is `<id> <name>` - identifier first, then the name, per the
    // plain-format contract (one bare line per entity, space-safe fields last).
    const plainLine = normalize(result.stdout);
    const localBundleId = plainLine.match(/^(\d+)\b/)?.[1] ?? '';

    expect(result.exitCode).toBe(0);
    expect(localBundleId).not.toBe('');
    expect(plainLine).toBe(`${localBundleId} BundleCreatedWithPlainOutput`);
    expect(maskBundleId(plainLine, localBundleId)).toMatchSnapshot();
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

  test('requires a bundle name', async () => {
    const result = await ctx.runner.run(['bundle', 'add']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("missing required argument 'name'");
  });

  test('requires --format, --source-pattern and --export-pattern', async () => {
    const missingFormat = await ctx.runner.run(['bundle', 'add', 'Incomplete']);

    expect(missingFormat.exitCode).toBe(1);
    expect(missingFormat.stderr).toContain("'--format' can't be empty");

    const missingSource = await ctx.runner.run(['bundle', 'add', 'Incomplete', '--format', 'xliff']);

    expect(missingSource.exitCode).toBe(1);
    expect(missingSource.stderr).toContain("'--source-pattern' can't be empty");

    const missingExport = await ctx.runner.run([
      'bundle',
      'add',
      'Incomplete',
      '--format',
      'xliff',
      '--source-pattern',
      '**',
    ]);

    expect(missingExport.exitCode).toBe(1);
    expect(missingExport.stderr).toContain("'--export-pattern' can't be empty");
  });

  test('lists every bundle', async () => {
    const result = await ctx.runner.run(['bundle', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('RegularBundle');
    expect(result.stdout).toContain('BundleCreatedWithPlainOutput');

    expect((await listedBundles()).map((bundle) => bundle.name).sort()).toEqual([
      'BundleCreatedWithPlainOutput',
      'RegularBundle',
    ]);
  });

  // Every clone option is tri-state: omitted means "inherit from the source bundle".
  test('clones a bundle, inheriting its settings', async () => {
    const result = await ctx.runner.run(['bundle', 'clone', bundleId]);

    expect(result.exitCode).toBe(0);

    clonedBundleId = result.stdout.match(/#(\d+)/)?.[1] ?? '';

    expect(clonedBundleId).not.toBe('');
    expect(clonedBundleId).not.toBe(bundleId);

    const clone = (await listedBundles()).find((bundle) => bundle.id === Number(clonedBundleId));

    expect(clone?.name).toBe('RegularBundle (clone)');
    expect(clone?.format).toBe('macosx');
  });

  test('clones a bundle with overrides', async () => {
    const result = await ctx.runner.run([
      'bundle',
      'clone',
      bundleId,
      '--name',
      'OverriddenClone',
      '--format',
      'xliff',
      '--export-pattern',
      'all.xliff',
    ]);

    expect(result.exitCode).toBe(0);

    const id = Number(result.stdout.match(/#(\d+)/)?.[1] ?? '');
    const clone = (await listedBundles()).find((bundle) => bundle.id === id);

    expect(clone?.name).toBe('OverriddenClone');
    expect(clone?.format).toBe('xliff');
  });

  test('warns instead of failing when cloning an unknown bundle', async () => {
    const result = await ctx.runner.run(['bundle', 'clone', '1']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Couldn't find bundle by the specified ID");
  });

  test('rejects a non-numeric bundle id', async () => {
    const result = await ctx.runner.run(['bundle', 'delete', 'abc']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Bundle id must be numeric');
  });

  test('warns instead of failing when deleting an unknown bundle', async () => {
    const result = await ctx.runner.run(['bundle', 'delete', '1']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Couldn't find bundle by the specified ID");
  });

  test('fails to download an unknown bundle', async () => {
    const result = await ctx.runner.run(['bundle', 'download', '1']);

    expect(result.exitCode).toBe(102);
    expect(result.stderr).toContain("Couldn't find bundle by the specified ID");
  });

  test('deletes a bundle', async () => {
    const result = await ctx.runner.run(['bundle', 'delete', clonedBundleId]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`Bundle #${clonedBundleId} deleted`);
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect((await listedBundles()).map((bundle) => bundle.id)).not.toContain(Number(clonedBundleId));
  });

  // `add` declares only the flag that changes the request: the bundle is created with the
  // pseudo-language included and the other two off, so only --no-include-pseudo-language,
  // --include-source-language and --multilingual exist there.
  test('applies the add defaults when no flag is given', async () => {
    const result = await ctx.runner.run([
      'bundle',
      'add',
      'DefaultFlags',
      '--format',
      'xliff',
      '--source-pattern',
      '**',
      '--export-pattern',
      'default.xliff',
    ]);

    expect(result.exitCode).toBe(0);

    const bundle = await apiBundle(result.stdout.match(/#(\d+)/)?.[1] ?? '');

    expect(bundle.includeProjectSourceLanguage).toBe(false);
    expect(bundle.includeInContextPseudoLanguage).toBe(true);
    expect(bundle.isMultilingual).toBe(false);
  });

  test('honours every add flag', async () => {
    const result = await ctx.runner.run([
      'bundle',
      'add',
      'AllFlags',
      '--format',
      'xliff',
      '--source-pattern',
      '**',
      '--export-pattern',
      'all-flags.xliff',
      '--ignore-pattern',
      '**/ignored.json',
      '--include-source-language',
      '--no-include-pseudo-language',
      '--multilingual',
    ]);

    expect(result.exitCode).toBe(0);

    flaggedBundleId = result.stdout.match(/#(\d+)/)?.[1] ?? '';

    const bundle = await apiBundle(flaggedBundleId);

    expect(bundle.includeProjectSourceLanguage).toBe(true);
    expect(bundle.includeInContextPseudoLanguage).toBe(false);
    expect(bundle.isMultilingual).toBe(true);
    expect(bundle.ignorePatterns).toEqual(['**/ignored.json']);
  });

  test('inherits every flag on a clone', async () => {
    const result = await ctx.runner.run(['bundle', 'clone', flaggedBundleId, '--name', 'InheritedFlags']);

    expect(result.exitCode).toBe(0);

    const bundle = await apiBundle(result.stdout.match(/#(\d+)/)?.[1] ?? '');

    expect(bundle.includeProjectSourceLanguage).toBe(true);
    expect(bundle.includeInContextPseudoLanguage).toBe(false);
    expect(bundle.isMultilingual).toBe(true);
    expect(bundle.ignorePatterns).toEqual(['**/ignored.json']);
  });

  // The reason clone declares a negation for every flag: without one, an inherited `true` could
  // never be turned back off.
  test('turns an inherited flag back off on a clone', async () => {
    const result = await ctx.runner.run([
      'bundle',
      'clone',
      flaggedBundleId,
      '--name',
      'NegatedFlags',
      '--no-include-source-language',
      '--include-pseudo-language',
      '--no-multilingual',
    ]);

    expect(result.exitCode).toBe(0);

    const bundle = await apiBundle(result.stdout.match(/#(\d+)/)?.[1] ?? '');

    expect(bundle.includeProjectSourceLanguage).toBe(false);
    expect(bundle.includeInContextPseudoLanguage).toBe(true);
    expect(bundle.isMultilingual).toBe(false);
  });

  test('overrides the inherited ignore patterns on a clone', async () => {
    const result = await ctx.runner.run([
      'bundle',
      'clone',
      flaggedBundleId,
      '--name',
      'OverriddenPatterns',
      '--ignore-pattern',
      '**/other.json',
    ]);

    expect(result.exitCode).toBe(0);
    expect((await apiBundle(result.stdout.match(/#(\d+)/)?.[1] ?? '')).ignorePatterns).toEqual(['**/other.json']);
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

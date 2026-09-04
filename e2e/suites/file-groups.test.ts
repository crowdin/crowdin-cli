import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { captureAndClear, expectFilesExist, expectRestored } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Port of crowdin-backend/tests/Cli/Common/CliFileGroupsTest.php: four overlapping file groups over
 * the same `sources/` files, two of them ('*.xml' and the literal 'android.xml') matching the same
 * file and one ('*.pot') matching nothing.
 *
 * The three commands disagree about an empty pattern: `upload sources` reports it and exits 1,
 * while both translation commands exit 0.
 */
describe('file groups', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('file-groups', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources across overlapping file groups, then reports the empty pattern', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    // A group matching zero files is a soft error: the other groups still upload.
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Current execution finished with errors');
    expect(result.stdout).toContain("Directory 'sources'");
    expect(result.stdout).toContain("File 'sources/java.properties'");
    expect(result.stdout).toContain("File 'sources/android.xml'");
    // The second group to reach android.xml skips it - `upload sources` dedups by project path.
    expect(result.stderr).toContain("Skipping file 'sources/android.xml' because it is already uploading/uploaded");
    expect(result.stderr).toContain(
      "No sources found for '/sources/*.pot' pattern. Check the source paths in your configuration file",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'sources/android.xml', 'sources/java.properties');
  });

  test('uploads translations, duplicating the file matched by both overlapping groups', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    // Same empty pattern as above, but here it does not fail the run.
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain(
      "No sources found for '/sources/*.pot' pattern. Check the source paths in your configuration file",
    );
    expect(result.stdout).toContain("File 'translations/it/java.properties'");
    expect(result.stdout).toContain("File 'translations/uk/java.properties'");

    // No dedup across file groups here, so the doubly-matched android.xml uploads twice per language.
    const italianUploads = result.stdout.split("File 'translations/it/android.xml'").length - 1;
    const ukrainianUploads = result.stdout.split("File 'translations/uk/android.xml'").length - 1;
    expect(italianUploads).toBe(2);
    expect(ukrainianUploads).toBe(2);

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations, deduplicating the file matched by both overlapping groups', async () => {
    // The upload fixtures already sit at these paths, so clear them first - otherwise the existence
    // check below passes even if the download writes nothing.
    const captured = await captureAndClear(
      ctx.workspace,
      'translations/it/android.xml',
      'translations/it/java.properties',
      'translations/uk/android.xml',
      'translations/uk/java.properties',
    );

    const result = await ctx.runner.run(['download', 'translations']);

    // The empty pattern passes silently here, and the doubly-matched android.xml collapses to one
    // line per language: the download maps by path, so the second group's entry overwrites the first.
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'translations/it/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/it/java.properties' extracted");
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/java.properties' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    // The configured `translation:` pattern is absolute, so downloads land at it verbatim rather
    // than at '<lang>/<source path>'.
    await expectRestored(ctx.workspace, captured);
  });
});

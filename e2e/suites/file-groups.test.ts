import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { captureAndClear, expectFilesExist, expectRestored } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Port of crowdin-backend/tests/Cli/Common/CliFileGroupsTest.php: a `crowdin.yml` with four
 * overlapping file groups sharing the same `sources/` files -- one group ('*.properties') matches
 * only java.properties, two groups ('*.xml' and the literal 'android.xml') both match the same
 * android.xml file, and one group ('*.pot') never matches anything.
 *
 * Like PHP, `upload sources` treats "no sources found" as non-fatal: it uploads every other group
 * and only ends with exit code 1 for "finished with errors". `upload translations` and `download
 * translations` don't flag the run at all for an empty pattern (confirmed from source below), so
 * they exit 0.
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

    // A group matching zero files is a soft error in UploadSourcesCommand.ts: it reports, sets
    // `hasErrors` and keeps uploading the other groups, then closes with PHP's "Current execution
    // finished with errors" as a CliError -- stderr, exit 1.
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Current execution finished with errors');
    expect(result.stdout).toContain("Directory 'sources'");
    expect(result.stdout).toContain("File 'sources/java.properties'");
    expect(result.stdout).toContain("File 'sources/android.xml'");
    // Overlap between '/sources/*.xml' and '/sources/android.xml': the second group's task sees the
    // project path already in `seenFilePaths` and skips it with this exact warning (confirmed at
    // UploadSourcesCommand.ts, matches the PHP wording verbatim).
    expect(result.stderr).toContain("Skipping file 'sources/android.xml' because it is already uploading/uploaded");
    // Confirmed at UploadSourcesCommand.ts -- matches the PHP wording verbatim.
    expect(result.stderr).toContain(
      "No sources found for '/sources/*.pot' pattern. Check the source paths in your configuration file",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'sources/android.xml', 'sources/java.properties');
  });

  test('uploads translations, duplicating the file matched by both overlapping groups', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    // buildTranslationEntries reports a zero-match pattern and moves on without flagging the run as
    // failed (unlike UploadSourcesCommand.ts's `hasErrors` above), so this exits 0 on the same
    // empty '.pot' pattern.
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain(
      "No sources found for '/sources/*.pot' pattern. Check the source paths in your configuration file",
    );
    expect(result.stdout).toContain("File 'translations/it/java.properties'");
    expect(result.stdout).toContain("File 'translations/uk/java.properties'");

    // buildTranslationEntries has no dedup across config.files (unlike UploadSourcesCommand.ts's
    // seenFilePaths), so android.xml -- matched by both '/sources/*.xml' and '/sources/android.xml'
    // -- produces two upload entries per language, mirroring the PHP original's duplicated lines.
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

    // buildTranslationMapping (lib/download/translationMapping.ts) silently skips a pattern with
    // zero local matches -- no warning/error at all for '/sources/*.pot' here, unlike either upload
    // command above (confirmed by reading the function: an empty `localSourcePaths` just produces
    // no map entries). android.xml's two overlapping groups resolve to the identical archive/local
    // path, and since the mapping is a `Map`, the second write is a no-op collision -- exactly one
    // 'extracted' line per language, matching the PHP original's non-duplicated expectation.
    expect(result.exitCode).toBe(0);
    // Confirmed at DownloadCommand.ts: `output.success(\`File ${localPath} extracted\`)` -- no quotes
    // around the path, unlike the upload commands' `File '...'` wording.
    expect(result.stdout).toContain("File 'translations/it/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/it/java.properties' extracted");
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/java.properties' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    // The config's `translation:` pattern has a leading slash ('/translations/...'); confirmed by
    // the sibling full-cli-workflow and excluded-languages suites that this lands downloads at the
    // literal configured path (translations/<lang>/<file>), not '<lang>/<source path>'.
    await expectRestored(ctx.workspace, captured);
  });
});

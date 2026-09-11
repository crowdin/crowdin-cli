import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Port of crowdin-backend/tests/Cli/Common/CliInvalidFilesConfigTest.php.
 *
 * PHP re-renders `crowdin.yml` before every test; here one fixture with a valid fallback `files:`
 * entry is enough, because a CLI `--source`/`--translation` pair replaces `config.files` outright.
 */
describe('invalid files config', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('invalid-files-config');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources with a source pattern that matches no local file', async () => {
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '--source',
      '/sources/android-not-exists.xml',
      '--translation',
      '/translations/%two_letters_code%/android.xml',
    ]);

    // A zero-match group flags the run; both lines land on stderr.
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stderr).toContain(
      "No sources found for '/sources/android-not-exists.xml' pattern. Check the source paths in your configuration file",
    );
    expect(result.stderr).toContain('Current execution finished with errors');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources with a source pattern whose folder does not exist', async () => {
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '--source',
      '/not-exists/**/*.*',
      '--translation',
      '/translations/%two_letters_code%/android.xml',
    ]);

    // A nonexistent base folder globs to zero matches too.
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stderr).toContain(
      "No sources found for '/not-exists/**/*.*' pattern. Check the source paths in your configuration file",
    );
    expect(result.stderr).toContain('Current execution finished with errors');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources with a translation pattern missing a language placeholder', async () => {
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '--source',
      '/sources/android.xml',
      // Capital L: not a recognized placeholder, so the pattern counts as having none.
      '--translation',
      '/translations/%two_Letters_code%/android.xml',
    ]);

    // The config schema rejects this before any API call.
    expect(result.exitCode).toBe(2);
    expect(result.stdout).not.toContain('Fetching project info');
    expect(result.stderr).toContain(
      "The 'translation' parameter should contain at least one language placeholder (e.g. %locale%)",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources with a translation pattern containing a relative path', async () => {
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '--source',
      '/sources/android.xml',
      '--translation',
      '../translations/%two_letters_code%/android.xml',
    ]);

    // Same gate, different rule: the translation field rejects `../`.
    expect(result.exitCode).toBe(2);
    expect(result.stdout).not.toContain('Fetching project info');
    expect(result.stderr).toContain("The 'translation' parameter can't contain any relative paths '../' or './'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations when the source file does not exist in the project', async () => {
    const result = await ctx.runner.run([
      'upload',
      'translations',
      '--source',
      '/sources/android.xml',
      '--translation',
      '/translations/%two_letters_code%/android-not-exists.xml',
    ]);

    // No earlier test in this suite uploads anything, so the project is still empty: the run fails
    // on the missing SOURCE file and never reaches the nonexistent translation filename. One error
    // line per source file, not per target language.
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stderr).toContain("Source file 'sources/android.xml' does not exist in the project");
    expect(result.stderr).toContain('Current execution finished with errors');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `auto-translate`'s option surface (`cli/commands/auto-translate/AutoTranslateCommand.ts`).
 * `auto-translate-mt.test.ts` is a port of the PHP `CliPreTranslateTest` suite and drives the working paths of `--method`,
 * `--engine-id` and `--auto-approve-option`; what had no coverage is the validation order in
 * `defaultAction` and the flags that select what gets translated.
 *
 * Every real run uses `--method tm`, which needs no engine and finishes against an empty TM.
 * `preTranslate` polls to completion, so a zero exit means the server finished the job.
 */
const SOURCE_FILE = '/sources/app.xml';
const NESTED_FILE = '/sources/nested/extra.xml';

describe('auto-translate', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('auto-translate');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/app.xml'");
    expect(result.stdout).toContain("File 'sources/nested/extra.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('requires --method', async () => {
    const result = await ctx.runner.run(['auto-translate']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Missing required option '--method'. Supported values: mt, tm, ai");
  });

  test('rejects an unsupported --method', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'human']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Invalid value for '--method'. Supported values: mt, tm, ai");
  });

  // The checks below run in the order `defaultAction` declares them, before the project is loaded.
  // The `--engine-id` requirement is part of that order too; it is covered by
  // `auto-translate-mt.test.ts`, which owns the MT paths.
  test('refuses --file together with --directory', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--file',
      SOURCE_FILE,
      '--directory',
      '/sources',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Either '--file' or '--directory' can be specified");
  });

  test('refuses --language together with --exclude-language', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--language',
      'uk',
      '--exclude-language',
      'it',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The '--language' and '--exclude-language' options can't be used simultaneously");
  });

  test('restricts --translate-with-perfect-match-only to the TM method', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'mt',
      '--engine-id',
      '1',
      '--translate-with-perfect-match-only',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      "'--translate-with-perfect-match-only' only works with the TM auto-translation method",
    );
  });

  test('requires --ai-prompt for the AI method', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'ai']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("AI should be used with the '--ai-prompt' parameter");
  });

  test('rejects an unsupported --auto-approve-option', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--auto-approve-option', 'sometimes']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Wrong '--auto-approve-option' parameter");
  });

  // --replace-translations-option declares `choices`, so commander rejects a bad value as a usage
  // error (exit 2) and `resolveReplaceTranslationsOption`'s own message never fires. Its sibling
  // --auto-approve-option declares none, which is why that one still reports at exit 1 above.
  test('rejects an unsupported --replace-translations-option', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--replace-translations-option',
      'sometimes',
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('sometimes');
  });

  test('rejects a language the project does not target', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--language', 'de']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Language(s) 'de' doesn't exist in the project");
  });

  test('rejects an excluded language the project does not target', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--exclude-language', 'de']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Language(s) 'de' doesn't exist in the project");
  });

  test('fails on a branch the project does not hold', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '-b', 'no-such-branch']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Branch 'no-such-branch' doesn't exist in the project");
  });

  test('fails on a single --file the project does not hold', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--file', '/sources/missing.xml']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Project doesn't contain the '/sources/missing.xml' file");
  });

  test('finds no files to translate under an empty --directory', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--directory', '/nowhere']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Couldn't find any files to Auto-Translate in the current project");
  });

  test('translates the whole project', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm']);

    expect(result.exitCode).toBe(0);
  });

  test('translates a single file', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--file', SOURCE_FILE]);

    expect(result.exitCode).toBe(0);
  });

  // With several --file values a missing one is a warning, and the run still translates the rest -
  // the failure is reported only once the job is done.
  test('warns per missing file and fails at the end when several are given', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--file',
      SOURCE_FILE,
      '--file',
      '/sources/missing.xml',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Project doesn't contain the '/sources/missing.xml' file");
    expect(result.stderr).toContain('Some of the specified files were not found in the project');
  });

  test('translates the files of a --directory', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--directory', '/sources/nested']);

    expect(result.exitCode).toBe(0);
  });

  test('accepts --language all alongside --exclude-language', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--language',
      'all',
      '--exclude-language',
      'it',
    ]);

    expect(result.exitCode).toBe(0);
  });

  test('warns about a label the project is missing', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--label', 'no-such-label']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("The 'no-such-label' label is missing in the Crowdin project");
  });

  test('warns about a missing exclude label', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--exclude-label', 'no-such-label']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("The 'no-such-label' label is missing in the Crowdin project");
  });

  // The request-shaping flags are not freely combinable: the API refuses
  // translation-modified-before and replace-translations-option unless the scope covers translated
  // strings, and reset-approval-status unless auto-approve and skip-approved are left alone. These
  // two runs are the coherent halves of that constraint.
  test('accepts the re-translation flags', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--file',
      NESTED_FILE,
      '--scope',
      'translated',
      '--replace-translations-option',
      'auto-translated',
      '--translation-modified-before',
      '2030-01-01T00:00:00Z',
      '--reset-approval-status',
      '--duplicate-translations',
      '--translate-with-perfect-match-only',
      '--priority',
      'high',
      '--source-language',
      'en',
    ]);

    expect(result.exitCode).toBe(0);
  });

  test('accepts the untranslated-scope flags', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--file',
      NESTED_FILE,
      '--scope',
      'untranslated',
      '--auto-approve-option',
      'perfect-match-only',
      '--duplicate-translations',
      '--skip-approved-translations',
      '--translate-with-perfect-match-only',
      '--priority',
      'low',
      '--source-language',
      'en',
    ]);

    expect(result.exitCode).toBe(0);
  });

  test('surfaces the API refusal when the flags contradict each other', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--file',
      NESTED_FILE,
      '--scope',
      'untranslated',
      '--replace-translations-option',
      'auto-translated',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Key: replaceTranslationsOption');
    expect(result.stderr).toContain('Field cannot be set when [scope] has the current value');
  });

  // The CLI forwards the value untouched, so a date without a time is the API's to reject.
  test('passes a --translation-modified-before value straight to the API', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--file',
      NESTED_FILE,
      '--translation-modified-before',
      '2030-01-01',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('valid date in ISO 8601 format');
  });

  test('reports the totals under --verbose', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--file', SOURCE_FILE, '--verbose']);

    expect(result.exitCode).toBe(0);

    for (const line of ['- files:', '- phrases:', '- words:', '- skipped:']) {
      expect(result.stdout).toContain(line);
    }
  });

  test('reports the job in the json output', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--file',
      SOURCE_FILE,
      '--output',
      'json',
    ]);

    expect(result.exitCode).toBe(0);

    const job = JSON.parse(result.stdout) as { identifier: string; status: string };

    expect(job.identifier).toBeTruthy();
    expect(job.status).toBe('finished');
  });
});

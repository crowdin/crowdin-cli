import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { decode } from '@toon-format/toon';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `config sources` / `config translations` / `config lint`
 * (`cli/commands/config/ConfigCommand.ts`). Seven other suites run these in passing, but only ever
 * on a config built to succeed, which leaves three things untested: `lint`'s own two checks (the
 * source-pattern and languages-mapping validations, which no other command runs), the gate where a
 * machine `--output` outranks `--tree`, and every structured rendering of the listings.
 *
 * The alt-configs exist because those checks need a config built to *fail*, which a suite's default
 * config can't also be.
 *
 * Not reachable from a single account, so not attempted here: the manager-role probe in
 * `listTranslationsAction` (text warns and exits 0, a machine format prints an error record and
 * throws Forbidden/103) needs a project the token can read but not manage, and the in-context
 * pseudo-language branch needs an in-context-enabled project.
 */
const TARGET_LANGUAGES = ['it', 'uk'];

/** Every source the default config's two groups match, as `config sources` lists them. */
const SOURCE_PATHS = ['sources/main/app.xml', 'sources/main/nested/deep.xml', 'sources/other/lib.xml'];

describe('config', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('config', { targetLanguageIds: TARGET_LANGUAGES });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  function lines(stdout: string): string[] {
    return stdout.split('\n').filter((line) => line.length > 0);
  }

  /** json writes one diagnostic record per line; the count is what proves nothing double-prints. */
  function structuredDiagnostics(stderr: string): { level: string; message: string; code?: number }[] {
    return lines(stderr.trim()).map((line) => JSON.parse(line));
  }

  test('prints help when invoked without a subcommand', async () => {
    const result = await ctx.runner.run(['config']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('validate configuration');
    expect(result.stdout).toContain('sources');
    expect(result.stdout).toContain('translations');
    expect(result.stdout).toContain('lint');
  });

  test('rejects an unknown subcommand', async () => {
    const result = await ctx.runner.run(['config', 'bogus']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("unknown command 'bogus'");
  });

  test('lists the matched source files', async () => {
    const result = await ctx.runner.run(['config', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // `@file` expansion happens in cli.ts before commander parses (expandArgFiles), so nothing below
  // the entry point can see it. The tokenizer has unit tests; what needs an end-to-end run is that
  // the expansion is wired in at all, and that an expanded command reaches config resolution.
  test('runs a command supplied by an @arg-file', async () => {
    await Bun.write(
      join(ctx.workspace, 'args.txt'),
      '# the whole command lives here\nconfig sources\n--output plain\n',
    );

    const result = await ctx.runner.run(['@args.txt']);

    expect(result.exitCode).toBe(0);
    expect(lines(result.stdout).sort()).toEqual(SOURCE_PATHS);
  });

  test('keeps an @arg-file that does not exist as a literal argument', async () => {
    // picocli does not error on an unreadable @-file; it passes the token through, so the failure
    // comes from commander not recognising it rather than from the expansion.
    const result = await ctx.runner.run(['@no-such-args.txt']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("unknown command '@no-such-args.txt'");
  });

  test('lists bare source paths with --output plain', async () => {
    const result = await ctx.runner.run(['config', 'sources', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    expect(lines(result.stdout).sort()).toEqual(SOURCE_PATHS);
  });

  test('serializes the source paths as a json list of strings', async () => {
    const result = await ctx.runner.run(['config', 'sources', '--output', 'json']);

    expect(result.exitCode).toBe(0);
    // pathView declares no keys and its items are the paths themselves, so the document is a list of
    // bare strings rather than of objects.
    expect(JSON.parse(result.stdout)).toEqual(SOURCE_PATHS);
  });

  test('carries the same source list in the toon output', async () => {
    const result = await ctx.runner.run(['config', 'sources', '--output', 'toon']);

    expect(result.exitCode).toBe(0);
    expect(decode(result.stdout)).toEqual(SOURCE_PATHS);
  });

  test('renders the sources as a tree', async () => {
    const result = await ctx.runner.run(['config', 'sources', '--tree']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('╰─ ');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lets a machine --output outrank --tree for sources', async () => {
    const result = await ctx.runner.run(['config', 'sources', '--tree', '--output', 'json']);

    expect(result.exitCode).toBe(0);
    // The tree is an interactive rendering; a machine format is a parseable contract and wins, so
    // the glyphs must not appear and the document has to stay the same list.
    expect(result.stdout).not.toContain('╰─');
    expect(JSON.parse(result.stdout)).toEqual(SOURCE_PATHS);
  });

  test('lists the translation files the config resolves to', async () => {
    const result = await ctx.runner.run(['config', 'translations', '--output', 'json']);

    expect(result.exitCode).toBe(0);

    // One per source per target language, both groups flat-mapped together.
    expect(JSON.parse(result.stdout)).toEqual([
      'translations/it/app.xml',
      'translations/it/deep.xml',
      'translations/it/lib.xml',
      'translations/uk/app.xml',
      'translations/uk/deep.xml',
      'translations/uk/lib.xml',
    ]);
  });

  test('lets a machine --output outrank --tree for translations', async () => {
    const result = await ctx.runner.run(['config', 'translations', '--tree', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('╰─');
    expect(lines(result.stdout)).toHaveLength(SOURCE_PATHS.length * TARGET_LANGUAGES.length);
  });

  test('accepts a valid configuration', async () => {
    const result = await ctx.runner.run(['config', 'lint']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Your configuration file looks good');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('accepts a languages_mapping whose keys are real language codes', async () => {
    await switchConfig(ctx, 'good-language-mapping');

    const result = await ctx.runner.run(['config', 'lint']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Your configuration file looks good');
  });

  test('rejects a languages_mapping key that is not a Crowdin language code', async () => {
    await switchConfig(ctx, 'bad-language-mapping');

    const result = await ctx.runner.run(['config', 'lint']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('The mapping format is the following: crowdin_language_code: code_you_use');
  });

  test('rejects a source pattern that matches nothing on disk', async () => {
    await switchConfig(ctx, 'no-source-match');

    const result = await ctx.runner.run(['config', 'lint']);

    expect(result.exitCode).toBe(2);
    // `checkSourceFilesExist` runs nowhere else - no other command fails on a pattern matching zero
    // files, they just upload nothing.
    expect(result.stderr).toContain("No source files found for '/sources/nothing-here/*.xml' pattern");
  });

  test('reports an empty listing rather than prose in a machine format', async () => {
    const text = await ctx.runner.run(['config', 'sources']);

    expect(text.exitCode).toBe(0);
    expect(text.stdout).toContain('No source files found');

    const json = await ctx.runner.run(['config', 'sources', '--output', 'json']);

    expect(json.exitCode).toBe(0);
    expect(JSON.parse(json.stdout)).toEqual([]);
  });

  test('reports a lint failure as one structured record carrying the exit code', async () => {
    const result = await ctx.runner.run(['config', 'lint', '--output', 'json']);

    expect(result.exitCode).toBe(2);

    const records = structuredDiagnostics(result.stderr);

    // Exactly one: lintAction stays silent in a structured format so the top-level handler, the only
    // place that knows the exit code, writes the record instead of duplicating it.
    expect(records).toHaveLength(1);
    expect(records[0]?.level).toBe('error');
    expect(records[0]?.message).toContain('No source files found');
    expect(records[0]?.code).toBe(2);
    expect(result.stdout.trim()).toBe('');
  });

  test('reports a spinner-wrapped failure as one record carrying the exit code too', async () => {
    // This failure comes from `withSpinner`, which marks it reported - the path that used to lose
    // `code` while a plain try/catch kept it, so whether a consumer saw `code` depended on which
    // service happened to raise the error.
    const result = await ctx.runner.run(['config', 'sources', '--project-id', '999999999', '--output', 'json']);

    expect(result.exitCode).toBe(102);

    const records = structuredDiagnostics(result.stderr);

    expect(records).toHaveLength(1);
    expect(records[0]?.message).toContain('Not Found');
    expect(records[0]?.code).toBe(102);
  });

  test('reports a missing configuration file as not found', async () => {
    const result = await ctx.runner.run(['config', 'lint', '--config', 'no-such-config.yml'], { noConfig: true });

    // A missing file is NotFound (102); invalid content is Validation (2), as the tests above show.
    expect(result.exitCode).toBe(102);
    expect(result.stderr).toContain('no-such-config.yml');
  });

  test('prints a stack trace instead of the one-line message with --debug', async () => {
    // Hidden global flag (global/options.ts:47). The config is still the no-source-match one from
    // the tests above, so the run fails the same way - only the rendering differs.
    const plain = await ctx.runner.run(['config', 'lint']);
    const debug = await ctx.runner.run(['config', 'lint', '--debug']);

    expect(plain.exitCode).toBe(2);
    expect(debug.exitCode).toBe(2);

    expect(plain.stderr).not.toContain('    at ');
    expect(debug.stderr).toContain('    at ');
    // The stack carries the message on its first line, so --debug adds frames rather than
    // replacing what the plain run said.
    expect(debug.stderr).toContain('No source files found');
  });
});

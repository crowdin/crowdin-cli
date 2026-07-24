import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * The PHP suite (`CliPreTranslateTest`) drives a `pre-translate` CLI command that doesn't exist in
 * src-next - the equivalent functionality lives under the `auto-translate` command
 * (`cli/commands/auto-translate/AutoTranslateCommand.ts`). Every PHP scenario maps onto a real
 * `auto-translate` flag: `--method tm|mt`, `--engine-id`, `--auto-approve-option`, and the shared
 * `--token`/`-T` + `--project-id`/`-i` (`cli/commands/common/options.ts`, part of `filesConfigGroup`
 * which `auto-translate` also declares). Nothing needed to be dropped.
 *
 * `TranslationService.preTranslate` (`cli/services/TranslationService.ts`) is NOT fire-and-forget:
 * it calls `applyPreTranslation`, then polls `preTranslationStatus` every second until the job's
 * `status` is `finished`, only returning once the CLI has observed completion. So the exit code and
 * final "finished" message are meaningful synchronously.
 *
 * However, `output.spinner(...)` degrades to plain `output.info(...)` lines whenever `--progress` is
 * off (`cli/utils/output.ts`) - and `ctx.runner.run` always passes `--no-progress`. That means every
 * poll iteration's "Auto-translation is completed by (N%)" message becomes its own stdout line, and
 * the number of iterations depends on how long the server takes to finish the job - nondeterministic
 * across runs. Snapshotting the *whole* stdout for a successful pre-translate would therefore bake in
 * a specific iteration count that the next run has no reason to reproduce, so those tests assert the
 * deterministic markers via `toContain` instead of `toMatchSnapshot()`. The `--engine-id` validation
 * error below never reaches the poll loop at all, so it stays fully deterministic and keeps its
 * snapshot.
 */

/**
 * Every Crowdin organization ships a built-in "Crowdin Translate" MT engine (PHP's
 * `Mt::ENGINE_CROWDIN`, looked up there via a direct DB query) with no setup required, unlike the
 * third-party engines (Amazon, Microsoft, DeepL, Google) which need credentials configured first.
 * The public API only documents the engine by name, not by a stable numeric `type`, so look it up
 * that way instead of hardcoding a type id.
 */
async function getCrowdinMtEngineId(ctx: SuiteContext): Promise<number> {
  const mts = await ctx.client.machineTranslationApi.listMts();
  const crowdinEngine = mts.data.find((mt) => mt.data.name === 'Crowdin Translate');

  if (!crowdinEngine) {
    throw new Error("Could not find the built-in 'Crowdin Translate' MT engine for this test account");
  }

  return crowdinEngine.data.id;
}

/**
 * Mirrors the PHP suite's `config/crowdin_without_token.yml`: a config file with no `project_id`/
 * `api_token`, so the CLI must source those credentials entirely from `--project-id`/`--token`
 * flags (`cli/config.ts`'s `cliLayer` outranks the config file for those four keys). `copyFixtures`
 * always skips the whole fixture `config/` directory (only `config/crowdin.yml` is rendered, via
 * `setupSuite`), so a second config file can't be delivered as a fixture - write it directly into
 * the workspace instead, the same way `identity.test.ts` builds its `--identity` file.
 */
async function writeTokenlessConfig(ctx: SuiteContext): Promise<string> {
  const configPath = join(ctx.workspace, 'crowdin-without-token.yml');

  await Bun.write(
    configPath,
    [
      'base_path: "."',
      'base_url: "https://api.crowdin.com"',
      'preserve_hierarchy: false',
      '',
      'files:',
      '  - source: "/sources/*.xml"',
      '    translation: "/translations/%two_letters_code%/%original_file_name%"',
    ].join('\n'),
  );

  return configPath;
}

describe('pre-translate via auto-translate', () => {
  let ctx: SuiteContext;
  let crowdinMtEngineId: number;

  beforeAll(async () => {
    ctx = await setupSuite('pre-translate', { targetLanguageIds: ['uk'] });
    crowdinMtEngineId = await getCrowdinMtEngineId(ctx);
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // The fixture's `preserve_hierarchy: false` strips the shared "sources/" parent from the project
  // path (`getCommonPath`/`resolveProjectPath` in `UploadSourcesCommand.ts`), so the file that lands
  // in the project is named "1_android.xml" - not "sources/1_android.xml" like the local path
  // asserted above. `--file` below must match that server-side project path.
  test('pre-translates via translation memory (TM)', async () => {
    const result = await ctx.runner.run(['auto-translate', '--file', '1_android.xml', '-l', 'uk', '--method', 'tm']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain('Auto-translation is running...');
    expect(result.stdout).toContain('Auto-translation is finished (100%)');
  });

  test('requires --engine-id for the MT method', async () => {
    const result = await ctx.runner.run(['auto-translate', '-l', 'uk', '--method', 'mt']);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Machine Translation should be used with the '--engine-id' parameter");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('pre-translates via machine translation (MT) with an explicit engine id', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--file',
      '1_android.xml',
      '-l',
      'uk',
      '--method',
      'mt',
      '--engine-id',
      String(crowdinMtEngineId),
    ]);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain('Auto-translation is running...');
    expect(result.stdout).toContain('Auto-translation is finished (100%)');
  });

  test('warns when --auto-approve-option is used with the MT method', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--file',
      '1_android.xml',
      '-l',
      'uk',
      '--method',
      'mt',
      '--engine-id',
      String(crowdinMtEngineId),
      '--auto-approve-option',
      'all',
    ]);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("'--auto-approve-option' is used only for the TM Auto-Translation method");
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain('Auto-translation is finished (100%)');
  });

  test('pre-translates via TM using --token/--project-id instead of a config file', async () => {
    const configPath = await writeTokenlessConfig(ctx);

    const result = await ctx.runner.run(
      [
        'auto-translate',
        '--file',
        '1_android.xml',
        '-l',
        'uk',
        '--method',
        'tm',
        '--project-id',
        String(ctx.project.id),
        '--token',
        ctx.env.token as string,
        '--config',
        configPath,
        '--no-progress',
        '--no-colors',
      ],
      { noConfig: true },
    );

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain('Auto-translation is running...');
    expect(result.stdout).toContain('Auto-translation is finished (100%)');
  });
});

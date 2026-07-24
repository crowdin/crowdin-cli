import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * `crowdin.yml` here has no literal `project_id`/`api_token`/`base_path`/`base_url` — only the
 * `*_env` keys (see fixtures/env-variables/config/crowdin.yml). All four credential values come
 * from a workspace-root `.env` file that Bun auto-loads into `process.env` at CLI startup
 * (`cli/config.ts`'s `envKeyLayer`/`envVar`), so it has to be written with real values before any
 * command that needs them runs. `setupSuite`'s `writeConfig` only substitutes `{{projectId}}`/
 * `{{token}}` in `crowdin.yml`, so it can't populate `.env` for us.
 */
async function writeEnvFile(ctx: SuiteContext, apiToken: string): Promise<void> {
  await Bun.write(
    join(ctx.workspace, '.env'),
    [
      `TEST_PROJECT_ID_ENV=${ctx.project.id}`,
      `TEST_API_TOKEN_ENV=${apiToken}`,
      `TEST_BASE_PATH_ENV=${ctx.workspace}`,
      `TEST_BASE_URL_ENV=https://api.crowdin.com`,
    ].join('\n'),
  );
}

describe('env variables', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('env-variables', { targetLanguageIds: ['it', 'uk'] });
    await writeEnvFile(ctx, ctx.env.token as string);
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources using credentials read from an env file', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations using credentials read from an env file', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'translations/it/1_android.xml'");
    expect(result.stdout).toContain("File 'translations/it/2_android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/1_android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations using credentials read from an env file', async () => {
    // Uploaded translations already occupy translations/<lang>/<file> (same path the download
    // lands at, per the /translations/%two_letters_code%/%original_file_name% pattern) - clear it
    // first so the assertions below only see what this download produced.
    await rm(join(ctx.workspace, 'translations'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', 'translations']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/it/1_android.xml extracted');
    expect(result.stdout).toContain('File translations/it/2_android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/1_android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/2_android.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(
      ctx.workspace,
      'translations/it/1_android.xml',
      'translations/it/2_android.xml',
      'translations/uk/1_android.xml',
      'translations/uk/2_android.xml',
    );

    for (const language of ['it', 'uk']) {
      for (const file of ['1_android.xml', '2_android.xml']) {
        const downloaded = await Bun.file(join(ctx.workspace, 'translations', language, file)).text();
        const expected = await Bun.file(join(ctx.workspace, 'expected', language, file)).text();
        expect(downloaded).toBe(expected);
      }
    }
  });

  test('a process-level env var overrides an invalid token in the env file on re-upload', async () => {
    // Re-point .env at a deliberately broken token; the real token is supplied only as a
    // process-level override below, which must win for the upload to succeed.
    await writeEnvFile(ctx, 'invalid-token');

    const result = await ctx.runner.run(['upload', 'sources'], {
      env: { TEST_API_TOKEN_ENV: ctx.env.token as string },
    });

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});

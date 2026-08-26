import { join } from 'node:path';
import type { Client } from '@crowdin/crowdin-api-client';
import { CliRunner } from './cli.ts';
import { writeConfig } from './config.ts';
import type { E2eEnv } from './env.ts';
import { resolveEnv } from './env.ts';
import { createApiClient, createTestProject, deleteTestProject, type TestProject } from './project.ts';
import { copyFixtures, createWorkspace, removeWorkspace } from './workspace.ts';

/** Fixtures live at `e2e/fixtures/<suite>`, resolved relative to this helper. */
const FIXTURES_ROOT = join(import.meta.dir, '..', 'fixtures');

export interface SuiteContext {
  env: E2eEnv;
  client: Client;
  workspace: string;
  project: TestProject;
  runner: CliRunner;
}

export interface SetupSuiteOptions {
  sourceLanguageId?: string;
  targetLanguageIds?: string[];
}

/**
 * Compose the per-suite lifecycle: temp workspace, fixtures copied from
 * `e2e/fixtures/<suite>`, a fresh Crowdin project, and a rendered `crowdin.yml`
 * wired into a `CliRunner`. Call from `beforeAll` with the suite name.
 */
export async function setupSuite(suite: string, opts: SetupSuiteOptions = {}): Promise<SuiteContext> {
  const env = resolveEnv();
  const token = env.token;

  if (!token) {
    throw new Error('CROWDIN_E2E_TOKEN is not set. E2E suites require a dedicated test-account token.');
  }

  const client = createApiClient(env);
  const fixturesDir = join(FIXTURES_ROOT, suite);
  const workspace = await createWorkspace(suite);
  await copyFixtures(fixturesDir, workspace);

  const project = await createTestProject(client, {
    suite,
    sourceLanguageId: opts.sourceLanguageId,
    targetLanguageIds: opts.targetLanguageIds,
  });

  // Everything past project creation can fail; if it does, tear down what we
  // already provisioned so a partial setup doesn't orphan the project (or
  // workspace) on the real account.
  try {
    const template = await Bun.file(join(fixturesDir, 'config', 'crowdin.yml')).text();
    const configPath = await writeConfig(workspace, template, { projectId: project.id, token });

    const runner = new CliRunner({ workspace, configPath });
    return { env, client, workspace, project, runner };
  } catch (error) {
    await teardownSuite({ env, client, workspace, project });
    throw error;
  }
}

/**
 * Tear down a suite: delete the project and remove the workspace (which holds
 * everything the suite produced, including downloaded files). Honors
 * `CROWDIN_E2E_KEEP=1`. Cleanup failures are logged, never thrown, so one failed
 * deletion can't mask a real test result. Call from `afterAll`.
 */
export async function teardownSuite(
  ctx: Pick<SuiteContext, 'env' | 'client' | 'project' | 'workspace'> | undefined,
): Promise<void> {
  if (!ctx) {
    return;
  }

  if (ctx.env.keep) {
    console.log(`CROWDIN_E2E_KEEP=1 - keeping project #${ctx.project.id} (${ctx.project.name}) and ${ctx.workspace}`);
    return;
  }

  try {
    await deleteTestProject(ctx.client, ctx.project.id);
  } catch (error) {
    console.error(`Failed to delete project #${ctx.project.id}: ${error instanceof Error ? error.message : error}`);
  }

  try {
    await removeWorkspace(ctx.workspace);
  } catch (error) {
    console.error(`Failed to remove workspace ${ctx.workspace}: ${error instanceof Error ? error.message : error}`);
  }
}

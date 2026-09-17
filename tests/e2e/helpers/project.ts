import { Client, type ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { E2eEnv } from './env.ts';

export interface TestProject {
  id: number;
  name: string;
}

/**
 * Stand-in project for suites set up with `withoutProject`. The config schema requires a positive
 * `project_id` (`lib/config.ts`), so a suite whose commands never address a project still needs a
 * value in `crowdin.yml` - this is one that is obviously not a real project, and nothing sends it
 * anywhere. `teardownSuite` recognises it and has nothing to delete.
 */
export const SYNTHETIC_PROJECT_ID = 999999999;

export const SYNTHETIC_PROJECT: TestProject = {
  id: SYNTHETIC_PROJECT_ID,
  name: 'no project created for this suite',
};

function buildProjectName(suite: string, seconds: number): string {
  return `e2e-${seconds}-${suite}`;
}

export function createApiClient(env: E2eEnv): Client {
  if (!env.token) {
    throw new Error('Cannot create an API client without CROWDIN_E2E_TOKEN');
  }

  return new Client({ token: env.token });
}

export interface CreateProjectOptions {
  suite: string;
  sourceLanguageId?: string;
  targetLanguageIds?: string[];
  /** Create a strings-based project instead of the file-based default. */
  stringsBased?: boolean;
}

export async function createTestProject(client: Client, opts: CreateProjectOptions): Promise<TestProject> {
  const name = buildProjectName(opts.suite, Math.floor(Date.now() / 1000));
  const request: ProjectsGroupsModel.CreateProjectRequest = {
    name,
    identifier: name,
    sourceLanguageId: opts.sourceLanguageId ?? 'en',
    targetLanguageIds: opts.targetLanguageIds ?? ['it', 'uk'],
    // The API takes the project type as a BooleanInt, 1 being strings-based (same as
    // `project add --string-based`).
    ...(opts.stringsBased ? { type: 1 as const } : {}),
  };

  const response = await client.projectsGroupsApi.addProject(request);
  return { id: response.data.id, name: response.data.name };
}

export async function deleteTestProject(client: Client, projectId: number): Promise<void> {
  await client.projectsGroupsApi.deleteProject(projectId);
}

import { Client, type ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { E2eEnv } from './env.ts';

export interface TestProject {
  id: number;
  name: string;
}

export function buildProjectName(suite: string, seconds: number): string {
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
}

export async function createTestProject(client: Client, opts: CreateProjectOptions): Promise<TestProject> {
  const name = buildProjectName(opts.suite, Math.floor(Date.now() / 1000));
  const request: ProjectsGroupsModel.CreateProjectRequest = {
    name,
    identifier: name,
    sourceLanguageId: opts.sourceLanguageId ?? 'en',
    targetLanguageIds: opts.targetLanguageIds ?? ['it', 'uk'],
  };

  const response = await client.projectsGroupsApi.addProject(request);
  return { id: response.data.id, name: response.data.name };
}

export async function deleteTestProject(client: Client, projectId: number): Promise<void> {
  await client.projectsGroupsApi.deleteProject(projectId);
}

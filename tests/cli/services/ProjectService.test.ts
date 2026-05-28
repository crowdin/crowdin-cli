import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { ProjectService } from '@/cli/services/ProjectService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

const PROJECT_ID = 123;

const globalOptions: GlobalOptions = {
  verbose: false,
  config: '',
  colors: false,
  progress: false,
  format: 'json',
};

describe('ProjectService', () => {
  let apiClient: Client;
  let output: Output;
  let projectService: ProjectService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    output = createOutput(globalOptions);
    projectService = new ProjectService(apiClient, output, PROJECT_ID);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('isEnterprise', () => {
    test('returns false when no organization set', () => {
      expect(projectService.isEnterprise()).toBe(false);
    });

    test('returns true when organization is set', () => {
      const enterpriseClient = new Client({ token: 'a'.repeat(80), organization: 'acme' });
      const service = new ProjectService(enterpriseClient, output, PROJECT_ID);

      expect(service.isEnterprise()).toBe(true);
    });
  });

  describe('addProject', () => {
    test('calls addProject API with provided data', async () => {
      const spy = spyOn(apiClient.projectsGroupsApi, 'addProject').mockResolvedValue({
        data: { id: 77, name: 'My Project' },
      } as never);

      await projectService.addProject({
        name: 'My Project',
        identifier: 'my-project',
        sourceLanguageId: 'en',
        targetLanguageIds: ['fr', 'de'],
      });

      expect(spy).toHaveBeenCalledWith({
        name: 'My Project',
        identifier: 'my-project',
        sourceLanguageId: 'en',
        targetLanguageIds: ['fr', 'de'],
      });
    });

    test('returns the created project', async () => {
      spyOn(apiClient.projectsGroupsApi, 'addProject').mockResolvedValue({
        data: { id: 77, name: 'My Project' },
      } as never);

      const result = await projectService.addProject({
        name: 'My Project',
        identifier: 'my-project',
        sourceLanguageId: 'en',
        targetLanguageIds: [],
      });

      expect(result.data.id).toBe(77);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.projectsGroupsApi, 'addProject').mockRejectedValue(new Error('validation failed'));

      expect(
        projectService.addProject({ name: 'Bad', identifier: 'bad', sourceLanguageId: 'en', targetLanguageIds: [] }),
      ).rejects.toThrow(CliError);
    });
  });

  describe('loadProject', () => {
    test('returns project from API', async () => {
      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: PROJECT_ID, name: 'Demo' },
      } as never);

      const result = await projectService.loadProject();

      expect(result.data.id).toBe(PROJECT_ID);
    });

    test('calls API with configured projectId', async () => {
      const spy = spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: PROJECT_ID },
      } as never);

      await projectService.loadProject();

      expect(spy).toHaveBeenCalledWith(PROJECT_ID);
    });

    test('throws CliError when API fails', async () => {
      spyOn(apiClient.projectsGroupsApi, 'getProject').mockRejectedValue(new Error('not found'));

      expect(projectService.loadProject()).rejects.toThrow(CliError);
    });
  });

  describe('loadProjects', () => {
    test('returns projects list from API', async () => {
      spyOn(apiClient.projectsGroupsApi, 'listProjects').mockResolvedValue({
        data: [{ data: { id: 1, name: 'Alpha' } }, { data: { id: 2, name: 'Beta' } }],
      } as never);

      const result = await projectService.loadProjects(true);

      expect(result.data).toHaveLength(2);
    });

    test('passes hasManagerAccess=1 when true', async () => {
      const spy = spyOn(apiClient.projectsGroupsApi, 'listProjects').mockResolvedValue({
        data: [],
      } as never);

      await projectService.loadProjects(true);

      expect(spy).toHaveBeenCalledWith({ hasManagerAccess: 1 });
    });

    test('passes hasManagerAccess=0 when false', async () => {
      const spy = spyOn(apiClient.projectsGroupsApi, 'listProjects').mockResolvedValue({
        data: [],
      } as never);

      await projectService.loadProjects(false);

      expect(spy).toHaveBeenCalledWith({ hasManagerAccess: 0 });
    });

    test('throws CliError when API fails', async () => {
      spyOn(apiClient.projectsGroupsApi, 'listProjects').mockRejectedValue(new Error('forbidden'));

      expect(projectService.loadProjects(true)).rejects.toThrow(CliError);
    });
  });
});

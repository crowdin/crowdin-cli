import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Command } from 'commander';
import InitCommand from '@/cli/commands/init/InitCommand.ts';
import { createOutput } from '@/cli/utils/output.ts';

describe('InitCommand', () => {
  let previousCwd: string;
  let tempDir: string;
  const globalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    output: 'json',
    destination: 'crowdin.yml',
  };

  beforeEach(async () => {
    previousCwd = process.cwd();
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-init-command-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    await rm(tempDir, { recursive: true, force: true });
  });

  test('writes config skeleton from provided options', async () => {
    const command = new InitCommand(() => createOutput(globalOptions)) as InitCommand & Record<string, unknown>;
    const apiToken = 'a'.repeat(80);
    const destination = 'crowdin.test.yml';

    // @ts-expect-error
    command.authorizeViaBrowser = async () => {
      throw new Error('authorizeViaBrowser should not be called when token option is provided');
    };
    // @ts-expect-error
    command.isEnterprise = async () => false;
    // @ts-expect-error
    command.getAuthorizedUser = async () => ({ data: { id: 1 } });
    // @ts-expect-error
    command.selectProject = async () => ({ data: { id: 321 } });
    // @ts-expect-error
    command.writeApiToken = async () => true;

    const commandContext = {
      optsWithGlobals: () => ({
        ...globalOptions,
        destination,
        token: apiToken,
        projectId: 321,
        basePath: '/workspace/app',
        baseUrl: 'https://api.crowdin.com',
        source: '/src-next/**/*.json',
        translation: '/locale/%locale%/%original_file_name%',
        preserveHierarchy: false,
      }),
    } as Command;

    await command.defaultAction(commandContext);

    const config = await Bun.file(join(tempDir, destination)).text();

    expect(config).toContain('"project_id": "321"');
    expect(config).not.toContain('"api_token"');
    expect(config).toContain('"base_path": "/workspace/app"');
    expect(config).toContain('"base_url": "https://api.crowdin.com"');
    expect(config).toContain('"preserve_hierarchy": false');
    expect(config).toContain('"source": "/src-next/**/*.json"');
    expect(config).toContain('"translation": "/locale/%locale%/%original_file_name%"');
  });

  test('writes enterprise base url from provided organization url', async () => {
    const command = new InitCommand(() => createOutput(globalOptions)) as InitCommand & Record<string, unknown>;
    const apiToken = 'a'.repeat(80);
    const destination = 'crowdin.enterprise.yml';

    // @ts-expect-error
    command.authorizeViaBrowser = async () => {
      throw new Error('authorizeViaBrowser should not be called when token option is provided');
    };
    // @ts-expect-error
    command.isEnterprise = async () => {
      throw new Error('isEnterprise should not be called when baseUrl contains organization');
    };
    // @ts-expect-error
    command.getAuthorizedUser = async () => ({ data: { id: 1 } });
    // @ts-expect-error
    command.selectProject = async () => ({ data: { id: 987 } });
    // @ts-expect-error
    command.writeApiToken = async () => true;

    const commandContext = {
      optsWithGlobals: () => ({
        ...globalOptions,
        destination,
        token: apiToken,
        projectId: 987,
        basePath: '.',
        baseUrl: 'https://enterprise.crowdin.com',
        source: '/src-next/**/*.json',
        translation: '/locale/%locale%/%original_file_name%',
        preserveHierarchy: true,
      }),
    } as Command;

    await command.defaultAction(commandContext);

    const config = await Bun.file(join(tempDir, destination)).text();

    expect(config).toContain('"project_id": "987"');
    expect(config).toContain('"base_url": "https://enterprise.api.crowdin.com"');
  });

  test('does not overwrite existing config file', async () => {
    const globalOptions = {
      verbose: false,
      config: '',
      colors: false,
      progress: false,
      output: 'json',
      destination: 'crowdin.yml',
    };

    const command = new InitCommand(() => createOutput(globalOptions)) as InitCommand & Record<string, unknown>;
    const configPath = join(tempDir, 'crowdin.yml');

    await Bun.write(configPath, 'existing config');

    // @ts-expect-error
    command.confirmOverwrite = async () => false;
    // @ts-expect-error
    command.authorizeViaBrowser = async () => {
      throw new Error('authorizeViaBrowser should not be called when config file already exists');
    };
    // @ts-expect-error
    command.getAuthorizedUser = async () => {
      throw new Error('getAuthorizedUser should not be called when config file already exists');
    };
    // @ts-expect-error
    command.selectProject = async () => {
      throw new Error('selectProject should not be called when config file already exists');
    };

    const commandContext = {
      optsWithGlobals: () => globalOptions,
    } as Command;

    await command.defaultAction(commandContext);

    expect(await Bun.file(configPath).text()).toBe('existing config');
  });

  test('overwrites existing config file when confirmed', async () => {
    const command = new InitCommand(() => createOutput(globalOptions)) as InitCommand & Record<string, unknown>;
    const apiToken = 'a'.repeat(80);
    const configPath = join(tempDir, 'crowdin.yml');

    await Bun.write(configPath, 'existing config');

    // @ts-expect-error
    command.confirmOverwrite = async () => true;
    // @ts-expect-error
    command.isEnterprise = async () => false;
    // @ts-expect-error
    command.getAuthorizedUser = async () => ({ data: { id: 1 } });
    // @ts-expect-error
    command.selectProject = async () => ({ data: { id: 321 } });
    // @ts-expect-error
    command.writeApiToken = async () => true;

    const commandContext = {
      optsWithGlobals: () => ({
        ...globalOptions,
        token: apiToken,
        projectId: 321,
        basePath: '.',
        baseUrl: 'https://api.crowdin.com',
        source: '/src-next/**/*.json',
        translation: '/locale/%locale%/%original_file_name%',
        preserveHierarchy: false,
      }),
    } as Command;

    await command.defaultAction(commandContext);

    const config = await Bun.file(configPath).text();

    expect(config).not.toBe('existing config');
    expect(config).toContain('"project_id": "321"');
  });

  test('reuses saved token when confirmed', async () => {
    const command = new InitCommand(() => createOutput(globalOptions)) as InitCommand & Record<string, unknown>;
    const destination = 'crowdin.saved.yml';

    // @ts-expect-error
    command.readSavedToken = async () => 's'.repeat(80);
    // @ts-expect-error
    command.confirmUseSavedToken = async () => true;
    // @ts-expect-error
    command.authorizeViaBrowser = async () => {
      throw new Error('authorizeViaBrowser should not be called when a saved token is reused');
    };
    // @ts-expect-error
    command.getToken = async () => {
      throw new Error('getToken should not be called when a saved token is reused');
    };
    // @ts-expect-error
    command.isEnterprise = async () => false;
    // @ts-expect-error
    command.getAuthorizedUser = async () => ({ data: { id: 1 } });
    // @ts-expect-error
    command.selectProject = async () => ({ data: { id: 555 } });
    // @ts-expect-error
    command.writeApiToken = async () => true;

    const commandContext = {
      optsWithGlobals: () => ({
        ...globalOptions,
        destination,
        projectId: 555,
        basePath: '.',
        baseUrl: 'https://api.crowdin.com',
        source: '/src-next/**/*.json',
        translation: '/locale/%locale%/%original_file_name%',
        preserveHierarchy: false,
      }),
    } as Command;

    await command.defaultAction(commandContext);

    const config = await Bun.file(join(tempDir, destination)).text();

    expect(config).toContain('"project_id": "555"');
  });

  test('skips the enterprise prompt after browser authorization', async () => {
    const command = new InitCommand(() => createOutput(globalOptions)) as InitCommand & Record<string, unknown>;
    const destination = 'crowdin.browser.yml';

    // @ts-expect-error
    command.readSavedToken = async () => undefined;
    // crowdin.com token: JWT carries no domain, so the org is known to be non-enterprise.
    // @ts-expect-error
    command.authorizeViaBrowser = async () => ({ accessToken: 'b'.repeat(80), domain: null });
    // @ts-expect-error
    command.isEnterprise = async () => {
      throw new Error('isEnterprise should not be called after browser authorization');
    };
    // @ts-expect-error
    command.getToken = async () => {
      throw new Error('getToken should not be called after browser authorization');
    };
    // @ts-expect-error
    command.getAuthorizedUser = async () => ({ data: { id: 1 } });
    // @ts-expect-error
    command.selectProject = async () => ({ data: { id: 777 } });
    // @ts-expect-error
    command.writeApiToken = async () => true;

    const commandContext = {
      optsWithGlobals: () => ({
        ...globalOptions,
        destination,
        projectId: 777,
        basePath: '.',
        baseUrl: 'https://api.crowdin.com',
        source: '/src-next/**/*.json',
        translation: '/locale/%locale%/%original_file_name%',
        preserveHierarchy: false,
      }),
    } as Command;

    await command.defaultAction(commandContext);

    const config = await Bun.file(join(tempDir, destination)).text();

    expect(config).toContain('"project_id": "777"');
    expect(config).toContain('"base_url": "https://api.crowdin.com"');
  });

  test('fails when no projects with manager access exist', async () => {
    const command = new InitCommand(() => createOutput(globalOptions)) as InitCommand & Record<string, unknown>;
    const apiClient = {
      projectsGroupsApi: {
        withFetchAll: () => ({ listProjects: async () => ({ data: [] }) }),
      },
    };

    // @ts-expect-error - exercising the private selectProject with a stub client
    const promise = command.selectProject(apiClient, { ...globalOptions }, createOutput(globalOptions));

    await expect(promise).rejects.toThrow('No projects with manager access found');
  });
});

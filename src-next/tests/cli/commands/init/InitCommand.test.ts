import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import InitCommand from '../../../../src/cli/commands/init/InitCommand.ts';
import { createOutput } from '../../../../src/cli/utils/output.ts';
import type { Command } from 'commander';

describe('InitCommand', () => {
  let previousCwd: string;
  let tempDir: string;

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
    const command = new InitCommand(() => createOutput('json')) as InitCommand & Record<string, unknown>;
    const apiToken = 'a'.repeat(80);
    const destination = 'crowdin.test.yml';

    // @ts-expect-error
    command.authorizeViaBrowser = async () => {
      throw new Error('authorizeViaBrowser should not be called when token option is provided');
    };
    // @ts-expect-error
    command.getAuthorizedUser = async () => ({ data: { id: 1 } });
    // @ts-expect-error
    command.selectProject = async () => ({ data: { id: 321 } });

    const commandContext = {
      optsWithGlobals: () => ({
        verbose: false,
        config: '',
        noColors: false,
        noProgress: false,
        format: 'text',
        destination,
        token: apiToken,
        projectId: 321,
        basePath: '/workspace/app',
        baseUrl: 'https://api.crowdin.com',
        source: '/src/**/*.json',
        translation: '/locale/%locale%/%original_file_name%',
        preserveHierarchy: false,
      }),
    } as Command;

    await command.defaultAction(commandContext);

    const config = await Bun.file(join(tempDir, destination)).text();

    expect(config).toContain('"project_id": "321"');
    expect(config).toContain(`"api_token": "${apiToken}"`);
    expect(config).toContain('"base_path": "/workspace/app"');
    expect(config).toContain('"base_url": "https://api.crowdin.com"');
    expect(config).toContain('"preserve_hierarchy": false');
    expect(config).toContain('"source": "/src/**/*.json"');
    expect(config).toContain('"translation": "/locale/%locale%/%original_file_name%"');
  });

  test('does not overwrite existing config file', async () => {
    const command = new InitCommand(() => createOutput('json')) as InitCommand & Record<string, unknown>;
    const configPath = join(tempDir, 'crowdin.yml');

    await Bun.write(configPath, 'existing config');

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
      optsWithGlobals: () => ({
        verbose: false,
        config: '',
        noColors: false,
        noProgress: false,
        format: 'text',
        destination: 'crowdin.yml',
      }),
    } as Command;

    await command.defaultAction(commandContext);

    expect(await Bun.file(configPath).text()).toBe('existing config');
  });
});

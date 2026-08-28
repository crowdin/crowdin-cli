import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os, { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Command } from 'commander';
import { load as loadYaml } from 'js-yaml';
import LoginCommand from '@/cli/commands/login/LoginCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import { createOutput } from '@/cli/utils/output.ts';
import { DEFAULT_IDENTITY_FILE, getIdentityFilePath } from '@/lib/identityFiles.ts';

describe('LoginCommand', () => {
  const globalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    output: 'json',
  };

  let home: string;
  let homedir: ReturnType<typeof spyOn<typeof os, 'homedir'>>;

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), 'crowdin-login-command-'));
    homedir = spyOn(os, 'homedir').mockReturnValue(home);
  });

  afterEach(async () => {
    // The spy patches the shared module namespace, so leaving it in place breaks every later file.
    homedir.mockRestore();
    await rm(home, { recursive: true, force: true });
  });

  function createCommand(options: Record<string, unknown>) {
    const merged = { ...globalOptions, ...options };
    const command = new LoginCommand(() => createOutput(merged)) as LoginCommand & Record<string, unknown>;
    const commandContext = { optsWithGlobals: () => merged } as unknown as Command;

    return { command, commandContext };
  }

  async function readIdentityFile(): Promise<Record<string, unknown>> {
    return loadYaml(await Bun.file(getIdentityFilePath(DEFAULT_IDENTITY_FILE)).text()) as Record<string, unknown>;
  }

  test('saves the provided token without opening a browser', async () => {
    const { command, commandContext } = createCommand({ token: 'provided-token' });

    // @ts-expect-error
    command.authorizeViaBrowser = async () => {
      throw new Error('authorizeViaBrowser should not be called when token option is provided');
    };
    // @ts-expect-error
    command.getAuthorizedUser = async () => ({ data: { id: 1, username: 'agent' } });

    await command.defaultAction(commandContext);

    // The default base url is what every command falls back to, so it is not written out.
    expect(await readIdentityFile()).toEqual({ api_token: 'provided-token' });
  });

  test('persists the Enterprise base url derived from the browser authorization', async () => {
    const { command, commandContext } = createCommand({});

    // @ts-expect-error
    command.authorizeViaBrowser = async () => ({ accessToken: 'browser-token', domain: 'acme' });
    // @ts-expect-error
    command.getAuthorizedUser = async () => ({ data: { id: 2, username: 'agent' } });

    await command.defaultAction(commandContext);

    expect(await readIdentityFile()).toEqual({
      api_token: 'browser-token',
      base_url: 'https://acme.api.crowdin.com',
    });
  });

  test('keeps an explicit --base-url over the domain the token carries', async () => {
    const { command, commandContext } = createCommand({ baseUrl: 'https://acme.crowdin.dev/api/v2' });

    // @ts-expect-error
    command.authorizeViaBrowser = async () => ({ accessToken: 'browser-token', domain: 'other' });
    // @ts-expect-error
    command.getAuthorizedUser = async () => ({ data: { id: 3, username: 'agent' } });

    await command.defaultAction(commandContext);

    expect(await readIdentityFile()).toEqual({
      api_token: 'browser-token',
      base_url: 'https://acme.crowdin.dev/api/v2',
    });
  });

  test('prints the user and the identity file as one plain line', async () => {
    const { command, commandContext } = createCommand({ token: 'provided-token', output: 'plain' });
    const log = spyOn(console, 'log');

    // @ts-expect-error
    command.getAuthorizedUser = async () => ({ data: { id: 5, username: 'agent' } });

    try {
      await command.defaultAction(commandContext);

      expect(log).toHaveBeenCalledWith(`agent ${getIdentityFilePath(DEFAULT_IDENTITY_FILE)}`);
    } finally {
      log.mockRestore();
    }
  });

  test('fails when the credentials cannot be written', async () => {
    const { command, commandContext } = createCommand({ token: 'provided-token' });

    // @ts-expect-error
    command.getAuthorizedUser = async () => ({ data: { id: 4, username: 'agent' } });
    // @ts-expect-error
    command.writeCredentials = async () => false;

    expect(command.defaultAction(commandContext)).rejects.toThrow(CliError);
  });
});

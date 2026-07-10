import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';
import type { Command } from 'commander';
import { createGetConfig } from '@/cli/config.ts';
import NotFoundError from '@/cli/errors/NotFoundError.ts';
import ValidationError from '@/cli/errors/ValidationError.ts';
import type { ConfigOptions, GlobalOptions } from '@/cli/options.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

const TOKEN = 'a'.repeat(80);
const ALT_TOKEN = 'b'.repeat(80);
const HOME_TOKEN = 'h'.repeat(80);

const CONFIG_YAML = [
  'project_id: 111',
  `api_token: "${TOKEN}"`,
  'base_url: https://api.crowdin.com',
  'files:',
  '  - source: /src/**/*.json',
  '    translation: /l10n/%two_letters_code%/%original_file_name%',
  '',
].join('\n');

describe('createGetConfig', () => {
  let tempDir: string;
  let homeDir: string;
  let configPath: string;
  let output: Output;

  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    output: 'json',
  };

  const makeCommand = (options: Partial<GlobalOptions & ConfigOptions>): Command =>
    ({
      optsWithGlobals: () => ({ ...globalOptions, config: configPath, ...options }),
    }) as unknown as Command;

  const getConfig = () => createGetConfig(() => output);

  beforeEach(async () => {
    tempDir = await mkdtemp(join(os.tmpdir(), 'crowdin-config-'));
    homeDir = join(tempDir, 'home');
    await mkdir(homeDir);
    configPath = join(tempDir, 'crowdin.yml');
    await Bun.write(configPath, CONFIG_YAML);

    // Point home away from the real ~/.crowdin.yml so token-file discovery is isolated.
    spyOn(os, 'homedir').mockReturnValue(homeDir);

    output = createOutput(globalOptions);
    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('loads and parses the config file', async () => {
    const config = await getConfig()(makeCommand({}));

    expect(config.projectId).toBe(111);
    expect(config.apiToken).toBe(TOKEN);
    expect(config.baseUrl).toBe('https://api.crowdin.com');
    expect(config.files).toHaveLength(1);
  });

  test("keeps the config file's base_url when --base-url is not passed", async () => {
    // Regression: the --base-url option must not carry a default, or it would always
    // clobber the config file's enterprise base_url and route requests to api.crowdin.com.
    await Bun.write(
      configPath,
      CONFIG_YAML.replace('base_url: https://api.crowdin.com', 'base_url: https://acme.crowdin.com'),
    );

    const config = await getConfig()(makeCommand({}));

    expect(config.baseUrl).toBe('https://acme.crowdin.com');
  });

  test('defaults base_url to api.crowdin.com when the config omits it', async () => {
    await Bun.write(configPath, CONFIG_YAML.replace('base_url: https://api.crowdin.com\n', ''));

    const config = await getConfig()(makeCommand({}));

    expect(config.baseUrl).toBe('https://api.crowdin.com');
  });

  test('CLI overrides win over config file values', async () => {
    const config = await getConfig()(
      makeCommand({ token: ALT_TOKEN, projectId: 222, basePath: '/tmp/base', baseUrl: 'https://acme.crowdin.com' }),
    );

    expect(config.apiToken).toBe(ALT_TOKEN);
    expect(config.projectId).toBe(222);
    expect(config.basePath).toBe('/tmp/base');
    expect(config.baseUrl).toBe('https://acme.crowdin.com');
  });

  test('identity file overrides config file values', async () => {
    const identityPath = join(tempDir, 'identity.yml');
    await Bun.write(identityPath, `api_token: "${ALT_TOKEN}"\nproject_id: 333\n`);

    const config = await getConfig()(makeCommand({ identity: identityPath }));

    expect(config.apiToken).toBe(ALT_TOKEN);
    expect(config.projectId).toBe(333);
  });

  test('CLI token wins over identity file token', async () => {
    const identityPath = join(tempDir, 'identity.yml');
    await Bun.write(identityPath, `api_token: "${ALT_TOKEN}"\n`);

    const config = await getConfig()(makeCommand({ identity: identityPath, token: HOME_TOKEN }));

    expect(config.apiToken).toBe(HOME_TOKEN);
  });

  test('picks up the api token from ~/.crowdin.yml', async () => {
    // Config file with no api_token so the home token file is the only source.
    await Bun.write(configPath, CONFIG_YAML.replace(`api_token: "${TOKEN}"\n`, ''));
    await Bun.write(join(homeDir, '.crowdin.yml'), `api_token: "${HOME_TOKEN}"\n`);

    const config = await getConfig()(makeCommand({}));

    expect(config.apiToken).toBe(HOME_TOKEN);
  });

  test('prefers .crowdin.yml over .crowdin.yaml when both exist', async () => {
    await Bun.write(configPath, CONFIG_YAML.replace(`api_token: "${TOKEN}"\n`, ''));
    await Bun.write(join(homeDir, '.crowdin.yml'), `api_token: "${HOME_TOKEN}"\n`);
    await Bun.write(join(homeDir, '.crowdin.yaml'), `api_token: "${ALT_TOKEN}"\n`);

    const config = await getConfig()(makeCommand({}));

    expect(config.apiToken).toBe(HOME_TOKEN);
  });

  test('throws NotFoundError when the identity file is missing', async () => {
    await expect(getConfig()(makeCommand({ identity: join(tempDir, 'nope.yml') }))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  test('--source and --translation build a single-file override', async () => {
    const config = await getConfig()(
      makeCommand({ source: '/only/*.md', translation: '/tr/%two_letters_code%/%original_file_name%' }),
    );

    expect(config.files).toHaveLength(1);
    expect(config.files[0]?.source).toBe('/only/*.md');
    expect(config.files[0]?.translation).toBe('/tr/%two_letters_code%/%original_file_name%');
  });

  test('--dest folds into the single-file override and forces preserve_hierarchy', async () => {
    const config = await getConfig()(
      makeCommand({
        source: '/only/*.md',
        translation: '/tr/%two_letters_code%/%original_file_name%',
        destination: '/dest',
      }),
    );

    expect(config.preserveHierarchy).toBe(true);
    expect(config.files[0]?.dest).toBe('/dest');
  });

  test('rejects an invalid merged config with a ValidationError', async () => {
    // A base_url override off the crowdin.com host fails ConfigSchema; the config-layer
    // safeParse must surface it as a ValidationError (exit 2).
    await expect(getConfig()(makeCommand({ baseUrl: 'https://evil.example.com' }))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  test('caches by config path within one factory instance', async () => {
    const load = getConfig();
    const first = await load(makeCommand({}));

    // Mutate the file; a cached read must still return the original project id.
    await Bun.write(configPath, CONFIG_YAML.replace('project_id: 111', 'project_id: 999'));
    const second = await load(makeCommand({}));

    expect(first.projectId).toBe(111);
    expect(second.projectId).toBe(111);
  });
});

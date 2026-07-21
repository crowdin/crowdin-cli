import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import { join, resolve } from 'node:path';
import { Command } from 'commander';
import { buildOption } from '@/cli/builder.ts';
import { filesConfigGroup } from '@/cli/commands/common/options.ts';
import { createGetConfig } from '@/cli/config.ts';
import NotFoundError from '@/cli/errors/NotFoundError.ts';
import type { ConfigOptions, GlobalOptions } from '@/cli/options.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';
import InvalidConfigurationError from '@/lib/config/errors/InvalidConfigurationError.ts';

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

  // `options` mirrors commander's own list: getConfig reads it to tell the config tier apart
  // (--source marks the files tier, --project-id the project tier), so a bare fake is not enough.
  const makeCommand = (options: Partial<GlobalOptions & ConfigOptions>, declared: string[] = []): Command =>
    ({
      optsWithGlobals: () => ({ ...globalOptions, config: configPath, ...options }),
      options: declared.map((name) => ({ attributeName: () => name })),
    }) as unknown as Command;

  const getConfig = () => createGetConfig(() => output).getConfig;

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
    // the --base-url option must not carry a default, or it would always
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
    const cliBasePath = join(tempDir, 'cli-base');
    await mkdir(cliBasePath);

    const config = await getConfig()(
      makeCommand({ token: ALT_TOKEN, projectId: 222, basePath: cliBasePath, baseUrl: 'https://acme.crowdin.com' }),
    );

    expect(config.apiToken).toBe(ALT_TOKEN);
    expect(config.projectId).toBe(222);
    expect(config.basePath).toBe(resolve(tempDir, cliBasePath)); // an absolute path stands on its own
    expect(config.baseUrl).toBe('https://acme.crowdin.com');
  });

  test('identity file overrides config file values', async () => {
    const identityPath = join(tempDir, 'identity.yml');
    await Bun.write(identityPath, `api_token: "${ALT_TOKEN}"\nproject_id: 333\n`);

    const config = await getConfig()(makeCommand({ identity: identityPath }));

    expect(config.apiToken).toBe(ALT_TOKEN);
    expect(config.projectId).toBe(333);
  });

  test('identity file supplies all four credential fields, not just the token', async () => {
    const identityPath = join(tempDir, 'identity.yml');
    const identityBasePath = join(tempDir, 'id-base');
    await mkdir(identityBasePath);
    await Bun.write(
      identityPath,
      `api_token: "${ALT_TOKEN}"\nproject_id: 444\nbase_url: https://acme.crowdin.com\nbase_path: ${identityBasePath}\n`,
    );

    const config = await getConfig()(makeCommand({ identity: identityPath }));

    expect(config.apiToken).toBe(ALT_TOKEN);
    expect(config.projectId).toBe(444);
    expect(config.baseUrl).toBe('https://acme.crowdin.com');
    expect(config.basePath).toBe(resolve(tempDir, identityBasePath)); // an absolute path stands on its own
  });

  test('identity file resolves `*_env` keys', async () => {
    const identityPath = join(tempDir, 'identity.yml');
    await Bun.write(identityPath, 'api_token_env: MY_TOKEN\n');
    process.env.MY_TOKEN = ALT_TOKEN;

    try {
      const config = await getConfig()(makeCommand({ identity: identityPath }));
      expect(config.apiToken).toBe(ALT_TOKEN);
    } finally {
      delete process.env.MY_TOKEN;
    }
  });

  test('default ~/.crowdin.yml supplies more than the token (project_id too)', async () => {
    await Bun.write(configPath, CONFIG_YAML.replace('project_id: 111\n', '').replace(`api_token: "${TOKEN}"\n`, ''));
    await Bun.write(join(homeDir, '.crowdin.yml'), `api_token: "${HOME_TOKEN}"\nproject_id: 666\n`);

    const config = await getConfig()(makeCommand({}));

    expect(config.apiToken).toBe(HOME_TOKEN);
    expect(config.projectId).toBe(666);
  });

  test('an explicit --identity suppresses the default ~/.crowdin.yml (single identity slot)', async () => {
    // Home file has a token; --identity file does not. Config has no token. Java uses only the
    // explicit identity file, so the home token is never picked up.
    await Bun.write(configPath, CONFIG_YAML.replace(`api_token: "${TOKEN}"\n`, ''));
    await Bun.write(join(homeDir, '.crowdin.yml'), `api_token: "${HOME_TOKEN}"\n`);
    const identityPath = join(tempDir, 'identity.yml');
    await Bun.write(identityPath, 'project_id: 333\n');

    const config = await getConfig()(makeCommand({ identity: identityPath }));

    expect(config.projectId).toBe(333); // from --identity
    expect(config.apiToken).toBeUndefined(); // home token NOT applied
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
        dest: '/dest',
      }),
    );

    expect(config.preserveHierarchy).toBe(true);
    expect(config.files[0]?.dest).toBe('/dest');
  });

  test('throws when only one of --source/--translation is given', async () => {
    await expect(getConfig()(makeCommand({ source: '/only/*.md' }))).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  test('throws when --dest is given without --source and --translation', async () => {
    await expect(getConfig()(makeCommand({ dest: '/dest' }))).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  test('rejects an invalid merged config with an InvalidConfigurationError', async () => {
    // A base_url override off the crowdin.com host fails ConfigSchema; assembleConfig must
    // surface it as an InvalidConfigurationError (exit 2).
    await expect(getConfig()(makeCommand({ baseUrl: 'https://evil.example.com' }))).rejects.toBeInstanceOf(
      InvalidConfigurationError,
    );
  });

  test('resolves credentials from CROWDIN_* env vars when the config file omits them', async () => {
    // Config file with no project_id / api_token: the whole credential set comes from the
    // environment. Proves validation runs after env resolution, not before (Java parity).
    await Bun.write(
      configPath,
      ['files:', '  - source: /src/**/*.json', '    translation: /l10n/%locale%/%original_file_name%', ''].join('\n'),
    );
    process.env.CROWDIN_PROJECT_ID = '555';
    process.env.CROWDIN_PERSONAL_TOKEN = ALT_TOKEN;

    try {
      const config = await getConfig()(makeCommand({}));
      expect(config.projectId).toBe(555);
      expect(config.apiToken).toBe(ALT_TOKEN);
    } finally {
      delete process.env.CROWDIN_PROJECT_ID;
      delete process.env.CROWDIN_PERSONAL_TOKEN;
    }
  });

  test('CLI options win over CROWDIN_* env vars', async () => {
    process.env.CROWDIN_PROJECT_ID = '555';

    try {
      const config = await getConfig()(makeCommand({ projectId: 222 }));
      expect(config.projectId).toBe(222);
    } finally {
      delete process.env.CROWDIN_PROJECT_ID;
    }
  });

  test('resolves credentials from the variable named by a `*_env` config key', async () => {
    await Bun.write(
      configPath,
      [
        'project_id_env: MY_PROJECT',
        'api_token_env: MY_TOKEN',
        'files:',
        '  - source: /src/**/*.json',
        '    translation: /l10n/%locale%/%original_file_name%',
        '',
      ].join('\n'),
    );
    process.env.MY_PROJECT = '777';
    process.env.MY_TOKEN = ALT_TOKEN;

    try {
      const config = await getConfig()(makeCommand({}));
      expect(config.projectId).toBe(777);
      expect(config.apiToken).toBe(ALT_TOKEN);
    } finally {
      delete process.env.MY_PROJECT;
      delete process.env.MY_TOKEN;
    }
  });

  test('a `*_env` key wins over a literal key set in the same file (Java parity)', async () => {
    await Bun.write(
      configPath,
      [
        'project_id: 111',
        'project_id_env: MY_PROJECT',
        `api_token: "${TOKEN}"`,
        'files:',
        '  - source: /src/**/*.json',
        '    translation: /l10n/%locale%/%original_file_name%',
        '',
      ].join('\n'),
    );
    process.env.MY_PROJECT = '888';

    try {
      const config = await getConfig()(makeCommand({}));
      expect(config.projectId).toBe(888);
    } finally {
      delete process.env.MY_PROJECT;
    }
  });

  test('a literal config value wins over a CROWDIN_* env var', async () => {
    // CONFIG_YAML sets project_id: 111 literally; the env fallback must not override it.
    process.env.CROWDIN_PROJECT_ID = '555';

    try {
      const config = await getConfig()(makeCommand({}));
      expect(config.projectId).toBe(111);
    } finally {
      delete process.env.CROWDIN_PROJECT_ID;
    }
  });

  test('resolves a relative base_path against the config file directory', async () => {
    await mkdir(join(tempDir, 'sub'));
    await Bun.write(configPath, `${CONFIG_YAML}base_path: ./sub\n`);

    const config = await getConfig()(makeCommand({}));

    expect(config.basePath).toBe(join(tempDir, 'sub'));
  });

  test('expands a leading ~ in base_path to the home directory', async () => {
    await mkdir(join(homeDir, 'l10n'));
    await Bun.write(configPath, `${CONFIG_YAML}base_path: ~/l10n\n`);

    const config = await getConfig()(makeCommand({}));

    expect(config.basePath).toBe(join(homeDir, 'l10n')); // homedir is mocked to homeDir
  });

  test('reports a base_path that does not exist', async () => {
    await Bun.write(configPath, `${CONFIG_YAML}base_path: ./nope\n`);

    const promise = getConfig()(makeCommand({}));

    expect(promise).rejects.toThrow(/The base path .*nope was not found/);
  });

  test('reports a base_path that is a file, not a directory', async () => {
    await Bun.write(join(tempDir, 'a-file'), 'x');
    await Bun.write(configPath, `${CONFIG_YAML}base_path: ./a-file\n`);

    const promise = getConfig()(makeCommand({}));

    expect(promise).rejects.toThrow(/should be a directory/);
  });

  // Java collects every config problem into one ValidationException instead of failing on the first,
  // so a single run tells you everything to fix (BaseProperties/ProjectProperties.checkProperties).
  test('reports a bad base_path and a missing project_id together', async () => {
    await Bun.write(configPath, `api_token: "${TOKEN}"\nbase_path: ./nope\n`);

    const promise = getConfig()(makeCommand({}, ['projectId']));

    expect(promise).rejects.toThrow(
      /Configuration file is invalid[\s\S]*was not found[\s\S]*Required option 'project_id' is missing/,
    );
  });

  // The project tier is the command's declared option set: no --project-id, no requirement
  // (Java runs glossary/tm on BaseProperties, which has no project_id at all).
  test('does not require project_id for a command that does not declare it', async () => {
    await Bun.write(configPath, `api_token: "${TOKEN}"\n`);

    const config = await getConfig()(makeCommand({}));

    expect(config.projectId).toBeUndefined();
    expect(config.apiToken).toBe(TOKEN);
  });

  test('resolves the default base_path (.) to the config file directory', async () => {
    const config = await getConfig()(makeCommand({}));

    expect(config.basePath).toBe(tempDir);
  });

  test('falls back to crowdin.yaml when --config is omitted and crowdin.yml is absent', async () => {
    // makeCommand passes an explicit config path; drop it so resolution scans the cwd instead.
    const cwd = process.cwd();
    spyOn(process, 'cwd').mockReturnValue(tempDir);
    await rm(configPath, { force: true }); // remove crowdin.yml
    await Bun.write(join(tempDir, 'crowdin.yaml'), CONFIG_YAML);

    try {
      const config = await getConfig()({
        optsWithGlobals: () => ({ ...globalOptions, config: '' }),
        options: [],
      } as unknown as Command);
      expect(config.projectId).toBe(111);
    } finally {
      spyOn(process, 'cwd').mockReturnValue(cwd);
    }
  });

  test('loads export_languages and pseudo_localization from the config file', async () => {
    await Bun.write(
      configPath,
      [
        'project_id: 111',
        `api_token: "${TOKEN}"`,
        'export_languages: ["fr", "es"]',
        'pseudo_localization:',
        '  length_correction: 10',
        '  prefix: "["',
        '  suffix: "]"',
        '  character_transformation: cyrillic',
        'files:',
        '  - source: /src/**/*.json',
        '    translation: /l10n/%locale%/%original_file_name%',
        '',
      ].join('\n'),
    );

    const config = await getConfig()(makeCommand({}));

    expect(config.exportLanguages).toEqual(['fr', 'es']);
    expect(config.pseudoLocalization).toEqual({
      length_correction: 10,
      prefix: '[',
      suffix: ']',
      character_transformation: 'cyrillic',
    });
  });

  test('rejects an out-of-bounds pseudo_localization length_correction', async () => {
    await Bun.write(
      configPath,
      [
        'project_id: 111',
        `api_token: "${TOKEN}"`,
        'pseudo_localization:',
        '  length_correction: 200',
        'files:',
        '  - source: /src/**/*.json',
        '    translation: /l10n/%locale%/%original_file_name%',
        '',
      ].join('\n'),
    );

    await expect(getConfig()(makeCommand({}))).rejects.toBeInstanceOf(InvalidConfigurationError);
  });

  test('rejects a file that sets both skip_untranslated_strings and skip_untranslated_files', async () => {
    await Bun.write(
      configPath,
      [
        'project_id: 111',
        `api_token: "${TOKEN}"`,
        'files:',
        '  - source: /src/**/*.json',
        '    translation: /l10n/%locale%/%original_file_name%',
        '    skip_untranslated_strings: true',
        '    skip_untranslated_files: true',
        '',
      ].join('\n'),
    );

    await expect(getConfig()(makeCommand({}))).rejects.toThrow(
      'You cannot skip strings and files at the same time. Please use one of these parameters instead.',
    );
  });

  // `--no-preserve-hierarchy` is a negatable flag, and commander decides its resolved value: a
  // negation-only option silently defaults to `true`, which used to overwrite `preserve_hierarchy`
  // from the config file on every run. The fake command elsewhere in this file cannot catch that, so
  // these parse real argv through a real Command built from the shipped option definitions.
  describe('preserve_hierarchy', () => {
    const resolve = async (configured: boolean, argv: string[]): Promise<boolean> => {
      await Bun.write(configPath, `${CONFIG_YAML}preserve_hierarchy: ${configured}\n`);

      const command = new Command('sources');

      for (const option of filesConfigGroup.options) {
        command.addOption(buildOption(option));
      }

      command.addOption(buildOption({ name: 'config', type: 'string', description: '' }));

      let preserveHierarchy: boolean | undefined;
      command.action(async () => {
        preserveHierarchy = (await getConfig()(command)).preserveHierarchy;
      });
      await command.parseAsync(['--config', configPath, ...argv], { from: 'user' });

      return preserveHierarchy as boolean;
    };

    test('keeps the configured value when neither flag is passed', async () => {
      expect(await resolve(false, [])).toBe(false);
      expect(await resolve(true, [])).toBe(true);
    });

    test('lets an explicit flag override the configured value', async () => {
      expect(await resolve(true, ['--no-preserve-hierarchy'])).toBe(false);
      expect(await resolve(false, ['--preserve-hierarchy'])).toBe(true);
    });
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

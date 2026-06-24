import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import ConfigCommand from '@/cli/commands/config/ConfigCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { LanguageService } from '@/cli/services/LanguageService.ts';
import { ProjectService } from '@/cli/services/ProjectService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';
import { type Config, ConfigSchema } from '@/lib/config.ts';

const globalOptions: GlobalOptions = {
  verbose: false,
  config: '',
  colors: false,
  progress: false,
  output: 'json',
};

const createCommandContext = (options: GlobalOptions & { config: string }) => {
  return {
    optsWithGlobals: () => options,
    args: [],
  } as unknown as Command;
};

function configYaml(languagesMapping?: Record<string, Record<string, string>>): string {
  const mapping = languagesMapping
    ? `\n    languages_mapping:\n${Object.entries(languagesMapping)
        .map(
          ([placeholder, codes]) =>
            `      ${placeholder}:\n${Object.entries(codes)
              .map(([code, value]) => `        ${code}: ${value}`)
              .join('\n')}`,
        )
        .join('\n')}`
    : '';

  return [
    'project_id: 123',
    `api_token: ${'a'.repeat(80)}`,
    'base_url: https://api.crowdin.com',
    'files:',
    '  - source: /src/*.json',
    '    translation: /locale/%two_letters_code%/%original_file_name%',
  ]
    .join('\n')
    .concat(mapping);
}

describe('ConfigCommand lint', () => {
  let apiClient: Client;
  let output: Output;
  let projectService: ProjectService;
  let languageService: LanguageService;
  let tempDir: string;

  beforeEach(async () => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    output = createOutput(globalOptions);
    projectService = new ProjectService(apiClient, output, 123);
    languageService = new LanguageService(apiClient);
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-config-command-'));

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
  });

  const createConfigCommand = () =>
    new ConfigCommand(
      async () => {
        throw new Error('getConfig is not used by lint');
      },
      () => output,
      async () => projectService,
      async () => languageService,
    );

  const writeConfig = async (languagesMapping?: Record<string, Record<string, string>>) => {
    const configPath = join(tempDir, 'crowdin.yml');
    await Bun.write(configPath, configYaml(languagesMapping));
    return configPath;
  };

  test('passes when every languages_mapping code is a supported Crowdin language', async () => {
    const supported = spyOn(languageService, 'listSupportedLanguages').mockResolvedValue([
      { id: 'uk' },
      { id: 'fr' },
    ] as never);
    const success = spyOn(output, 'success');
    const configPath = await writeConfig({ two_letters_code: { uk: 'ua' } });

    await createConfigCommand().lintAction(createCommandContext({ ...globalOptions, config: configPath }));

    expect(supported).toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('Configuration file looks good');
  });

  test('fails when a languages_mapping code is not a supported Crowdin language', async () => {
    spyOn(languageService, 'listSupportedLanguages').mockResolvedValue([{ id: 'uk' }] as never);
    const configPath = await writeConfig({ two_letters_code: { xx: 'zz' } });

    const promise = createConfigCommand().lintAction(createCommandContext({ ...globalOptions, config: configPath }));

    await expect(promise).rejects.toBeInstanceOf(CliError);
    await expect(promise).rejects.toThrow('https://developer.crowdin.com/language-codes');
  });

  test('skips the supported-languages API call when no file declares languages_mapping', async () => {
    const supported = spyOn(languageService, 'listSupportedLanguages').mockResolvedValue([] as never);
    const success = spyOn(output, 'success');
    const configPath = await writeConfig();

    await createConfigCommand().lintAction(createCommandContext({ ...globalOptions, config: configPath }));

    expect(supported).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('Configuration file looks good');
  });
});

describe('ConfigCommand sources', () => {
  let apiClient: Client;
  let output: Output;
  let projectService: ProjectService;
  let languageService: LanguageService;
  let tempDir: string;

  beforeEach(async () => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    output = createOutput(globalOptions);
    projectService = new ProjectService(apiClient, output, 123);
    languageService = new LanguageService(apiClient);
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-config-sources-'));

    spyOn(projectService, 'loadProject').mockResolvedValue({} as never);
    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});

    await Bun.write(join(tempDir, 'src/foo/a.json'), '{}');
    await Bun.write(join(tempDir, 'src/bar/b.json'), '{}');
  });

  afterEach(() => {
    mock.restore();
  });

  const buildConfig = (overrides: Record<string, unknown> = {}): Config =>
    ConfigSchema.parse({
      projectId: 123,
      apiToken: 'a'.repeat(80),
      basePath: tempDir,
      baseUrl: 'https://api.crowdin.com',
      files: [{ source: '/**/*.json', translation: '/l/%two_letters_code%/%original_file_name%' }],
      ...overrides,
    });

  const runSources = async (config: Config) => {
    const table = spyOn(output, 'table');
    const command = new ConfigCommand(
      async () => config,
      () => output,
      async () => projectService,
      async () => languageService,
    );

    await command.listSourcesAction(createCommandContext({ ...globalOptions, config: '' }));
    return table;
  };

  test('strips the common parent directory when preserve_hierarchy is off', async () => {
    const table = await runSources(buildConfig());

    expect(table).toHaveBeenCalledWith([{ file: 'bar/b.json' }, { file: 'foo/a.json' }]);
  });

  test('keeps the full hierarchy when preserve_hierarchy is on', async () => {
    const table = await runSources(buildConfig({ preserveHierarchy: true }));

    expect(table).toHaveBeenCalledWith([{ file: 'src/bar/b.json' }, { file: 'src/foo/a.json' }]);
  });
});

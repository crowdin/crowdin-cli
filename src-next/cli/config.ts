import path from 'node:path';
import type { Command } from 'commander';
import YAML from 'yaml';
import CliError from '@/cli/errors/CliError.ts';
import { FILE_NAMES, getApiTokenFilePathFor } from '@/lib/apiToken.ts';
import { loadFromFile } from '@/lib/config/yamlLoader.ts';
import { type Config, ConfigSchema } from '@/lib/config.ts';
import { loadFromFile as loadIdentityFromFile } from '@/lib/identity/yamlLoader.ts';
import type { Identity } from '@/lib/identity.ts';
import type { ConfigOptions, GlobalOptions } from './options.ts';
import type { Output } from './utils/output.ts';

export function createGetConfig(getOutput: (command: Command) => Output) {
  let cachedConfig: ReturnType<typeof ConfigSchema.parse> | undefined;
  let cachedConfigPath: string | undefined;

  return async (command: Command): Promise<ReturnType<typeof ConfigSchema.parse>> => {
    const output = getOutput(command);
    const options = command.optsWithGlobals() as GlobalOptions & ConfigOptions;
    const configPath = options.config || path.join(process.cwd(), 'crowdin.yml');

    if (cachedConfig && cachedConfigPath === configPath) {
      return cachedConfig;
    }

    output.debug(`Loading configuration from ${configPath} file`);

    const rawConfig = await loadFromFile(configPath);
    cachedConfigPath = configPath;

    const apiToken = await loadApiTokenFile(output);
    const rawIdentity = options.identity ? await loadIdentityFile(options.identity, output) : {};
    const cliOverrides: Partial<Config> = {};

    if (options.token) {
      cliOverrides.apiToken = options.token;
    }

    if (options.basePath) {
      cliOverrides.basePath = options.basePath;
    }

    if (options.baseUrl) {
      cliOverrides.baseUrl = options.baseUrl;
    }

    if (options.projectId) {
      cliOverrides.projectId = options.projectId;
    }

    if (options.preserveHierarchy) {
      cliOverrides.preserveHierarchy = options.preserveHierarchy;
    }

    if (options.source && options.translation) {
      cliOverrides.files = [{ source: options.source, translation: options.translation }];
    }

    cachedConfig = ConfigSchema.parse({
      ...rawConfig,
      ...(apiToken ? { api_token: apiToken } : {}),
      ...filterUndefined(rawIdentity),
      ...cliOverrides,
    });

    return cachedConfig;
  };
}

function filterUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

async function loadApiTokenFile(output: Output): Promise<string | null> {
  for (const fileName of FILE_NAMES) {
    const candidate = getApiTokenFilePathFor(fileName);

    if (await Bun.file(candidate).exists()) {
      output.debug(`Loading API token from ${candidate} file`);

      const raw = YAML.parse(await Bun.file(candidate).text());
      return raw.api_token ?? null;
    }
  }

  return null;
}

async function loadIdentityFile(identityFilePath: string, output: Output): Promise<Identity> {
  if (!(await Bun.file(identityFilePath).exists())) {
    throw new CliError(`Identity file not found: ${identityFilePath}`);
  }

  output.debug(`Loading credentials from ${identityFilePath} file`);

  return await loadIdentityFromFile(identityFilePath);
}

import type { Command } from 'commander';
import { assertProjectConfigured, type Config, type ProjectConfig } from '@/lib/config.ts';
import { checkResolvedConfig, type LoadedConfig, loadConfig, resolveConfigPath } from '../config.ts';
import type { ConfigOptions, GlobalOptions } from '../options.ts';
import type { GetOutput } from './services.ts';

export function createGetConfig(getOutput: GetOutput) {
  let cachedLoad: LoadedConfig | undefined;
  let cachedConfigPath: string | undefined;

  const load = async (command: Command): Promise<LoadedConfig> => {
    const options = command.optsWithGlobals() as GlobalOptions & ConfigOptions;
    const configPath = await resolveConfigPath(options.config);

    if (cachedLoad && cachedConfigPath === configPath) {
      return cachedLoad;
    }

    cachedLoad = await loadConfig(command, configPath, getOutput(command));
    cachedConfigPath = configPath;

    return cachedLoad;
  };

  const getConfig = async (command: Command): Promise<Config> => {
    const loaded = await load(command);

    checkResolvedConfig(loaded, command);

    return loaded.config;
  };

  // checkResolvedConfig already reports a missing project_id for every command that declares
  // --project-id, so this only narrows the type for the services that read it.
  const getProjectConfig = async (command: Command): Promise<ProjectConfig> => {
    const config = await getConfig(command);

    assertProjectConfigured(config);

    return config;
  };

  // Same load, without the "credentials are present" checks: `language list --all` needs to know
  // whether a token/project resolved, since Crowdin serves the supported-language list publicly.
  // A malformed config file still throws here — only missing credentials come back as undefined.
  const tryGetConfig = async (command: Command): Promise<Config> => (await load(command)).config;

  return { getConfig, getProjectConfig, tryGetConfig };
}

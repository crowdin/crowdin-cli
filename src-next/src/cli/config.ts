import type { Command } from 'commander';
import { loadFromFile } from '../lib/config/yamlLoader.ts';
import type { Config } from '../lib/config.ts';
import type { GlobalOptions } from './options.ts';

export function createGetConfig() {
  let cachedConfig: Config | undefined;
  let cachedConfigPath: string | undefined;

  return async (command: Command): Promise<Config> => {
    const options = command.optsWithGlobals() as GlobalOptions;
    const configPath = options.config || `${process.cwd()}/crowdin.yml`;

    if (cachedConfig && cachedConfigPath === configPath) {
      return cachedConfig;
    }

    cachedConfig = await loadFromFile(configPath);
    cachedConfigPath = configPath;

    return cachedConfig;
  };
}

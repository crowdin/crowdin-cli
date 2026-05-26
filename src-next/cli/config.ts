import type { Command } from 'commander';
import { loadFromFile } from '@/lib/config/yamlLoader.ts';
import type { Config } from '@/lib/config.ts';
import type { ConfigOptions, GlobalOptions } from './options.ts';
import type { Output } from './utils/output.ts';

export function createGetConfig(getOutput: (command: Command) => Output) {
  let cachedConfig: Config | undefined;
  let cachedConfigPath: string | undefined;

  return async (command: Command): Promise<Config> => {
    const output = getOutput(command);
    const options = command.optsWithGlobals() as GlobalOptions & ConfigOptions;
    const configPath = options.config || `${process.cwd()}/crowdin.yml`;

    if (cachedConfig && cachedConfigPath === configPath) {
      return cachedConfig;
    }

    output.debug(`Loading configuration from ${configPath} file`);

    cachedConfig = await loadFromFile(configPath);
    cachedConfigPath = configPath;

    // TODO: Add validation
    if (options.token) {
      cachedConfig.apiToken = options.token;
    }

    if (options.basePath) {
      cachedConfig.basePath = options.basePath;
    }

    if (options.baseUrl) {
      cachedConfig.baseUrl = options.baseUrl;
    }

    if (options.source && options.translation) {
      const file = {
        source: options.source,
        translation: options.translation,
      };

      if (options.destination) {
        // file.dest = options.destination; // TODO:
      }

      cachedConfig.files = [file];
    }

    if (options.projectId) {
      cachedConfig.projectId = options.projectId;
    }

    if (options.preserveHierarchy) {
      cachedConfig.preserveHierarchy = options.preserveHierarchy;
    }

    return cachedConfig;
  };
}

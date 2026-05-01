import type { Command } from 'commander';
import { loadFromFile } from '../../lib/config/yamlLoader.ts';

export default async (command: Command) => {
  const configFilePath = `${process.cwd()}/crowdin.yml`;

  if (command.name() === 'lint' && command.parent?.name() === 'config') {
    return;
  }

  if (await Bun.file(configFilePath).exists()) {
    if (!(command as any).localContext) {
      (command as any).localContext = {};
    }

    (command as any).localContext.config = await loadFromFile(configFilePath);
  }
};

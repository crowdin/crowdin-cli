import path from 'node:path';
import { Glob } from 'bun';
import type { Config } from '../config.ts';

export default class SourceFileLoader {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  getFilePaths(): string[] {
    const filePaths = [];

    for (const patterns of this.config.files) {
      filePaths.push(...this.getFilePathsForPattern(patterns.source));
    }

    return filePaths;
  }

  getFilePathsForPattern(pattern: string): string[] {
    let sourcePattern = pattern;
    if (sourcePattern.startsWith(path.sep)) {
      sourcePattern = sourcePattern.slice(1);
    }

    const glob = new Glob(sourcePattern);

    return Array.from(
      glob.scanSync({
        cwd: this.config.basePath,
        onlyFiles: true,
      }),
    );
  }
}

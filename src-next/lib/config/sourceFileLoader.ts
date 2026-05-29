import { Glob } from 'bun';
import type { Config } from '../config.ts';
import { toPosixPath } from '../utils/path.ts';

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

    if (sourcePattern.startsWith('/')) {
      sourcePattern = sourcePattern.slice(1);
    }

    const glob = new Glob(sourcePattern);
    const files = glob.scanSync({
      cwd: this.config.basePath,
      onlyFiles: true,
    });

    return Array.from(files).map(toPosixPath).sort();
  }
}

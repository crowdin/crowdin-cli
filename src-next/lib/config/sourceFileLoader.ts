import fs from 'node:fs';
import path from 'node:path';
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
      filePaths.push(...this.getFilePathsForPattern(patterns.source, patterns.ignore));
    }

    return filePaths;
  }

  getFilePathsForPattern(pattern: string, ignore?: string[]): string[] {
    let sourcePattern = pattern;

    if (sourcePattern.startsWith('/')) {
      sourcePattern = sourcePattern.slice(1);
    }

    const glob = new Glob(sourcePattern);
    // Hidden files (and files under hidden directories) are scanned only when the setting is off.
    const files = Array.from(
      glob.scanSync({
        cwd: this.config.basePath,
        onlyFiles: true,
        dot: !this.config.ignoreHiddenFiles,
      }),
    ).map(toPosixPath);

    const ignoreMatchers = this.buildIgnoreMatchers(ignore ?? []);

    const filtered =
      ignoreMatchers.length === 0
        ? files
        : files.filter((filePath) => !ignoreMatchers.some((matcher) => matcher.match(filePath)));

    return filtered.sort();
  }

  /**
   * Builds glob matchers for ignore patterns, mirroring Java's FileHelper.filterOutIgnoredFiles:
   * directory patterns expand to match everything underneath, and `**`-prefixed patterns also
   * match at the top level.
   */
  private buildIgnoreMatchers(ignore: string[]): Glob[] {
    if (ignore.length === 0) {
      return [];
    }

    const matchers: Glob[] = [];

    for (const raw of ignore) {
      let pattern = toPosixPath(raw);

      if (pattern.startsWith('/')) {
        pattern = pattern.slice(1);
      }

      if (this.isDirectory(pattern)) {
        matchers.push(new Glob(`${pattern}/*`));
        matchers.push(new Glob(`${pattern}/**/*`));
      } else {
        matchers.push(new Glob(pattern));

        if (pattern.includes('**')) {
          matchers.push(new Glob(pattern.replace('**/', '')));
        }
      }
    }

    return matchers;
  }

  private isDirectory(pattern: string): boolean {
    try {
      return fs.statSync(path.join(this.config.basePath, pattern)).isDirectory();
    } catch {
      return false;
    }
  }
}

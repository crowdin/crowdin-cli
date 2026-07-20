import fs from 'node:fs';
import path from 'node:path';
import type { LanguagesModel, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import { Glob } from 'bun';
import type { Config } from '../config.ts';
import { expandIgnorePatterns } from '../export/languagePlaceholders.ts';
import { toPosixPath } from '../utils/path.ts';

export interface IgnoreLanguageContext {
  languages: LanguagesModel.Language[];
  serverLanguageMapping?: ProjectsGroupsModel.LanguageMapping;
  fileLanguageMapping?: Record<string, Record<string, string>>;
}

/**
 * The shared parent directory of all given posix paths, including the trailing slash (or '' when
 * there is none). Mirrors Java SourcesUtils.getCommonPath: take the longest common string prefix,
 * then trim back to the last path separator so a partial file-name match is never stripped.
 */
export function commonPath(paths: string[]): string {
  if (paths.length === 0) {
    return '';
  }

  let prefix = paths[0] ?? '';
  for (const value of paths) {
    while (!value.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
  }

  const lastSeparator = prefix.lastIndexOf('/');
  return lastSeparator >= 0 ? prefix.slice(0, lastSeparator + 1) : '';
}

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

  getFilePathsForPattern(pattern: string, ignore?: string[], languageContext?: IgnoreLanguageContext): string[] {
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

    const resolvedIgnore = languageContext
      ? expandIgnorePatterns(
          ignore ?? [],
          languageContext.languages,
          languageContext.serverLanguageMapping,
          languageContext.fileLanguageMapping,
        )
      : (ignore ?? []);
    const ignoreMatchers = this.buildIgnoreMatchers(resolvedIgnore);

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

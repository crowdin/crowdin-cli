import path from 'node:path';
import type { LanguagesModel, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import { type BunFile, Glob } from 'bun';
import type { Config } from '../config.ts';
import { containsLanguagePlaceholder, languagePlaceholderValue } from '../export/languagePlaceholders.ts';
import { fileExtension, fileName, filePatterns, originalFileName, originalPath } from '../export/patterns.ts';
import { prepareDest } from '../upload/fileOptions.ts';
import { toPosixPath } from '../utils/path.ts';

type FileConfig = Config['files'][number];

export interface ResolveOptions {
  /**
   * Resolve the server export path (the path used inside the downloaded archive): use the server
   * language mapping only (ignore per-file `languages_mapping`) and skip `translation_replace`.
   */
  serverOnly?: boolean;
  /** The group's `dest`, used to place file-dependent placeholders at the server location. */
  dest?: string;
  /** When false and `serverOnly` is set, `%original_path%` is dropped from the archive key. */
  preserveHierarchy?: boolean;
}

export default class TranslationPathResolver {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  canResolve(file: BunFile): boolean {
    try {
      this.findFileConfig(file);
      return true;
    } catch {
      return false;
    }
  }

  resolve(
    file: BunFile,
    language: LanguagesModel.Language,
    serverLanguageMapping?: ProjectsGroupsModel.LanguageMapping,
    options?: ResolveOptions,
  ): string {
    const fileConfig = this.findFileConfig(file);

    return this.resolveWithConfig(fileConfig, file.name ?? '', language, serverLanguageMapping, options);
  }

  /**
   * Resolves a translation path against an explicit file group, bypassing the disk-scan file lookup.
   * Needed for `--all` server-only sources that have no local file to match against.
   */
  resolveWithConfig(
    fileConfig: FileConfig,
    sourcePath: string,
    language: LanguagesModel.Language,
    serverLanguageMapping?: ProjectsGroupsModel.LanguageMapping,
    options?: ResolveOptions,
  ): string {
    const serverOnly = options?.serverOnly ?? false;

    // File-dependent placeholders are normally resolved from the source path. For the server
    // export path of a `dest`-configured group they are resolved from the dest location instead
    // (mirrors Java's DownloadAction.doTranslationMapping).
    let placeholderPath = sourcePath;
    let pattern = fileConfig.translation;

    if (options?.dest) {
      placeholderPath = prepareDest(options.dest, placeholderPath);

      if (!this.translationHasLanguagePlaceholder(fileConfig.translation)) {
        pattern = options.dest;
      }
    }

    if (serverOnly && options?.preserveHierarchy === false) {
      pattern = pattern.replaceAll(originalPath, '');
    }

    const translationPath = pattern.replaceAll(/%[a-z_]+%/gm, (match: string): string =>
      this.getValueForExportPattern(match, placeholderPath, language, fileConfig, serverLanguageMapping, serverOnly),
    );

    if (serverOnly) {
      return translationPath;
    }

    return this.applyTranslationReplace(translationPath, fileConfig.translation_replace);
  }

  private translationHasLanguagePlaceholder(translation: string): boolean {
    return containsLanguagePlaceholder(translation);
  }

  private findFileConfig(file: BunFile): FileConfig {
    for (const patterns of this.config.files) {
      let sourcePattern = patterns.source;
      if (sourcePattern.startsWith('/')) {
        sourcePattern = sourcePattern.slice(1);
      }

      const glob = new Glob(sourcePattern);
      const files = glob.scanSync({
        cwd: this.config.basePath,
        onlyFiles: true,
      });

      const normalizedFileName = file.name ? toPosixPath(file.name) : undefined;

      for (const filePath of files) {
        if (toPosixPath(filePath) === normalizedFileName) {
          return patterns;
        }
      }
    }

    throw new Error('Translation export pattern was not found');
  }

  private getValueForExportPattern(
    exportPattern: string,
    filePath: string,
    language: LanguagesModel.Language,
    fileConfig: FileConfig,
    serverLanguageMapping?: ProjectsGroupsModel.LanguageMapping,
    serverOnly = false,
  ): string {
    if (filePatterns.includes(exportPattern)) {
      if (exportPattern === fileExtension) {
        return path.parse(filePath).ext.slice(1);
      }

      // File name without extension
      if (exportPattern === fileName) {
        return path.parse(filePath).name;
      }

      // File name with extension
      if (exportPattern === originalFileName) {
        return path.parse(filePath).base;
      }

      // Full file path
      if (exportPattern === originalPath) {
        return filePath;
      }
    }

    return languagePlaceholderValue(
      exportPattern,
      language,
      serverLanguageMapping,
      serverOnly ? undefined : fileConfig.languages_mapping,
    );
  }

  private applyTranslationReplace(translationPath: string, translationReplace?: Record<string, string>): string {
    if (!translationReplace) {
      return translationPath;
    }

    let result = translationPath;
    for (const [search, replacement] of Object.entries(translationReplace)) {
      result = result.replaceAll(search, replacement);
    }

    return result;
  }
}

import path from 'node:path';
import type { LanguagesModel, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Config } from '../config.ts';
import { containsLanguagePlaceholder, languagePlaceholderValue } from '../export/languagePlaceholders.ts';
import { fileExtension, fileName, filePatterns, originalFileName, originalPath } from '../export/patterns.ts';
import { prepareDest, replaceFileDependentPlaceholders } from '../upload/fileOptions.ts';
import { replaceDoubleAsterisk } from '../utils/doubleAsterisk.ts';
import { collapseSeparators } from '../utils/path.ts';

type FileConfig = Config['files'][number];

export interface ResolveOptions {
  /**
   * Resolve the server export path (the path used inside the downloaded archive): use the server
   * language mapping only (ignore per-file `languages_mapping`) and skip `translation_replace`.
   */
  serverOnly?: boolean;
  /**
   * The group's `dest`, which moves file-dependent placeholders to the server location.
   *
   * Only meaningful together with `serverOnly`: the archive key is resolved from
   * `prepareDest(dest, file)`, but the *local* path always from the source path, so passing `dest`
   * without `serverOnly` would give a local path the server's placeholder values.
   */
  dest?: string;
  /** When false and `serverOnly` is set, `%original_path%` is dropped from the archive key. */
  preserveHierarchy?: boolean;
}

/**
 * Resolves a translation path for one source file against the file group it belongs to.
 *
 * The group is a parameter, not something derived here: several groups can match a file by their
 * `source` glob, and each brings its own `translation` and `ignore`.
 */
export function resolveTranslationPath(
  fileConfig: FileConfig,
  sourcePath: string,
  language: LanguagesModel.Language,
  serverLanguageMapping?: ProjectsGroupsModel.LanguageMapping,
  options?: ResolveOptions,
): string {
  const serverOnly = options?.serverOnly ?? false;

  // A `dest`-configured group resolves file-dependent placeholders from the dest location rather
  // than the source path. With no language placeholder in `translation`, the archive key is `dest`
  // alone — placeholders *and* `**` expansion, via the same replaceFileDependentPlaceholders the
  // upload side uses — so the `preserve_hierarchy` stripping below never applies to it.
  if (options?.dest && !containsLanguagePlaceholder(fileConfig.translation)) {
    return replaceFileDependentPlaceholders(options.dest, prepareDest(options.dest, sourcePath));
  }

  let placeholderPath = sourcePath;
  let pattern = fileConfig.translation;

  if (options?.dest) {
    placeholderPath = prepareDest(options.dest, placeholderPath);
  }

  if (serverOnly && options?.preserveHierarchy === false) {
    pattern = pattern.replaceAll(originalPath, '');
  }

  // Substitute the `**`-matched subpath into the pattern before resolving placeholders.
  pattern = replaceDoubleAsterisk(fileConfig.source, pattern, sourcePath);

  const translationPath = collapseSeparators(
    pattern.replaceAll(/%[a-z_]+%/gm, (match: string): string =>
      getValueForExportPattern(match, placeholderPath, language, fileConfig, serverLanguageMapping, serverOnly),
    ),
  );

  if (serverOnly) {
    return translationPath;
  }

  return applyTranslationReplace(translationPath, fileConfig.translation_replace);
}

function getValueForExportPattern(
  exportPattern: string,
  filePath: string,
  language: LanguagesModel.Language,
  fileConfig: FileConfig,
  serverLanguageMapping?: ProjectsGroupsModel.LanguageMapping,
  serverOnly = false,
): string {
  if (filePatterns.includes(exportPattern)) {
    // Crowdin paths are posix, so parse them as posix regardless of the host OS.
    const parsed = path.posix.parse(filePath);

    if (exportPattern === fileExtension) {
      return parsed.ext.slice(1);
    }

    // File name without extension
    if (exportPattern === fileName) {
      return parsed.name;
    }

    // File name with extension
    if (exportPattern === originalFileName) {
      return parsed.base;
    }

    // Parent directory of the file, without a trailing separator
    if (exportPattern === originalPath) {
      return parsed.dir;
    }
  }

  return languagePlaceholderValue(
    exportPattern,
    language,
    serverLanguageMapping,
    serverOnly ? undefined : fileConfig.languages_mapping,
  );
}

function applyTranslationReplace(translationPath: string, translationReplace?: Record<string, string>): string {
  if (!translationReplace) {
    return translationPath;
  }

  let result = translationPath;
  for (const [search, replacement] of Object.entries(translationReplace)) {
    result = result.replaceAll(search, replacement);
  }

  return result;
}

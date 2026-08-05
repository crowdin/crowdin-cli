import path from 'node:path';
import type { LanguagesModel, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Config } from '../config.ts';
import { containsLanguagePlaceholder, languagePlaceholderValue } from '../export/languagePlaceholders.ts';
import { fileExtension, fileName, filePatterns, originalFileName, originalPath } from '../export/patterns.ts';
import { prepareDest } from '../upload/fileOptions.ts';
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
   * Only meaningful together with `serverOnly`. Java resolves the archive key
   * (`translationProject2`) from `prepareDest(dest, file)` but always resolves the *local* path
   * (`translationFile2`) from the source path, so passing `dest` without `serverOnly` would give a
   * local path the server's placeholder values.
   */
  dest?: string;
  /** When false and `serverOnly` is set, `%original_path%` is dropped from the archive key. */
  preserveHierarchy?: boolean;
}

/**
 * Resolves a translation path for one source file against the file group it belongs to.
 *
 * The group is a parameter, not something derived here. Deriving it — by finding the first group
 * whose `source` glob matches — silently used the wrong group's `translation` for a file that
 * several groups match, and ignored each group's `ignore` while doing it.
 */
export function resolveTranslationPath(
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
  // When `dest` replaces the pattern entirely it is used verbatim (no `**` expansion), mirroring
  // Java's dest branch in doTranslationMapping.
  let usingDest = false;

  if (options?.dest) {
    placeholderPath = prepareDest(options.dest, placeholderPath);

    if (!containsLanguagePlaceholder(fileConfig.translation)) {
      pattern = options.dest;
      usingDest = true;
    }
  }

  if (serverOnly && options?.preserveHierarchy === false) {
    pattern = pattern.replaceAll(originalPath, '');
  }

  // Substitute the `**`-matched subpath into the (translation-derived) pattern before resolving
  // placeholders, mirroring Java's TranslationsUtils.replaceDoubleAsterisk.
  if (!usingDest) {
    pattern = replaceDoubleAsterisk(fileConfig.source, pattern, sourcePath);
  }

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

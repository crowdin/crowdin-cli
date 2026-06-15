import path from 'node:path';
import type { LanguagesModel, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import { type BunFile, Glob } from 'bun';
import type { Config } from '../config.ts';
import {
  fileExtension,
  fileName,
  filePatterns,
  languageId,
  language as languagePattern,
  languagePatterns,
  locale,
  localeWithUnderscore,
  originalFileName,
  originalPath,
  osxCode,
  osxLocale,
  threeLettersCode,
  twoLettersCode,
} from '../export/patterns.ts';
import { toPosixPath } from '../utils/path.ts';

type FileConfig = Config['files'][number];

// Maps a language placeholder to the language-mapping key(s) used to look up an override.
// Order matters: the first key that has an override wins (mirrors Java's PlaceholderUtil).
const PLACEHOLDER_MAPPING_KEYS: Record<string, string[]> = {
  [languagePattern]: ['language', 'name'],
  [locale]: ['locale'],
  [localeWithUnderscore]: ['locale_with_underscore'],
  [threeLettersCode]: ['three_letters_code'],
  [twoLettersCode]: ['two_letters_code'],
  [osxCode]: ['osx_code'],
  [osxLocale]: ['osx_locale'],
  [languageId]: ['language_id'],
};

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
  ): string {
    const fileConfig = this.findFileConfig(file);

    const translationPath = fileConfig.translation.replaceAll(/%[a-z_]+%/gm, (match: string): string =>
      this.getValueForExportPattern(match, file, language, fileConfig, serverLanguageMapping),
    );

    return this.applyTranslationReplace(translationPath, fileConfig.translation_replace);
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
    file: BunFile,
    language: LanguagesModel.Language,
    fileConfig: FileConfig,
    serverLanguageMapping?: ProjectsGroupsModel.LanguageMapping,
  ): string {
    if (filePatterns.includes(exportPattern)) {
      if (exportPattern === fileExtension) {
        return path.parse(file.name!).ext.slice(1);
      }

      // File name without extension
      if (exportPattern === fileName) {
        return path.parse(file.name!).name;
      }

      // File name with extension
      if (exportPattern === originalFileName) {
        return path.parse(file.name!).base;
      }

      // Full file path
      if (exportPattern === originalPath) {
        return file.name!;
      }
    }

    if (languagePatterns.includes(exportPattern)) {
      const override = this.getLanguageOverride(
        exportPattern,
        language.id,
        fileConfig.languages_mapping,
        serverLanguageMapping,
      );

      if (override !== undefined) {
        return override;
      }

      if (exportPattern === languagePattern) {
        return language.name;
      }

      if (exportPattern === locale) {
        return language.locale;
      }

      if (exportPattern === localeWithUnderscore) {
        return language.locale.replace('-', '_');
      }

      if (exportPattern === threeLettersCode) {
        return language.threeLettersCode;
      }

      if (exportPattern === twoLettersCode) {
        return language.twoLettersCode;
      }

      if (exportPattern === osxCode) {
        return language.osxCode;
      }

      if (exportPattern === osxLocale) {
        return language.osxLocale;
      }

      if (exportPattern === languageId) {
        return language.id;
      }
    }

    return exportPattern;
  }

  /**
   * Resolves a language-mapping override for a placeholder, with the per-file config mapping
   * taking precedence over the server mapping (mirrors Java's LanguageMapping.populate).
   *
   * Config mapping shape: { placeholder: { langId: value } }
   * Server mapping shape: { langId: { placeholder: value } }
   */
  private getLanguageOverride(
    exportPattern: string,
    langId: string,
    fileLanguageMapping?: Record<string, Record<string, string>>,
    serverLanguageMapping?: ProjectsGroupsModel.LanguageMapping,
  ): string | undefined {
    const keys = PLACEHOLDER_MAPPING_KEYS[exportPattern];
    if (!keys) {
      return undefined;
    }

    for (const key of keys) {
      const local = fileLanguageMapping?.[key]?.[langId];
      if (local !== undefined) {
        return local;
      }
    }

    const serverEntry = serverLanguageMapping?.[langId] as Record<string, string> | undefined;
    if (serverEntry) {
      for (const key of keys) {
        if (serverEntry[key] !== undefined) {
          return serverEntry[key];
        }
      }
    }

    return undefined;
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

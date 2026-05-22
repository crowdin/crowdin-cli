import path from 'node:path';
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

export default class TranslationPathResolver {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  resolve(file: BunFile, language: any): string {
    const translationPattern = this.findExportPattern(file);

    return translationPattern.replaceAll(/%[a-z_]+%/gm, (match: string): string =>
      this.getValueForExportPattern(match, file, language),
    );
  }

  private findExportPattern(file: BunFile): string {
    for (const patterns of this.config.files) {
      let sourcePattern = patterns.source;
      if (sourcePattern.startsWith(path.sep)) {
        sourcePattern = sourcePattern.slice(1);
      }

      const glob = new Glob(sourcePattern);
      const files = glob.scanSync({
        cwd: this.config.basePath,
        onlyFiles: true,
      });

      for (const path of files) {
        if (path === file.name) {
          return patterns.translation;
        }
      }
    }

    throw new Error('Translation export pattern was not found');
  }

  private getValueForExportPattern(exportPattern: string, file: BunFile, language: any): string {
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
}

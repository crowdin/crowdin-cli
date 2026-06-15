import path from 'node:path';
import { SourceFilesModel, type SourceStringsModel } from '@crowdin/crowdin-api-client';
import type { Config } from '@/lib/config.ts';
import { fileExtension, fileName, originalFileName, originalPath } from '@/lib/export/patterns.ts';
import { toPosixPath } from '@/lib/utils/path.ts';

type FileConfig = Config['files'][number];

const SPREADSHEET_EXTENSIONS = new Set(['.csv', '.xls', '.xlsx']);

export function buildExportOptions(
  localFilePath: string,
  fileConfig: FileConfig,
  exportPattern?: string,
): SourceFilesModel.ExportOptions {
  const extension = path.extname(localFilePath).toLowerCase();

  if (extension === '.properties') {
    return {
      exportPattern,
      escapeQuotes: fileConfig.escape_quotes as SourceFilesModel.EscapeQuotes | undefined,
      escapeSpecialCharacters: fileConfig.escape_special_characters ?? 1,
    };
  }

  if (extension === '.js') {
    return {
      exportPattern,
      exportQuotes:
        fileConfig.export_quotes === 'double'
          ? SourceFilesModel.ExportQuotes.DOUBLE
          : fileConfig.export_quotes === 'single'
            ? SourceFilesModel.ExportQuotes.SINGLE
            : undefined,
    };
  }

  return { exportPattern };
}

export function buildImportOptions(
  localFilePath: string,
  fileConfig: FileConfig,
  srxStorageId?: number,
): SourceFilesModel.ImportOptions | undefined {
  const extension = path.extname(localFilePath).toLowerCase();

  if (SPREADSHEET_EXTENSIONS.has(extension)) {
    return omitUndefined({
      firstLineContainsHeader: fileConfig.first_line_contains_header,
      scheme: buildScheme(fileConfig.scheme),
      importTranslations: fileConfig.import_translations,
    });
  }

  if (extension === '.xml') {
    return omitUndefined({
      translateContent: fileConfig.translate_content,
      translateAttributes: fileConfig.translate_attributes,
      contentSegmentation: fileConfig.content_segmentation,
      translatableElements: fileConfig.translatable_elements,
      srxStorageId,
    });
  }

  return omitUndefined({
    contentSegmentation: fileConfig.content_segmentation,
    srxStorageId,
  });
}

export function buildStringsImportOptions(
  localFilePath: string,
  fileConfig: FileConfig,
): SourceStringsModel.UploadStringsRequest['importOptions'] {
  const extension = path.extname(localFilePath).toLowerCase();

  if (!SPREADSHEET_EXTENSIONS.has(extension)) {
    return undefined;
  }

  return omitUndefined({
    firstLineContainsHeader: fileConfig.first_line_contains_header,
    importTranslations: fileConfig.import_translations,
    scheme: buildScheme(fileConfig.scheme),
  }) as SourceStringsModel.UploadStringsRequest['importOptions'];
}

function buildScheme(scheme: FileConfig['scheme']): SourceFilesModel.Scheme | undefined {
  if (scheme === undefined) {
    return undefined;
  }

  if (typeof scheme === 'object') {
    return scheme as SourceFilesModel.Scheme;
  }

  return Object.fromEntries(
    scheme.split(',').map((part, index) => [part.trim(), index]),
  ) as unknown as SourceFilesModel.Scheme;
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T | undefined {
  const result = Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
  return Object.keys(result).length > 0 ? result : undefined;
}

export function replaceFileDependentPlaceholders(pattern: string, localFilePath: string): string {
  const parsed = path.parse(localFilePath);

  return pattern.replaceAll(/%[a-z_]+%/g, (match) => {
    switch (match) {
      case fileExtension:
        return parsed.ext.slice(1);
      case fileName:
        return parsed.name;
      case originalFileName:
        return parsed.base;
      case originalPath:
        return localFilePath;
      default:
        return match;
    }
  });
}

export function resolveContextPath(pattern: string, localFilePath: string): string {
  return replaceFileDependentPlaceholders(pattern, localFilePath);
}

/**
 * Resolves the `dest` config option into a project file path, mirroring Java's
 * PropertiesBeanUtils.prepareDest: file-dependent placeholders are substituted from the local
 * source path and any leading separator is stripped.
 */
export function prepareDest(dest: string, localFilePath: string): string {
  const resolved = toPosixPath(replaceFileDependentPlaceholders(dest, localFilePath));
  return resolved.startsWith('/') ? resolved.slice(1) : resolved;
}

/**
 * Computes the common directory prefix of the given POSIX file paths (relative to basePath),
 * mirroring Java's SourcesUtils.getCommonPath. Returns a string ending in '/' or an empty string.
 */
export function getCommonPath(filePaths: string[]): string {
  if (filePaths.length === 0) {
    return '';
  }

  const commonPrefix = longestCommonPrefix(filePaths);
  const lastSeparator = commonPrefix.lastIndexOf('/');

  return lastSeparator >= 0 ? commonPrefix.slice(0, lastSeparator + 1) : '';
}

function longestCommonPrefix(values: string[]): string {
  let prefix = values[0] as string;

  for (const value of values) {
    let index = 0;

    while (index < prefix.length && index < value.length && prefix[index] === value[index]) {
      index++;
    }

    prefix = prefix.slice(0, index);

    if (prefix === '') {
      break;
    }
  }

  return prefix;
}

import type { LanguagesModel, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import { containsLanguagePlaceholder, resolveLanguagePlaceholders } from '../export/languagePlaceholders.ts';
import { languageId } from '../export/patterns.ts';
import { replaceFileDependentPlaceholders } from '../upload/fileOptions.ts';
import { toPosixPath } from '../utils/path.ts';

interface ProjectFileInfo {
  data: {
    path?: string;
    name?: string;
    exportOptions?: unknown;
  };
}

/**
 * Maps every project source file to the list of its server export (translation) paths, mirroring
 * Java's ProjectFilesUtils.buildAllProjectTranslations. Used to classify omitted archive entries
 * into those that belong to a known project source and those without a source.
 *
 * Keys and values are posix paths relative to the project root (no leading slash).
 */
export function buildAllProjectTranslations(
  projectFiles: ProjectFileInfo[],
  languages: LanguagesModel.Language[],
  serverLanguageMapping: ProjectsGroupsModel.LanguageMapping | undefined,
): Map<string, string[]> {
  const result = new Map<string, string[]>();

  for (const file of projectFiles) {
    const sourcePath = stripLeadingSlash(toPosixPath(file.data.path ?? ''));
    const exportPattern = getExportPattern(file.data.exportOptions);

    let translations: string[];

    if (exportPattern === undefined) {
      // Multilingual file (no export pattern): the file itself plus a per-language copy.
      const name = stripLeadingSlash(toPosixPath(file.data.name ?? sourcePath));
      translations = [
        name,
        ...languages.map((language) =>
          stripLeadingSlash(resolveLanguagePlaceholders(`${languageId}/${name}`, language, serverLanguageMapping)),
        ),
      ];
    } else {
      let pattern = stripLeadingSlash(toPosixPath(exportPattern));

      if (!containsLanguagePlaceholder(pattern)) {
        pattern = `${languageId}/${pattern}`;
      }

      const fileResolved = replaceFileDependentPlaceholders(pattern, sourcePath);
      translations = languages.map((language) =>
        stripLeadingSlash(resolveLanguagePlaceholders(fileResolved, language, serverLanguageMapping)),
      );
    }

    result.set(sourcePath, translations);
  }

  return result;
}

export interface OmittedFiles {
  /** omitted translation paths grouped by the project source path they belong to. */
  withSources: Map<string, string[]>;
  /** omitted translation paths with no matching project source. */
  withoutSources: string[];
}

/**
 * Splits omitted archive entries into those that correspond to a known project source (grouped by
 * source) and those without a source, mirroring Java's DownloadAction.sortOmittedFiles.
 */
export function sortOmittedFiles(omittedFiles: string[], allProjectTranslations: Map<string, string[]>): OmittedFiles {
  const withSources = new Map<string, string[]>();
  const withoutSources: string[] = [];

  for (const omittedFile of omittedFiles) {
    let found = false;

    for (const [sourcePath, translations] of allProjectTranslations) {
      if (translations.includes(omittedFile)) {
        found = true;
        const bucket = withSources.get(sourcePath) ?? [];
        bucket.push(omittedFile);
        withSources.set(sourcePath, bucket);
      }
    }

    if (!found) {
      withoutSources.push(omittedFile);
    }
  }

  return { withSources, withoutSources };
}

function getExportPattern(exportOptions: unknown): string | undefined {
  const pattern = (exportOptions as { exportPattern?: string } | undefined)?.exportPattern;
  return pattern ?? undefined;
}

function stripLeadingSlash(value: string): string {
  return value.startsWith('/') ? value.slice(1) : value;
}

import type { LanguagesModel, ProjectsGroupsModel, SourceFilesModel } from '@crowdin/crowdin-api-client';
import { containsLanguagePlaceholder, resolveLanguagePlaceholders } from '../export/languagePlaceholders.ts';
import { languageId } from '../export/patterns.ts';
import { replaceFileDependentPlaceholders } from '../upload/fileOptions.ts';
import { stripLeadingSlashes, toPosixPath } from '../utils/path.ts';

/**
 * Maps every project source file to the list of its server export (translation) paths. Used to
 * classify omitted archive entries into those that belong to a known project source and those
 * without a source.
 *
 * Keys and values are posix paths relative to the project root (no leading slash).
 */
export function buildAllProjectTranslations(
  projectFiles: SourceFilesModel.File[],
  languages: LanguagesModel.Language[],
  serverLanguageMapping: ProjectsGroupsModel.LanguageMapping | undefined,
): Map<string, string[]> {
  const result = new Map<string, string[]>();

  for (const file of projectFiles) {
    const sourcePath = stripLeadingSlashes(toPosixPath(file.path));
    const exportPattern = getExportPattern(file.exportOptions);

    let translations: string[];

    if (exportPattern === undefined) {
      // Multilingual file (no export pattern): the file itself plus a per-language copy.
      const name = stripLeadingSlashes(toPosixPath(file.name));
      translations = [
        name,
        ...languages.map((language) =>
          stripLeadingSlashes(resolveLanguagePlaceholders(`${languageId}/${name}`, language, serverLanguageMapping)),
        ),
      ];
    } else {
      let pattern = stripLeadingSlashes(toPosixPath(exportPattern));

      if (!containsLanguagePlaceholder(pattern)) {
        pattern = `${languageId}/${pattern}`;
      }

      const fileResolved = replaceFileDependentPlaceholders(pattern, sourcePath);
      translations = languages.map((language) =>
        stripLeadingSlashes(resolveLanguagePlaceholders(fileResolved, language, serverLanguageMapping)),
      );
    }

    result.set(sourcePath, translations);
  }

  return result;
}

export function getExportPattern(exportOptions: unknown): string | undefined {
  const pattern = (exportOptions as { exportPattern?: string } | undefined)?.exportPattern;
  return pattern ?? undefined;
}

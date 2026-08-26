import type { LanguagesModel } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';

export interface DownloadLanguageOptions {
  language?: string[];
  excludeLanguage?: string[];
}

export interface ResolvedDownloadLanguages {
  /** The languages to build a translation mapping for. */
  languages: LanguagesModel.Language[];
  /**
   * Ids to pin as `targetLanguageIds` on the build request, or undefined to let the server build
   * every language. Java only pins them when the set was actually narrowed.
   */
  languageIds?: string[];
}

/**
 * Resolves which languages `download translations` should build and map, mirroring Java's
 * DownloadAction. `projectLanguages` is Java's `getProjectLanguages(true)` — the target languages
 * plus the in-context pseudo language when the project has one — and every id given on the command
 * line or in `export_languages` has to appear in it.
 */
export function resolveDownloadLanguages(
  projectLanguages: LanguagesModel.Language[],
  options: DownloadLanguageOptions,
  exportLanguages?: string[],
): ResolvedDownloadLanguages {
  const requested = options.language ?? [];
  const excluded = options.excludeLanguage ?? [];

  if (requested.length > 0 && excluded.length > 0) {
    throw new CliError(`The '--language' and '--exclude-language' options can't be used simultaneously`);
  }

  const projectLanguageIds = projectLanguages.map((language) => language.id);
  const assertKnown = (languageId: string) => {
    if (!projectLanguageIds.includes(languageId)) {
      throw new CliError(`Language '${languageId}' doesn't exist in the project. Try specifying another language code`);
    }
  };

  // `--language` replaces the set outright and always pins the build.
  if (requested.length > 0) {
    for (const languageId of requested) {
      assertKnown(languageId);
    }

    return {
      languages: projectLanguages.filter((language) => requested.includes(language.id)),
      languageIds: requested,
    };
  }

  const configured = exportLanguages ?? [];

  for (const languageId of [...configured, ...excluded]) {
    assertKnown(languageId);
  }

  // Base set = config export_languages when present, else every project language; excludes subtract.
  const base =
    configured.length > 0 ? projectLanguages.filter((language) => configured.includes(language.id)) : projectLanguages;
  const languages = base.filter((language) => !excluded.includes(language.id));

  return {
    languages,
    // Only pinned when export_languages or excludes actually narrowed the set (Java parity).
    ...(configured.length > 0 || excluded.length > 0 ? { languageIds: languages.map((l) => l.id) } : {}),
  };
}

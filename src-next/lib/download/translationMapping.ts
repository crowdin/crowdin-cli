import type { LanguagesModel, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import { matchesSourcePattern } from '../config/projectFileMatch.ts';
import SourceFileLoader from '../config/sourceFileLoader.ts';
import TranslationPathResolver from '../config/translationPathResolver.ts';
import type { Config } from '../config.ts';
import { toPosixPath } from '../utils/path.ts';

export interface TranslationMapping {
  /** archive-relative path (posix, no leading slash) -> desired local path (relative to basePath). */
  byArchivePath: Map<string, string>;
}

export interface TranslationMappingOptions {
  /** Include server source files (not just local disk files) in the mapping (the `--all` flag). */
  useServerSources?: boolean;
  /** Project source paths from the server, used when `useServerSources` is set. */
  serverSourcePaths?: string[];
  /** Restrict the mapping to this subset of config file groups (one build per export-option combo). */
  files?: Config['files'];
  /**
   * Server-side excluded target languages per source path (basePath-relative posix key, no leading
   * slash). A language listed for a source is skipped for that source, mirroring Java's
   * DryrunTranslations.containsExcludedLanguage. Only the dry-run listing applies this (Java's real
   * DownloadAction does not filter excluded languages).
   */
  excludedTargetLanguagesByPath?: Map<string, string[]>;
}

/**
 * Builds the archive-to-local path mapping for `download translations`, mirroring Java's
 * DownloadAction.getFiles -> doTranslationMapping. For each config group, over every source file
 * and resolved language, it pairs the server export path (the path inside the downloaded archive)
 * with the desired local destination (which applies per-file `languages_mapping` and
 * `translation_replace`). With `useServerSources`, server-only project files matching a group are
 * added so files present on the server but absent locally are still downloaded.
 */
export function buildTranslationMapping(
  config: Config,
  languages: LanguagesModel.Language[],
  serverLanguageMapping: ProjectsGroupsModel.LanguageMapping | undefined,
  options?: TranslationMappingOptions,
): TranslationMapping {
  const resolver = new TranslationPathResolver(config);
  const sourceFileLoader = new SourceFileLoader(config);
  const byArchivePath = new Map<string, string>();
  const serverSourcePaths = (options?.serverSourcePaths ?? []).map((p) => stripLeadingSlash(toPosixPath(p)));
  const fileGroups = options?.files ?? config.files;

  for (const patterns of fileGroups) {
    const localSourcePaths = sourceFileLoader.getFilePathsForPattern(patterns.source, patterns.ignore, {
      languages,
      serverLanguageMapping,
      fileLanguageMapping: patterns.languages_mapping,
    });
    const sources = [...localSourcePaths];

    if (options?.useServerSources) {
      const localSet = new Set(localSourcePaths.map((p) => toPosixPath(p)));
      // Java filters by `dest` (when set) instead of `source` for server files.
      const searchPattern = patterns.dest ?? patterns.source;
      const ignore = patterns.ignore ?? [];

      for (const serverPath of serverSourcePaths) {
        if (localSet.has(serverPath) || !matchesSourcePattern(serverPath, searchPattern, config.preserveHierarchy)) {
          continue;
        }

        // Local sources already drop ignored files via SourceFileLoader; apply the same to server-only ones.
        if (ignore.some((pattern) => matchesSourcePattern(serverPath, pattern, config.preserveHierarchy))) {
          continue;
        }

        sources.push(serverPath);
      }
    }

    for (const sourcePath of sources) {
      const excludedLanguages = options?.excludedTargetLanguagesByPath?.get(stripLeadingSlash(toPosixPath(sourcePath)));

      for (const language of languages) {
        // Skip languages the server source file excludes (parity with DryrunTranslations).
        if (excludedLanguages?.includes(language.id)) {
          continue;
        }

        const localPath = stripLeadingSlash(
          resolver.resolveWithConfig(patterns, sourcePath, language, serverLanguageMapping),
        );
        const archivePath = stripLeadingSlash(
          resolver.resolveWithConfig(patterns, sourcePath, language, serverLanguageMapping, {
            serverOnly: true,
            dest: patterns.dest,
            preserveHierarchy: config.preserveHierarchy,
          }),
        );

        byArchivePath.set(toPosixPath(archivePath), toPosixPath(localPath));
      }
    }
  }

  return { byArchivePath };
}

function stripLeadingSlash(value: string): string {
  return value.startsWith('/') ? value.slice(1) : value;
}

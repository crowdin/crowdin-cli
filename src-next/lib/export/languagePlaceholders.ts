import type { LanguagesModel, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import {
  languageId,
  language as languagePattern,
  languagePatterns,
  locale,
  localeWithUnderscore,
  osxCode,
  osxLocale,
  threeLettersCode,
  twoLettersCode,
} from './patterns.ts';

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

/**
 * Resolves a language-mapping override for a placeholder, with the per-file config mapping
 * taking precedence over the server mapping (mirrors Java's LanguageMapping.populate).
 *
 * Config mapping shape: { placeholder: { langId: value } }
 * Server mapping shape: { langId: { placeholder: value } }
 */
export function getLanguageOverride(
  placeholder: string,
  langId: string,
  fileLanguageMapping?: Record<string, Record<string, string>>,
  serverLanguageMapping?: ProjectsGroupsModel.LanguageMapping,
): string | undefined {
  const keys = PLACEHOLDER_MAPPING_KEYS[placeholder];
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

/**
 * Resolves a single language placeholder to its value for the given language, honoring language
 * mapping overrides. Returns the placeholder unchanged if it is not a language placeholder.
 */
export function languagePlaceholderValue(
  placeholder: string,
  language: LanguagesModel.Language,
  serverLanguageMapping?: ProjectsGroupsModel.LanguageMapping,
  fileLanguageMapping?: Record<string, Record<string, string>>,
): string {
  if (!languagePatterns.includes(placeholder)) {
    return placeholder;
  }

  const override = getLanguageOverride(placeholder, language.id, fileLanguageMapping, serverLanguageMapping);
  if (override !== undefined) {
    return override;
  }

  switch (placeholder) {
    case languagePattern:
      return language.name;
    case locale:
      return language.locale;
    case localeWithUnderscore:
      return language.locale.replace('-', '_');
    case threeLettersCode:
      return language.threeLettersCode;
    case twoLettersCode:
      return language.twoLettersCode;
    case osxCode:
      return language.osxCode;
    case osxLocale:
      return language.osxLocale;
    case languageId:
      return language.id;
    default:
      return placeholder;
  }
}

/**
 * Replaces every language placeholder in a pattern with its value for the given language. Non
 * language placeholders (file placeholders, literals) are left untouched.
 */
export function resolveLanguagePlaceholders(
  pattern: string,
  language: LanguagesModel.Language,
  serverLanguageMapping?: ProjectsGroupsModel.LanguageMapping,
): string {
  return pattern.replaceAll(/%[a-z_]+%/gm, (match) => languagePlaceholderValue(match, language, serverLanguageMapping));
}

export function containsLanguagePlaceholder(pattern: string): boolean {
  return languagePatterns.some((placeholder) => pattern.includes(placeholder));
}

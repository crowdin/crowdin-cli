export const fileExtension = '%file_extension%';
export const fileName = '%file_name%';
export const originalFileName = '%original_file_name%';
export const originalPath = '%original_path%';
export const androidCode = '%android_code%';
export const language = '%language%';
export const locale = '%locale%';
export const localeWithUnderscore = '%locale_with_underscore%';
export const threeLettersCode = '%three_letters_code%';
export const twoLettersCode = '%two_letters_code%';
export const osxCode = '%osx_code%';
export const osxLocale = '%osx_locale%';
export const languageId = '%language_id%';

export const filePatterns = [fileExtension, fileName, originalFileName, originalPath];

export const languagePatterns = [
  language,
  locale,
  localeWithUnderscore,
  threeLettersCode,
  twoLettersCode,
  androidCode,
  osxCode,
  osxLocale,
  languageId,
];

const allPlaceholders = [
  fileExtension,
  fileName,
  originalFileName,
  originalPath,
  androidCode,
  language,
  locale,
  localeWithUnderscore,
  threeLettersCode,
  twoLettersCode,
  osxCode,
  osxLocale,
  languageId,
];

export default allPlaceholders;

// Mirrors Java's PlaceholderUtil.validStringPattern: any path segment that is wrapped in % must be
// a known placeholder. Segments that aren't fully %-wrapped (literals, globs) are left untouched.
export function validTranslationPattern(pattern: string): boolean {
  for (const segment of pattern.split('/')) {
    if (segment.startsWith('%') && segment.endsWith('%') && !allPlaceholders.includes(segment)) {
      return false;
    }
  }

  return true;
}

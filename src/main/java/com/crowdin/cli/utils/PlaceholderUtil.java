package com.crowdin.cli.utils;

import com.crowdin.cli.client.LanguageMapping;
import com.crowdin.client.languages.model.Language;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static com.crowdin.cli.utils.Utils.isWindows;

public class PlaceholderUtil {

    public static final String PLACEHOLDER_ANDROID_CODE = "%android_code%";
    public static final String PLACEHOLDER_LANGUAGE = "%language%";
    public static final String PLACEHOLDER_LOCALE = "%locale%";
    public static final String PLACEHOLDER_LOCALE_WITH_UNDERSCORE = "%locale_with_underscore%";
    public static final String PLACEHOLDER_THREE_LETTERS_CODE = "%three_letters_code%";
    public static final String PLACEHOLDER_TWO_LETTERS_CODE = "%two_letters_code%";
    public static final String PLACEHOLDER_OSX_CODE = "%osx_code%";
    public static final String PLACEHOLDER_OSX_LOCALE = "%osx_locale%";
    public static final String PLACEHOLDER_LANGUAGE_ID = "%language_id%";

    public static final String PLACEHOLDER_NAME_ANDROID_CODE = "android_code";
    public static final String PLACEHOLDER_NAME_LANGUAGE = "language";
    public static final String PLACEHOLDER_NAME_LANGUAGE_2 = "name";
    public static final String PLACEHOLDER_NAME_LOCALE = "locale";
    public static final String PLACEHOLDER_NAME_LOCALE_WITH_UNDERSCORE = "locale_with_underscore";
    public static final String PLACEHOLDER_NAME_THREE_LETTERS_CODE = "three_letters_code";
    public static final String PLACEHOLDER_NAME_TWO_LETTERS_CODE = "two_letters_code";
    public static final String PLACEHOLDER_NAME_OSX_CODE = "osx_code";
    public static final String PLACEHOLDER_NAME_OSX_LOCALE = "osx_locale";
    public static final String PLACEHOLDER_NAME_LANGUAGE_ID = "language_id";

    public static final String PLACEHOLDER_FILE_EXTENSION = "%file_extension%";
    public static final String PLACEHOLDER_FILE_NAME = "%file_name%";
    public static final String PLACEHOLDER_ORIGINAL_FILE_NAME = "%original_file_name%";
    public static final String PLACEHOLDER_ORIGINAL_PATH = "%original_path%";

    public static final String DOUBLED_ASTERISK = "**";

    private static final String REGEX = "regex";
    private static final String ASTERISK = "*";
    private static final String QUESTION_MARK = "?";
    private static final String DOT = ".";
    private static final String DOT_PLUS = ".+";
    private static final String SET_OPEN_BRACKET = "[";
    private static final String SET_CLOSE_BRACKET = "]";
    public static final String ROUND_BRACKET_OPEN = "(";
    public static final String ROUND_BRACKET_CLOSE = ")";
    public static final String ESCAPE_ROUND_BRACKET_OPEN = isWindows() ? "^(" : "\\(";
    public static final String ESCAPE_ROUND_BRACKET_CLOSE = isWindows() ? "^)" : "\\)";
    private static final String ESCAPE_DOT = isWindows() ? "^." : "\\.";
    private static final String ESCAPE_DOT_REGEX = "\\.";
    private static final String ESCAPE_DOT_PLACEHOLDER = "{ESCAPE_DOT}";
    private static final String ESCAPE_QUESTION = isWindows() ? "^?" : "\\?";
    private static final String ESCAPE_QUESTION_REGEX = "\\?";
    private static final String ESCAPE_QUESTION_PLACEHOLDER = "{ESCAPE_QUESTION_MARK}";
    private static final String ESCAPE_ASTERISK = isWindows() ? "^*" : "\\*";
    private static final String ESCAPE_ASTERISK_REGEX = "\\*";
    private static final String ESCAPE_ASTERISK_PLACEHOLDER = "{ESCAPE_ASTERISK}";
    private static final String ESCAPE_ASTERISK_REPLACEMENT_FROM = ".+" + Utils.PATH_SEPARATOR_REGEX;
    private static final String ESCAPE_ASTERISK_REPLACEMENT_TO = "(.+" + Utils.PATH_SEPARATOR_REGEX + ")?";

    private List<Language> supportedLanguages;
    private List<Language> projectLanguages;
    private String basePath;

    public PlaceholderUtil(List<Language> supportedLanguages, List<com.crowdin.client.languages.model.Language> projectLanguages, String basePath) {
        if (supportedLanguages == null || projectLanguages == null || basePath == null) {
            throw new NullPointerException("in PlaceholderUtil.constructor");
        }
        this.supportedLanguages = supportedLanguages;
        this.projectLanguages = projectLanguages;
        this.basePath = basePath;
    }

    public List<String> format(List<File> sources, List<String> toFormat) {
        if (sources == null || toFormat == null) {
            return new ArrayList<>();
        }
        List<String> res = new ArrayList<>();
        for (String str : toFormat) {
            res.addAll(this.format(sources, str, null));
        }
        return res;
    }

    public List<String> format(List<File> sources, List<String> toFormat, LanguageMapping languageMapping) {
        if (sources == null || toFormat == null) {
            return new ArrayList<>();
        }
        List<String> res = new ArrayList<>();
        for (String str : toFormat) {
            res.addAll(this.format(sources, str, languageMapping));
        }
        return res;
    }

    public Set<String> format(List<File> sources, String toFormat, LanguageMapping languageMapping) {
        if (sources == null || toFormat == null) {
            return new HashSet<>();
        }

        return supportedLanguages.stream()
            .map(lang -> languageMapping == null
                ? this.replaceLanguageDependentPlaceholders(toFormat, lang)
                : this.replaceLanguageDependentPlaceholders(toFormat, languageMapping, lang))
            .flatMap(changedToFormat -> sources.stream()
                    .map(source -> this.replaceFileDependentPlaceholders(changedToFormat, source)))
            .collect(Collectors.toSet());
    }

    public Set<String> format(List<File> sources, String toFormat) {
        return this.format(sources, toFormat, null);
    }

    public String replaceLanguageDependentPlaceholders(String toFormat, Language lang) {
        if (toFormat == null || lang == null) {
            throw new NullPointerException("null args in replaceLanguageDependentPlaceholders()");
        }
        toFormat = toFormat.contains(PLACEHOLDER_LANGUAGE_ID) ? toFormat.replace(PLACEHOLDER_LANGUAGE_ID, lang.getId()) : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_LANGUAGE) ? toFormat.replace(PLACEHOLDER_LANGUAGE, lang.getName()) : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_LOCALE) ? toFormat.replace(PLACEHOLDER_LOCALE, lang.getLocale()) : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_LOCALE_WITH_UNDERSCORE)
            ? toFormat.replace(PLACEHOLDER_LOCALE_WITH_UNDERSCORE, lang.getLocale().replace("-", "_")) : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_TWO_LETTERS_CODE)
            ? toFormat.replace(PLACEHOLDER_TWO_LETTERS_CODE, lang.getTwoLettersCode()) : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_THREE_LETTERS_CODE)
            ? toFormat.replace(PLACEHOLDER_THREE_LETTERS_CODE, lang.getThreeLettersCode()) : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_ANDROID_CODE) ? toFormat.replace(PLACEHOLDER_ANDROID_CODE, lang.getAndroidCode()) : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_OSX_LOCALE) ? toFormat.replace(PLACEHOLDER_OSX_LOCALE, lang.getOsxLocale()) : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_OSX_CODE) ? toFormat.replace(PLACEHOLDER_OSX_CODE, lang.getOsxCode()) : toFormat;
        return toFormat;
    }

    public List<String> replaceLanguageDependentPlaceholders(String toFormat, LanguageMapping languageMapping) {
        return projectLanguages
            .stream()
            .map(lang -> replaceLanguageDependentPlaceholders(toFormat, languageMapping, lang))
            .collect(Collectors.toList());
    }

    public String replaceLanguageDependentPlaceholders(String toFormat, LanguageMapping langMapping, Language lang) {
        if (toFormat == null || lang == null || langMapping == null) {
            throw new NullPointerException("null args in replaceLanguageDependentPlaceholders()");
        }
        toFormat = toFormat.contains(PLACEHOLDER_LANGUAGE_ID)
            ? toFormat.replace(PLACEHOLDER_LANGUAGE_ID, langMapping.getValueOrDefault(lang.getId(), PLACEHOLDER_NAME_LANGUAGE_ID, lang.getId()))
            : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_LANGUAGE)
            ? toFormat.replace(PLACEHOLDER_LANGUAGE,
            langMapping.getValueOrDefault(lang.getId(), PLACEHOLDER_NAME_LANGUAGE,
                langMapping.getValueOrDefault(lang.getId(), PLACEHOLDER_NAME_LANGUAGE_2, lang.getName())))
            : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_LOCALE)
            ? toFormat.replace(PLACEHOLDER_LOCALE, langMapping.getValueOrDefault(lang.getId(), PLACEHOLDER_NAME_LOCALE, lang.getLocale()))
            : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_LOCALE_WITH_UNDERSCORE)
            ? toFormat.replace(PLACEHOLDER_LOCALE_WITH_UNDERSCORE,
            langMapping.getValueOrDefault(lang.getId(), PLACEHOLDER_NAME_LOCALE_WITH_UNDERSCORE, lang.getLocale().replace("-", "_")))
            : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_TWO_LETTERS_CODE)
            ? toFormat.replace(PLACEHOLDER_TWO_LETTERS_CODE,
            langMapping.getValueOrDefault(lang.getId(), PLACEHOLDER_NAME_TWO_LETTERS_CODE, lang.getTwoLettersCode()))
            : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_THREE_LETTERS_CODE)
            ? toFormat.replace(PLACEHOLDER_THREE_LETTERS_CODE,
            langMapping.getValueOrDefault(lang.getId(), PLACEHOLDER_NAME_THREE_LETTERS_CODE, lang.getThreeLettersCode()))
            : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_ANDROID_CODE)
            ? toFormat.replace(PLACEHOLDER_ANDROID_CODE, langMapping.getValueOrDefault(lang.getId(), PLACEHOLDER_NAME_ANDROID_CODE, lang.getAndroidCode()))
            : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_OSX_LOCALE)
            ? toFormat.replace(PLACEHOLDER_OSX_LOCALE, langMapping.getValueOrDefault(lang.getId(), PLACEHOLDER_NAME_OSX_LOCALE, lang.getOsxLocale()))
            : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_OSX_CODE)
            ? toFormat.replace(PLACEHOLDER_OSX_CODE, langMapping.getValueOrDefault(lang.getId(), PLACEHOLDER_NAME_OSX_CODE, lang.getOsxCode()))
            : toFormat;
        return toFormat;
    }

    /**
     * Builds destination file path from pattern. Mostly used with TranslationsUtils.replaceDoubleAsterisks()
     * @param toFormat pattern to change
     * @param file file
     * @return built destination file path
     */
    public String replaceFileDependentPlaceholders(String toFormat, File file) {
        if (toFormat == null || file == null) {
            throw new NullPointerException("null args in replaceFileDependentPlaceholders()");
        }
        String fileName = file.getName();
        String filePath = Utils.toUnixPath(file.getPath());
        String fileNameWithoutExt = FilenameUtils.removeExtension(fileName);
        String fileExt = FilenameUtils.getExtension(fileName);
        String tempBasePath = basePath;
        String fileParent = Utils.noSepAtEnd(StringUtils.removeStart((file.getParent() != null ? file.getParent() + Utils.PATH_SEPARATOR : ""), tempBasePath));

        toFormat = toFormat.contains(PLACEHOLDER_ORIGINAL_FILE_NAME) ? toFormat.replace(PLACEHOLDER_ORIGINAL_FILE_NAME, fileName) : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_FILE_NAME) ? toFormat.replace(PLACEHOLDER_FILE_NAME, fileNameWithoutExt) : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_FILE_EXTENSION) ? toFormat.replace(PLACEHOLDER_FILE_EXTENSION, fileExt) : toFormat;
        toFormat = toFormat.contains(PLACEHOLDER_ORIGINAL_PATH) ? toFormat.replace(PLACEHOLDER_ORIGINAL_PATH, fileParent) : toFormat;
        toFormat = toFormat.replace("/", File.separator);

        if (toFormat.contains("**")) {
            String prefixFormat = StringUtils.substringBefore(toFormat, "**");
            String substringAfter = StringUtils.substringAfter(toFormat, "**");
            //making sure "substringAfter" has full file path part that goes after "**"
            if (substringAfter.length() > 1 && !filePath.endsWith(substringAfter) && filePath.contains(substringAfter)) {
                String[] parts = filePath.split(substringAfter);
                substringAfter = Utils.joinPaths(substringAfter, parts[parts.length - 1]);
            }
            String postfix = Utils.getParentDirectory(substringAfter);
            String prefix = prefixFormat.length() > 1 && filePath.contains(prefixFormat) ? StringUtils.substringBefore(fileParent, Utils.noSepAtStart(prefixFormat)) : "";
            String doubleAsterisks =
                StringUtils.removeStart(Utils.noSepAtStart(StringUtils.removeStart(fileParent, prefix)), Utils.noSepAtEnd(Utils.noSepAtStart(prefixFormat)));
            doubleAsterisks = postfix.length() > 1 ? StringUtils.removeEnd(doubleAsterisks, Utils.noSepAtEnd(postfix)) : doubleAsterisks;
            toFormat = toFormat.replace("**", doubleAsterisks);
        }

        toFormat = toFormat.replaceAll("[\\\\/]+", Utils.PATH_SEPARATOR_REGEX);
        return StringUtils.removeStart(toFormat, Utils.PATH_SEPARATOR);
    }

    public List<String> formatForRegex(List<String> toFormat) {
        String langIds = supportedLanguages.stream().map(Language::getId).collect(Collectors.joining("|", "(", ")"));
        String langNames = supportedLanguages.stream().map(Language::getName).collect(Collectors.joining("|", "(", ")"));
        String langLocales = supportedLanguages.stream().map(Language::getLocale).collect(Collectors.joining("|", "(", ")"));
        String langLocalesWithUnderscore = supportedLanguages.stream().map(Language::getLocale).map(s -> s.replace("-", "_"))
            .collect(Collectors.joining("|", "(", ")"));
        String langTwoLettersCodes = supportedLanguages.stream().map(Language::getTwoLettersCode).collect(Collectors.joining("|", "(", ")"));
        String langThreeLettersCodes = supportedLanguages.stream().map(Language::getThreeLettersCode).collect(Collectors.joining("|", "(", ")"));
        String langAndroidCodes = supportedLanguages.stream().map(Language::getAndroidCode).collect(Collectors.joining("|", "(", ")"));
        String langOsxLocales = supportedLanguages.stream().map(Language::getOsxLocale).collect(Collectors.joining("|", "(", ")"));
        String langOsxCodes = supportedLanguages.stream().map(Language::getOsxCode).collect(Collectors.joining("|", "(", ")"));
        return toFormat.stream()
            .map(PlaceholderUtil::formatSourcePatternForRegex)
            .map(s -> s
                .replace(PLACEHOLDER_LANGUAGE_ID, langIds)
                .replace(PLACEHOLDER_LANGUAGE, langNames)
                .replace(PLACEHOLDER_LOCALE, langLocales)
                .replace(PLACEHOLDER_LOCALE_WITH_UNDERSCORE, langLocalesWithUnderscore)
                .replace(PLACEHOLDER_TWO_LETTERS_CODE, langTwoLettersCodes)
                .replace(PLACEHOLDER_THREE_LETTERS_CODE, langThreeLettersCodes)
                .replace(PLACEHOLDER_ANDROID_CODE, langAndroidCodes)
                .replace(PLACEHOLDER_OSX_LOCALE, langOsxLocales)
                .replace(PLACEHOLDER_OSX_CODE, langOsxCodes))
            .map(s -> "^" + s + "$")
            .collect(Collectors.toList());
    }

    public static String formatSourcePatternForRegex(String toFormat) {
        if (isWindows()) {
            toFormat = toFormat
                .replace("\\", "\\\\");
        }
        toFormat = toFormat
            .replace(ESCAPE_DOT, ESCAPE_DOT_PLACEHOLDER)
            .replace(DOT, ESCAPE_DOT_REGEX)
            .replace(ESCAPE_DOT_PLACEHOLDER, ESCAPE_DOT)

            .replace(ESCAPE_QUESTION, ESCAPE_QUESTION_PLACEHOLDER)
            .replace(QUESTION_MARK, "[^/]")
            .replace(ESCAPE_QUESTION_PLACEHOLDER, ESCAPE_QUESTION);

        toFormat = toFormat
            .replace(ESCAPE_ASTERISK, ESCAPE_ASTERISK_PLACEHOLDER)
            .replace("**", ".+")
            .replace(ESCAPE_ASTERISK_PLACEHOLDER, ESCAPE_ASTERISK)

            .replace(ESCAPE_ASTERISK, ESCAPE_ASTERISK_PLACEHOLDER)
            .replace(ASTERISK, "[^/]+")
            .replace(ESCAPE_ASTERISK_PLACEHOLDER, ESCAPE_ASTERISK);

        toFormat = toFormat
            .replace(ROUND_BRACKET_OPEN, ESCAPE_ROUND_BRACKET_OPEN)
            .replace(ROUND_BRACKET_CLOSE, ESCAPE_ROUND_BRACKET_CLOSE)
            .replace(ESCAPE_ASTERISK_REPLACEMENT_FROM, ESCAPE_ASTERISK_REPLACEMENT_TO);

        if (isWindows()) {
            toFormat = toFormat
                .replace(ESCAPE_ASTERISK, ESCAPE_ASTERISK_REGEX)
                .replace(ESCAPE_DOT, ESCAPE_DOT_REGEX)
                .replace(ESCAPE_QUESTION, ESCAPE_QUESTION_REGEX);
        }
        return toFormat
            .replace(PLACEHOLDER_FILE_EXTENSION, "[^/]+")
            .replace(PLACEHOLDER_FILE_NAME, "[^/]+")
            .replace(PLACEHOLDER_ORIGINAL_FILE_NAME, "[^/]+")
            .replace(PLACEHOLDER_ORIGINAL_PATH, ".+");
    }

    public static boolean containsFilePlaceholders(String pattern) {
        return StringUtils.containsAny(pattern,
            PLACEHOLDER_FILE_EXTENSION,
            PLACEHOLDER_FILE_NAME,
            PLACEHOLDER_ORIGINAL_FILE_NAME,
            PLACEHOLDER_ORIGINAL_PATH);
    }

    public static boolean containsLangPlaceholders(String translationsPattern) {
        return StringUtils.containsAny(translationsPattern,
            PLACEHOLDER_LANGUAGE,
            PLACEHOLDER_TWO_LETTERS_CODE,
            PLACEHOLDER_THREE_LETTERS_CODE,
            PLACEHOLDER_LOCALE_WITH_UNDERSCORE,
            PLACEHOLDER_LOCALE,
            PLACEHOLDER_ANDROID_CODE,
            PLACEHOLDER_OSX_CODE,
            PLACEHOLDER_OSX_LOCALE);
    }
}

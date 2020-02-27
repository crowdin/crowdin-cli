package com.crowdin.cli.utils;

import com.crowdin.common.models.Language;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class PlaceholderUtil {

    protected static final String PLACEHOLDER_ANDROID_CODE = "%android_code%";
    protected static final String PLACEHOLDER_FILE_EXTENTION = "%file_extension%";
    protected static final String PLACEHOLDER_FILE_NAME = "%file_name%";
    protected static final String PLACEHOLDER_LANGUAGE = "%language%";
    protected static final String PLACEHOLDER_LOCALE = "%locale%";
    protected static final String PLACEHOLDER_LOCALE_WITH_UNDERSCORE = "%locale_with_underscore%";
    protected static final String PLACEHOLDER_THREE_LETTERS_CODE = "%three_letters_code%";
    protected static final String PLACEHOLDER_TWO_LETTERS_CODE = "%two_letters_code%";
    protected static final String PLACEHOLDER_OSX_CODE = "%osx_code%";
    protected static final String PLACEHOLDER_OSX_LOCALE = "%osx_locale%";
    protected static final String PLACEHOLDER_ORIGINAL_FILE_NAME = "%original_file_name%";
    protected static final String PLACEHOLDER_ORIGINAL_PATH = "%original_path%";

    private List<Language> supportedLangs;
    private List<Language> projectLangs;
    private String basePath;

    public PlaceholderUtil(List<Language> supportedLangs, List<Language> projectLangs, String basePath) {
        if (supportedLangs == null || projectLangs == null || basePath == null) {
            throw new NullPointerException("in PlaceholderUtil.contructor");
        }
        this.supportedLangs = supportedLangs;
        this.projectLangs = projectLangs;
        this.basePath = basePath;
    }

    public List<String> format(List<File> sources, List<String> toFormat, boolean onProjectLangs) {
        if (sources == null || toFormat == null) {
            return new ArrayList<>();
        }
        List<String> res = new ArrayList<>();
        for(String str : toFormat) {
            res.addAll(this.format(sources, str, onProjectLangs));
        }
        return res;
    }

    public List<String> format(List<File> sources, String toFormat, boolean onProjectLangs) {
        if (sources == null || toFormat == null)
            return new ArrayList<>();
        List<Language> languages = (onProjectLangs ? projectLangs : supportedLangs);
        List<String> result = languages.stream()
                .map(lang -> this.replaceLanguageDependentPlaceholders(toFormat, lang))
                .flatMap(changedToFormat -> sources.stream()
                        .map(source -> this.replaceFileDependentPlaceholders(changedToFormat, source)))
                .collect(Collectors.toList());
        return result;
    }

    public String format(File source, String toFormat, Language language) {
        if (source == null || toFormat == null || language == null) {
            throw new RuntimeException("null arg in PlaceholderUtil.format()");
        }
        String afterLanguageReplaced = this.replaceLanguageDependentPlaceholders(toFormat, language);
        return this.replaceFileDependentPlaceholders(afterLanguageReplaced, source);
    }

    public List<String> replaceLanguageDependentPlaceholders(String toFormat) {
        return projectLangs
            .stream()
            .map(lang -> replaceLanguageDependentPlaceholders(toFormat, lang))
            .collect(Collectors.toList());
    }

    public String replaceLanguageDependentPlaceholders(String toFormat, Language lang) {
        if (toFormat == null || lang == null) {
            throw new NullPointerException("null args in replaceLanguageDependentPlaceholders()");
        }
        return toFormat
                .replace(PLACEHOLDER_LANGUAGE, lang.getName())
                .replace(PLACEHOLDER_LOCALE, lang.getLocale())
                .replace(PLACEHOLDER_LOCALE_WITH_UNDERSCORE, lang.getLocale().replace("-", "_"))
                .replace(PLACEHOLDER_TWO_LETTERS_CODE, lang.getTwoLettersCode())
                .replace(PLACEHOLDER_THREE_LETTERS_CODE, lang.getThreeLettersCode())
                .replace(PLACEHOLDER_ANDROID_CODE, lang.getAndroidCode())
                .replace(PLACEHOLDER_OSX_LOCALE, lang.getOsxLocale())
                .replace(PLACEHOLDER_OSX_CODE, lang.getOsxCode());
    }

    public List<String> replaceLanguageDependentPlaceholders(String toFormat, Map<String, Map<String, String>> languageMapping) {
        return projectLangs
            .stream()
            .map(lang -> replaceLanguageDependentPlaceholders(toFormat, languageMapping, lang))
            .collect(Collectors.toList());
    }

    public String replaceLanguageDependentPlaceholders(String toFormat, Map<String, Map<String, String>> languageMapping, Language lang) {
        if (toFormat == null || lang == null || languageMapping == null) {
            throw new NullPointerException("null args in replaceLanguageDependentPlaceholders()");
        }
        toFormat = replaceWithMapping(toFormat, PLACEHOLDER_LANGUAGE, lang.getName(), languageMapping);
        toFormat = replaceWithMapping(toFormat, PLACEHOLDER_LOCALE, lang.getLocale(), languageMapping);
        toFormat = replaceWithMapping(toFormat, PLACEHOLDER_LOCALE_WITH_UNDERSCORE, lang.getLocale().replace("-", "_"), languageMapping);
        toFormat = replaceWithMapping(toFormat, PLACEHOLDER_TWO_LETTERS_CODE, lang.getTwoLettersCode(), languageMapping);
        toFormat = replaceWithMapping(toFormat, PLACEHOLDER_THREE_LETTERS_CODE, lang.getThreeLettersCode(), languageMapping);
        toFormat = replaceWithMapping(toFormat, PLACEHOLDER_ANDROID_CODE, lang.getAndroidCode(), languageMapping);
        toFormat = replaceWithMapping(toFormat, PLACEHOLDER_OSX_LOCALE, lang.getOsxLocale(), languageMapping);
        return replaceWithMapping(toFormat, PLACEHOLDER_OSX_CODE, lang.getOsxCode(), languageMapping);
    }

    private String replaceWithMapping(String toFormat, String placeholder, String code, Map<String, Map<String, String>> langMapping) {
        return toFormat.replace(
                placeholder,
                langMapping.containsKey(placeholder.replaceAll("%", ""))
                    ? langMapping.get(placeholder.replaceAll("%", "")).getOrDefault(code, code)
                    : code);
    }

    public String replaceFileDependentPlaceholders(String toFormat, File file) {
        if (toFormat == null || file == null) {
            throw new NullPointerException("null args in replaceFileDependentPlaceholders()");
        }
        String fileName = file.getName();
        String fileNameWithoutExt = FilenameUtils.removeExtension(fileName);
        String fileExt = FilenameUtils.getExtension(fileName);
        String tempBasePath = basePath;
        String fileParent = StringUtils.removeStart((file.getParent() != null ? file.getParent() + Utils.PATH_SEPARATOR : ""), tempBasePath);
        return toFormat
                .replace(PLACEHOLDER_ORIGINAL_FILE_NAME, fileName)
                .replace(PLACEHOLDER_FILE_NAME, fileNameWithoutExt)
                .replace(PLACEHOLDER_FILE_EXTENTION, fileExt)
                .replace(PLACEHOLDER_ORIGINAL_PATH, fileParent)
                .replace(Utils.PATH_SEPARATOR + "**", fileParent)
                .replaceAll("[\\\\/]+", Utils.PATH_SEPARATOR_REGEX);
    }
}

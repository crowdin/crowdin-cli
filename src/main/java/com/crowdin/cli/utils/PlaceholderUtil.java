package com.crowdin.cli.utils;

import com.crowdin.cli.utils.console.ConsoleUtils;
import com.crowdin.common.models.Language;
import org.apache.commons.io.FilenameUtils;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class PlaceholderUtil {

//    TODO: deal with PLACEHOLDER_%PLACEHOLDER_NAME%
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

    private List<Language> langs;
    private String basePath;

//    Both suppLangs and projLangs are here because of the original method CommandUtils.getTranslations
//    I hope Language knows how to .equals()
    public PlaceholderUtil(List<Language> supportedLangs, List<Language> projectLangs, String basePath) {
        if (supportedLangs == null || projectLangs == null || basePath == null)
            throw new NullPointerException("in PlaceholderUtil.contructor");
        langs = new ArrayList<>();
        for(Language projectLang : projectLangs) {
            if (supportedLangs.contains(projectLang)) {
                langs.add(projectLang);
            } else {
                ConsoleUtils.exitError(); //I do not like that choice
            }
        }
        this.basePath = basePath;
    }

    public List<String> format(List<File> sources, List<String> toFormat) {
        if (sources == null || toFormat == null)
            throw new NullPointerException("in PlaceholderUtil.format(for multiple)");
        List<String> res = new ArrayList<>();
        for(String str : toFormat) {
            res.addAll(format(sources, str));
        }
        return res;
    }

    public List<String> format(List<File> sources, String toFormat) {
        if (sources == null || toFormat == null)
            throw new NullPointerException("in PlaceholderUtil.format(for single");
        List<String> result = new ArrayList<>();
        for(Language lang : langs) {
            String changedToFormat = toFormat
                    .replace(PLACEHOLDER_LANGUAGE, lang.getName())
                    .replace(PLACEHOLDER_LOCALE, lang.getLocale())
                    .replace(PLACEHOLDER_LOCALE_WITH_UNDERSCORE, lang.getLocale().replace("-", "_"))
                    .replace(PLACEHOLDER_TWO_LETTERS_CODE, lang.getTwoLettersCode())
                    .replace(PLACEHOLDER_THREE_LETTERS_CODE, lang.getThreeLettersCode())
                    .replace(PLACEHOLDER_ANDROID_CODE, lang.getAndroidCode())
                    .replace(PLACEHOLDER_OSX_LOCALE, lang.getOsxLocale())
                    .replace(PLACEHOLDER_OSX_CODE, lang.getOsxCode());
//            No separator checks on basePath and sources, because they should be in accepting those strings, not now
            for(File source : sources) {
                String fileName = source.getName();
                String fileNameWithoutExt = FilenameUtils.removeExtension(fileName);
                String fileExt = FilenameUtils.getExtension(fileName);
                String fileParent = source.getParent().replaceFirst(basePath, "");
                String changed2ToFormat = changedToFormat
                        .replace(PLACEHOLDER_ORIGINAL_FILE_NAME, fileName)
                        .replace(PLACEHOLDER_FILE_NAME, fileNameWithoutExt)
                        .replace(PLACEHOLDER_FILE_EXTENTION, fileExt)
                        .replace(PLACEHOLDER_ORIGINAL_PATH, fileParent);
//                now sure about double asterisks
//                TODO: Make sure the next line works as it should
                changed2ToFormat = changed2ToFormat.replace("/**", fileParent);
                result.add(basePath + changed2ToFormat);
            }
        }
        return result;
    }
}

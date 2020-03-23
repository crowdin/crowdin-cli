package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.properties.helper.FileHelper;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.util.List;
import java.util.stream.Stream;

public class SourcesUtils {

    public static Stream<File> getFiles(String basePath, String sourcePattern, List<String> ignorePattern, PlaceholderUtil placeholderUtil) {
        if (basePath == null || sourcePattern == null || placeholderUtil == null) {
            throw new NullPointerException("null args in SourceUtils.getFiles");
        }
        FileHelper fileHelper = new FileHelper(basePath);
        List<File> sources = fileHelper.getFiles(sourcePattern);
        List<String> formattedIgnores = placeholderUtil.format(sources, ignorePattern, false);
        return fileHelper.filterOutIgnoredFiles(sources, formattedIgnores)
            .stream()
            .filter(File::isFile);
    }

    public static boolean containsPattern(String sourcePattern) {
        if (sourcePattern == null) {
            return false;
        }
        return sourcePattern.contains("**")
            || sourcePattern.contains("*")
            || sourcePattern.contains("?")
            || (sourcePattern.contains("[") && sourcePattern.contains("]"))
            || (sourcePattern.contains("\\") && !Utils.isWindows());
    }

    public static String getCommonPath(Stream<String> sources, String basePath) {
        String commonPrefix = StringUtils.getCommonPrefix(sources.toArray(String[]::new));
        String result = commonPrefix.substring(0, commonPrefix.lastIndexOf(Utils.PATH_SEPARATOR)+1);
        result = StringUtils.removeStart(result, basePath);
        return result;
    }

    public static boolean isFileProperties(File source) {
        return FilenameUtils.isExtension(source.getName(), "properties");
    }
}

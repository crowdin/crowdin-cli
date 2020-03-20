package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.properties.helper.FileHelper;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;

import java.io.File;
import java.util.List;
import java.util.stream.Stream;

public class SourcesUtils {

    public static Stream<File> getFiles(String basePath, String sourcePattern, List<String> ignorePattern, PlaceholderUtil placeholderUtil) {
        if (basePath == null || sourcePattern == null || placeholderUtil == null) {
            throw new NullPointerException("null args in SourceUtils.getFiles");
        }
        FileHelper fileHelper = new FileHelper(basePath);
        List<File> sources = fileHelper.getFileSource(sourcePattern);
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
}

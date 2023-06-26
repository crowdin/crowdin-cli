package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.properties.helper.FileHelper;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import lombok.NonNull;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static java.util.Arrays.asList;

public class SourcesUtils {
    public static Stream<File> getFiles(String basePath, String sourcePattern, List<String> ignorePattern, PlaceholderUtil placeholderUtil) {
        if (basePath == null || sourcePattern == null || placeholderUtil == null) {
            throw new NullPointerException("null args in SourceUtils.getFiles");
        }
        FileHelper fileHelper = new FileHelper(basePath);
        String relativePath = StringUtils.removeStart(sourcePattern, basePath);
        List<File> sources = fileHelper.getFiles(relativePath);
        List<String> formattedIgnores = placeholderUtil.format(sources, ignorePattern, false);
        return fileHelper.filterOutIgnoredFiles(sources, formattedIgnores)
            .stream()
            .filter(File::isFile);
    }

    public static List<String> filterProjectFiles(
        List<String> filePaths, String sourcePattern, List<String> ignorePatterns, boolean preserveHierarchy, PlaceholderUtil placeholderUtil
    ) {
        filePaths = filePaths.stream().map((Utils.isWindows() ? Utils::windowsPath : Utils::unixPath)).map(Utils::noSepAtStart).collect(Collectors.toList());
        sourcePattern = Utils.noSepAtStart(Utils.isWindows() ? Utils.windowsPath(sourcePattern) : Utils.unixPath(sourcePattern));
        ignorePatterns = (ignorePatterns != null)
            ? ignorePatterns.stream().map((Utils.isWindows() ? Utils::windowsPath : Utils::unixPath)).map(Utils::noSepAtStart).collect(Collectors.toList()) : Collections.emptyList();

        Predicate<String> sourcePredicate;
        Predicate<String> ignorePredicate;
        if (preserveHierarchy) {
            sourcePredicate = Pattern.compile("^" + PlaceholderUtil.formatSourcePatternForRegex(sourcePattern) + "$").asPredicate();
            ignorePredicate = placeholderUtil.formatForRegex(ignorePatterns, false).stream()
                .map(Pattern::compile)
                .map(Pattern::asPredicate)
                .map(Predicate::negate)
                .reduce((s) -> true, Predicate::and);
        } else {
            List<Pattern> patternPaths = Arrays.stream(sourcePattern.split(Pattern.quote(File.separator)))
                .map(pathSplit -> Pattern.compile("^" + PlaceholderUtil.formatSourcePatternForRegex(pathSplit) + "$"))
                .collect(Collectors.toList());
            Collections.reverse(patternPaths);
            sourcePredicate = (filePath) -> {
                List<String> filePathSplit = asList(filePath.split("/+"));
                Collections.reverse(filePathSplit);
                for (int i = 0; true; i++) {
                    if (i >= filePathSplit.size()) {
                        return true;
                    } else if (i >= patternPaths.size()) {
                        return false;
                    } else if (patternPaths.get(i).pattern().equals("^.+$")) {
                        return true;
                    } else if (!patternPaths.get(i).matcher(filePathSplit.get(i)).matches()) {
                        return false;
                    }
                }
            };
            ignorePredicate = ignorePatterns.stream()
                .map(ignorePattern -> {
                    List<String> ignorePatternPaths = placeholderUtil.formatForRegex(asList(ignorePattern.split(Pattern.quote(File.separator))), false);
                    Collections.reverse(ignorePatternPaths);
                    return ignorePatternPaths;
                })
                .map(path -> path.stream().map(Pattern::compile).collect(Collectors.toList()))
                .map(ignorePatternPaths -> (Predicate<String>) (filePath) -> {
                    List<String> filePathSplit = asList(filePath.split("[\\\\/]+"));
                    Collections.reverse(filePathSplit);
                    for (int i = 0; true; i++) {
                        if (i > filePathSplit.size()) {
                            return true;
                        } else if (i >= ignorePatternPaths.size()) {
                            return true;
                        } else if (ignorePatternPaths.get(i).pattern().equals("^.+$")) {
                            return false;
                        } else if (i >= filePathSplit.size()) {
                            return true;
                        }
                        if (!ignorePatternPaths.get(i).matcher(filePathSplit.get(i)).matches()) {
                            return true;
                        } else if (ignorePatternPaths.size() - 1 == i) {
                            return false;
                        }
                    }
                })
                .reduce((s) -> true, Predicate::and);
        }
        return filePaths.stream()
            .filter(sourcePredicate)
            .filter(ignorePredicate)
            .map(Utils::normalizePath)
            .collect(Collectors.toList());
    }

    /**
     * Try to replace ‘*’ with ‘source’ param and project file path.
     * If project file path (or part of it) does not match the pattern, do nothing.
     * @param sourcePattern should contain '*'
     * @param projectFile
     * @return
     */
    public static String replaceUnaryAsterisk(@NonNull String sourcePattern, @NonNull String projectFile) {
        String[] parts = Utils.splitPath(sourcePattern);
        String [] fileParts = Utils.splitPath(projectFile);
        for (int i = 1; i <= parts.length; i++) {
            if (!parts[parts.length-i].equals("**")
                    && fileParts.length >= i
                    && Pattern.matches(PlaceholderUtil.formatSourcePatternForRegex(parts[parts.length-i]), fileParts[fileParts.length-i])) {
                parts[parts.length-i] = fileParts[fileParts.length-i];
            }
        }
        return Utils.joinPaths(parts);
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

    public static String getCommonPath(List<String> sources, String basePath) {
        String commonPrefix = StringUtils.getCommonPrefix(sources.toArray(new String[0]));
        String result = commonPrefix.substring(0, commonPrefix.lastIndexOf(Utils.PATH_SEPARATOR) + 1);
        result = StringUtils.removeStart(result, basePath);
        return result;
    }

    public static boolean isFileProperties(File source) {
        return FilenameUtils.isExtension(source.getName(), "properties");
    }
}

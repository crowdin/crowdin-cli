package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.client.LanguageMapping;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.ExportOptions;
import com.crowdin.client.sourcefiles.model.File;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.sourcefiles.model.GeneralFileExportOptions;
import com.crowdin.client.sourcefiles.model.PropertyFileExportOptions;
import lombok.NonNull;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class ProjectFilesUtils {

    public static <T extends FileInfo> Map<String, T> buildFilePaths(
        Map<Long, Directory> directories, Map<Long, Branch> branchNames, List<T> files
    ) {
        Map<Long, String> directoryPaths = buildDirectoryPaths(directories, branchNames);
        Map<String, T> filePathsToId = new HashMap<>();
        files.forEach(fe -> filePathsToId.put(getParentId(fe).map(directoryPaths::get).orElse("") + fe.getName(), fe));
        return filePathsToId;
    }

    public static <T extends FileInfo> Map<String, T> buildFilePaths(
        Map<Long, Directory> directories, List<T> files
    ) {
        Map<Long, String> directoryPaths = buildDirectoryPaths(directories);
        Map<String, T> filePathsToId = new HashMap<>();
        files.forEach(fe -> filePathsToId.put(Optional.ofNullable(fe.getDirectoryId()).map(directoryPaths::get).orElse("") + fe.getName(), fe));
        return filePathsToId;
    }

    public static Map<Long, String> buildDirectoryPaths(Map<Long, Directory> directories, Map<Long, Branch> branches) {
        Map<Long, String> directoryPaths = new HashMap<>();
        directories.forEach((k, dir) ->
            directoryPaths.put(k, buildBranchPath(dir.getBranchId(), branches) + buildDirectoryPath(dir.getId(), directories)));
        branches.keySet().forEach(brId -> directoryPaths.put(brId, buildBranchPath(brId, branches)));
        return directoryPaths;
    }

    public static Map<Long, String> buildDirectoryPaths(Map<Long, Directory> directories) {
        Map<Long, String> directoryPaths = new HashMap<>();
        directories.forEach((k, dir) -> directoryPaths.put(k, buildDirectoryPath(dir.getId(), directories)));
        return directoryPaths;
    }

    public static Map<String, List<String>> buildAllProjectTranslations(
            List<File> projectFiles,
            Map<Long, String> directoryPaths,
            Optional<Long> branchId,
            PlaceholderUtil placeholderUtil,
            LanguageMapping languageMapping,
            String basePath
    ) {
        Map<String, List<String>> allProjectTranslations = new HashMap<>();
        for (File fe : projectFiles) {
            if (branchId.isPresent() && !branchId.get().equals(fe.getBranchId())) {
                continue;
            }
            String path = getParentId(fe).map(directoryPaths::get).orElse("") + fe.getName();
            Stream<String> translations = isMultilingualFile(fe)
                ? Stream.concat(
                    Stream.of(Utils.normalizePath(fe.getName())),
                    placeholderUtil.replaceLanguageDependentPlaceholders(
                        Utils.normalizePath("%language_id%/" + fe.getName()), languageMapping).stream())
                : placeholderUtil.replaceLanguageDependentPlaceholders(Utils.normalizePath(getExportPattern(fe.getExportOptions())), languageMapping)
                    .stream()
                    .map(tr -> placeholderUtil.replaceFileDependentPlaceholders(tr, new java.io.File(basePath + path)))
                    .map(translation -> ((fe.getBranchId() != null) ? directoryPaths.getOrDefault(fe.getBranchId(), "") : "") + translation);
            allProjectTranslations.put(path, translations.collect(Collectors.toList()));
        }
        return allProjectTranslations;
    }

    private static String buildDirectoryPath(Long directoryId, Map<Long, Directory> directories) {
        StringBuilder sb = new StringBuilder();
        if (directoryId != null) {
            Directory dir = directories.get(directoryId);
            while (dir != null) {
                sb.insert(0, dir.getName() + Utils.PATH_SEPARATOR);
                dir = directories.get(dir.getDirectoryId());
            }
        }
        return sb.toString();
    }

    public static String buildBranchPath(Long branchId, Map<Long, Branch> branchNames) {
        return ((branchId != null) ? branchNames.get(branchId).getName() + Utils.PATH_SEPARATOR : "");
    }

    public static <T extends FileInfo> List<T> filterFilesByBranch(List<T> files, Long branchId) {
        return files.stream()
            .filter(f -> Objects.equals(branchId, f.getBranchId()))
            .collect(Collectors.toList());
    }

    private static Optional<Long> getParentId(FileInfo fe) {
        return (fe.getDirectoryId() != null) ? Optional.of(fe.getDirectoryId()) : Optional.ofNullable(fe.getBranchId());
    }

    public static boolean isMultilingualFile(File fe) {
        return getExportPattern(fe.getExportOptions()) == null;
    }

    public static String getExportPattern(ExportOptions exportOptions) {
        if (exportOptions instanceof PropertyFileExportOptions) {
            return ((PropertyFileExportOptions) exportOptions).getExportPattern();
        } else if (exportOptions instanceof GeneralFileExportOptions) {
            return ((GeneralFileExportOptions) exportOptions).getExportPattern();
        } else {
            return null;
        }
    }

    public static Predicate<String> isProjectFilePathSatisfiesPatterns(@NonNull String sourcePattern, List<String> ignorePatterns, boolean preserveHierarchy) {
        Predicate<String> sourcePatternPred;
        Predicate<String> ignorePatternPred;

        if (preserveHierarchy) {
            sourcePatternPred = Pattern.compile("^" + PlaceholderUtil.formatSourcePatternForRegex(Utils.noSepAtStart(sourcePattern)) + "$").asPredicate();
        } else {
            List<String> sourcePatternSplits = Arrays.stream(Utils.splitPath(Utils.noSepAtStart(sourcePattern)))
                .map(PlaceholderUtil::formatSourcePatternForRegex)
                .collect(Collectors.toList());

            StringBuilder sourcePatternRegex = new StringBuilder();
            for (int i = 0; i < sourcePatternSplits.size()-1; i++) {
                sourcePatternRegex.insert(0, "(")
                    .append(sourcePatternSplits.get(i)).append(Utils.PATH_SEPARATOR_REGEX).append(")?");
            }
            sourcePatternRegex.insert(0, "^")
                .append(sourcePatternSplits.get(sourcePatternSplits.size()-1)).append("$");

            sourcePatternPred = Pattern.compile(sourcePatternRegex.toString()).asPredicate();
        }

        if (ignorePatterns != null && !ignorePatterns.isEmpty()) {
            if (preserveHierarchy) {
                ignorePatternPred = ignorePatterns.stream()
                    .map(Utils::noSepAtStart)
                    .map(ignorePattern -> "^" + PlaceholderUtil.formatSourcePatternForRegex(ignorePattern) + "$")
                    .map(Pattern::compile)
                    .map(Pattern::asPredicate)
                    .reduce((s) -> false, Predicate::or);
            } else {
                ignorePatternPred = ignorePatterns.stream()
                    .map(Utils::noSepAtStart)
                    .map(ignorePattern -> {
                        List<String> ignorePatternSplits = Arrays.stream(Utils.splitPath(ignorePattern))
                            .map(PlaceholderUtil::formatSourcePatternForRegex)
                            .collect(Collectors.toList());
                        StringBuilder ignorePatternRegex = new StringBuilder();
                        for (int i = 0; i < ignorePatternSplits.size()-1; i++) {
                            ignorePatternRegex.insert(0, "(")
                                .append(ignorePatternSplits.get(i)).append(Utils.PATH_SEPARATOR_REGEX).append(")?");
                        }
                        ignorePatternRegex.insert(0, "^")
                            .append(ignorePatternSplits.get(ignorePatternSplits.size()-1)).append("$");
                        return ignorePatternRegex.toString();
                    })
                    .map(Pattern::compile)
                    .map(Pattern::asPredicate)
                    .reduce((s) -> false, Predicate::or);
            }
        } else {
            ignorePatternPred = (projectFilePath) -> false;
        }
        return (projectFilePath) -> !ignorePatternPred.test(projectFilePath) && sourcePatternPred.test(projectFilePath);
    }
}

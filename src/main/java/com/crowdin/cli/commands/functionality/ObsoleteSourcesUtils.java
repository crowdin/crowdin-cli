package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.utils.Utils;
import com.crowdin.client.sourcefiles.model.File;
import lombok.NonNull;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class ObsoleteSourcesUtils {

    public static Map<String, File> findObsoleteProjectFiles(
        @NonNull Map<String, File> projectFiles, boolean preserveHierarchy,
        @NonNull List<String> filesToUpload, @NonNull String sourcePattern, @NonNull String exportPattern, List<String> ignorePatterns
    ) {
        Predicate<String> patternCheck =
            ProjectFilesUtils.isProjectFilePathSatisfiesPatterns(sourcePattern, ignorePatterns, preserveHierarchy);
        return projectFiles.entrySet().stream()
            .filter(entry -> patternCheck.test(entry.getKey()))
            .filter(entry -> checkExportPattern(exportPattern, entry.getValue(), preserveHierarchy))
            .filter(entry -> isFileNotInList(filesToUpload, entry.getKey(), preserveHierarchy))
            .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private static boolean checkExportPattern(String exportPattern, File file, boolean preserveHierarchy) {
        String fileExportPattern = ProjectFilesUtils.getExportPattern(file.getExportOptions());
        if (fileExportPattern == null) {
            return true;
        }

        Predicate<String> patternPred = ProjectFilesUtils.isProjectFilePathSatisfiesPatterns(exportPattern, Collections.emptyList(), preserveHierarchy);
        return patternPred.test(Utils.normalizePath(fileExportPattern));
    }

    public static SortedMap<String, Long> findObsoleteProjectDirectories(
        @NonNull Map<String, File> projectFiles, @NonNull Map<String, Long> directoryIds,
        @NonNull List<String> filesToUpload, @NonNull Map<String, File> obsoleteDeletedProjectFiles
    ) {
        List<String> upToDateDirs = filesToUpload.stream()
            .map(Utils::getParentDirectory)
            .collect(Collectors.toList());
        upToDateDirs.addAll(projectFiles.keySet().stream()
            .filter(projectFile -> !obsoleteDeletedProjectFiles.containsKey(projectFile))
            .map(Utils::getParentDirectory)
            .collect(Collectors.toSet()));
        for (int i = 0; i < upToDateDirs.size(); i++) {
            String parentDir = Utils.getParentDirectory(upToDateDirs.get(i));
            if (!upToDateDirs.contains(parentDir)) {
                upToDateDirs.add(parentDir);
            }
        }

        List<String> obsoleteDirPaths = obsoleteDeletedProjectFiles.keySet().stream()
            .map(Utils::getParentDirectory)
            .distinct()
            .collect(Collectors.toList());
        for (int i = 0; i < obsoleteDirPaths.size(); i++) {
            String parentDir = Utils.getParentDirectory(obsoleteDirPaths.get(i));
            if (!obsoleteDirPaths.contains(parentDir)) {
                obsoleteDirPaths.add(parentDir);
            }
        }
        obsoleteDirPaths.remove(Utils.PATH_SEPARATOR);

        SortedMap<String, Long> obsoleteDirs = new TreeMap<>(Collections.reverseOrder());
        for (String obsoleteDirPath : obsoleteDirPaths) {
            if (!upToDateDirs.contains(obsoleteDirPath)) {
                obsoleteDirs.put(obsoleteDirPath, directoryIds.get(obsoleteDirPath));
            }
        }
        return obsoleteDirs;
    }

    private static boolean isFileNotInList(List<String> filesToUpload, String filePath, boolean preserveHierarchy) {
        String filePathRegex = "^" + (preserveHierarchy ? "" : Utils.PRESERVE_HIERARCHY_REGEX_PART) + Utils.regexPath(filePath) + "$";
        return filesToUpload.stream()
            .noneMatch(Pattern.compile(filePathRegex).asPredicate());
    }
}

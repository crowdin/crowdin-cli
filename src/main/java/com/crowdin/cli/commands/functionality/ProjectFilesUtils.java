package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.common.models.Branch;
import com.crowdin.common.models.Directory;
import com.crowdin.common.models.FileEntity;

import java.io.File;
import java.util.*;
import java.util.stream.Collectors;

public class ProjectFilesUtils {

    public static Map<String, FileEntity> buildFilePaths(Map<Long, Directory> directories, Map<Long, Branch> branchNames, List<FileEntity> files) {
        Map<Long, String> directoryPaths = buildDirectoryPaths(directories, branchNames);
        Map<String, FileEntity> filePathsToId = new HashMap<>();
        files.forEach(fe -> filePathsToId.put(getParentId(fe).map(directoryPaths::get).orElse("") + fe.getName(), fe));
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
            List<FileEntity> projectFiles,
            Map<Long, String> directoryPaths,
            Optional<Long> branchId,
            PlaceholderUtil placeholderUtil,
            String basePath
    ) {
        Map<String, List<String>> allProjectTranslations = new HashMap<>();
        for (FileEntity fe : projectFiles) {
            if (branchId.isPresent() && !branchId.get().equals(fe.getBranchId())) {
                continue;
            }

            String path = getParentId(fe).map(directoryPaths::get).orElse("") + fe.getName();
            List<String> translations = (fe.getExportOptions() == null || fe.getExportOptions().getExportPattern() == null)
                ? Collections.singletonList((Utils.PATH_SEPARATOR + fe.getName()).replaceAll("[\\\\/]+", Utils.PATH_SEPARATOR_REGEX))
                : placeholderUtil.format(
                    Collections.singletonList(new File(basePath + path)),
                    fe.getExportOptions().getExportPattern().replaceAll("[\\\\/]+", Utils.PATH_SEPARATOR_REGEX),
                false);
            if (!branchId.isPresent() && fe.getBranchId() != null) {
                translations = translations.stream()
                    .map(translation -> directoryPaths.get(fe.getBranchId()) + translation)
                    .collect(Collectors.toList());
            }
            allProjectTranslations.put(path, translations);
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

    private static String buildBranchPath(Long branchId, Map<Long, Branch> branchNames) {
        return ((branchId != null) ? branchNames.get(branchId).getName() + Utils.PATH_SEPARATOR : "");
    }

    private static Optional<Long> getParentId(FileEntity fe) {
        return (fe.getDirectoryId() != null) ? Optional.of(fe.getDirectoryId()) : Optional.ofNullable(fe.getBranchId());
    }
}

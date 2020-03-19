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

    public static Map<String, Long> buildFilePaths(Map<Long, String> directoryPaths, List<FileEntity> files) {
        Map<String, Long> filePathsToId = new HashMap<>();
        files.forEach(fe -> filePathsToId.put(getParentId(fe).map(directoryPaths::get).orElse("") + fe.getName(), fe.getId()));
        return filePathsToId;
    }

    public static Map<Long, String> buildDirectoryPaths(Map<Long, Directory> directories, Map<Long, Branch> branchNames) {
        Map<Long, String> directoryPaths = new HashMap<>();
        for (Long id : directories.keySet()) {
            Directory dir = directories.get(id);
            StringBuilder sb = new StringBuilder(dir.getName()).append(Utils.PATH_SEPARATOR);
            while (dir.getDirectoryId() != null) {
                dir = directories.get(dir.getDirectoryId());
                sb.insert(0, dir.getName() + Utils.PATH_SEPARATOR);
            }
            if (dir.getBranchId() != null) {
                sb.insert(0, branchNames.get(dir.getBranchId()).getName() + Utils.PATH_SEPARATOR);
            }
            directoryPaths.put(id, sb.toString());
        }
        for (Long id : branchNames.keySet()) {
            directoryPaths.put(id, branchNames.get(id).getName() + Utils.PATH_SEPARATOR);
        }
        return directoryPaths;
    }

    public static Map<String, List<String>> buildAllProjectTranslations(
            List<FileEntity> projectFiles,
            Map<Long, Directory> projectDirectories,
            Map<Long, Branch> projectBranches,
            Optional<Long> branchId,
            PlaceholderUtil placeholderUtil,
            String basePath
    ) {
        Map<String, List<String>> allProjectTranslations = new HashMap<>();
        for (FileEntity fe : projectFiles) {
            if (branchId.isPresent() && !branchId.get().equals(fe.getBranchId())) {
                continue;
            }

            String path = (branchId.isPresent())
                ? buildFilePath(fe, projectDirectories)
                : buildFilePath(fe, projectDirectories, projectBranches);
            List<String> translations = (fe.getExportOptions() == null || fe.getExportOptions().getExportPattern() == null)
                ? Collections.singletonList((Utils.PATH_SEPARATOR + fe.getName()).replaceAll("[\\\\/]+", Utils.PATH_SEPARATOR_REGEX))
                : placeholderUtil.format(
                    Collections.singletonList(new File(basePath + path)),
                    fe.getExportOptions().getExportPattern().replaceAll("[\\\\/]+", Utils.PATH_SEPARATOR_REGEX),
                false);
            if (!branchId.isPresent() && fe.getBranchId() != null) {
                translations = translations.stream()
                    .map(translation -> Utils.PATH_SEPARATOR + projectBranches.get(fe.getBranchId()).getName() + translation)
                    .collect(Collectors.toList());
            }
            allProjectTranslations.put(path, translations);
        }
        return allProjectTranslations;
    }

    private static String buildFilePath(FileEntity fe, Map<Long, Directory> directories, Map<Long, Branch> branchNames) {
        return
            ((fe.getBranchId() != null) ? branchNames.get(fe.getBranchId()).getName() + Utils.PATH_SEPARATOR : "")
            + buildFilePath(fe, directories);
    }

    private static String buildFilePath(FileEntity fe, Map<Long, Directory> directories) {
        StringBuilder sb = new StringBuilder(fe.getName());
        if (fe.getDirectoryId() != null) {
            Directory dir = directories.get(fe.getDirectoryId());
            while (dir != null) {
                sb.insert(0, dir.getName() + Utils.PATH_SEPARATOR);
                dir = directories.get(dir.getDirectoryId());
            }
        }
        return sb.toString();
    }

    private static Optional<Long> getParentId(FileEntity fe) {
        return (fe.getDirectoryId() != null) ? Optional.of(fe.getDirectoryId()) : Optional.ofNullable(fe.getBranchId());
    }
}

package com.crowdin.cli.commands.actions.subactions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.sourcefiles.model.File;
import lombok.NonNull;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

/**
 * Deletes obsolete files and obsolete directories(Only those, which will not be used for files to upload). Requires manager access because of use of export patterns
 */
public class DeleteObsoleteProjectFilesSubAction {

    private final Outputter out;
    private final ProjectClient client;

    private Map<String, File> projectFiles;
    private Map<String, Long> directoryIds;
    private Boolean preserveHierarchy;
    private boolean plainView;

    public DeleteObsoleteProjectFilesSubAction(@NonNull Outputter out, @NonNull ProjectClient client) {
        this.out = out;
        this.client = client;
    }

    /**
     * Pass all needed information to perform an action\
     * @param projectFiles all project files in branch. Without branch part. Requires manager access for export patterns
     * @param directoryIds all directories in branch. Without branch part. Deleted directories also removed from this collection
     * @param preserveHierarchy 'preserve_hierarchy' parameter
     * @param plainView plain-view option
     */
    public void setData(@NonNull Map<String, File> projectFiles, @NonNull Map<String, Long> directoryIds, @NonNull Boolean preserveHierarchy, boolean plainView) {
        this.projectFiles = projectFiles;
        this.directoryIds = directoryIds;
        this.preserveHierarchy = preserveHierarchy;
        this.plainView = plainView;
    }

    public void act(@NonNull String destPattern, @NonNull String ignorePatterns, @NonNull List<String> filesToUpload) {
        this.act(destPattern, null, ignorePatterns, filesToUpload);
    }

    public void act(@NonNull String sourcePattern, List<String> ignorePatterns, @NonNull String exportPattern, @NonNull List<String> filesToUpload) {
        filesToUpload = filesToUpload.stream()
            .map(Utils::noSepAtStart)
            .collect(Collectors.toList());
        if (this.projectFiles == null || directoryIds == null || preserveHierarchy == null) {
            throw new IllegalStateException("Unexpected error: DeleteObsoleteProjectFilesSubAction is not properly set");
        }
        Map<String, File> obsoleteProjectFiles = this.findObsoleteFiles(filesToUpload, sourcePattern, exportPattern, ignorePatterns);
        Map<String, Long> obsoleteDirs = this.findObsoleteDirectories(filesToUpload, obsoleteProjectFiles);

        for (String obsoleteProjectFilePath : obsoleteProjectFiles.keySet()) {
            client.deleteSource(obsoleteProjectFiles.get(obsoleteProjectFilePath).getId());
            projectFiles.remove(obsoleteProjectFilePath);
            if (!plainView) {
                out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.delete_obsolete.obsolete_file_delete"), obsoleteProjectFilePath)));
            }
        }
        if (obsoleteProjectFiles.isEmpty() && !plainView) {
            out.println(OK.withIcon(RESOURCE_BUNDLE.getString("message.delete_obsolete.obsolete_directory_delete")));
        }
        for (String obsoleteDirPath : obsoleteDirs.keySet()) {
            client.deleteDirectory(obsoleteDirs.get(obsoleteDirPath));
            directoryIds.remove(obsoleteDirPath);
            if (!plainView) {
                out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.delete_obsolete.no_obsolete_files_found"), obsoleteDirPath)));
            }
        }
        if (obsoleteDirs.isEmpty() && !plainView) {
            out.println(OK.withIcon(RESOURCE_BUNDLE.getString("message.delete_obsolete.no_obsolete_directories_found")));
        }
    }

    private Map<String, File> findObsoleteFiles(List<String> filesToUpload, String pattern, String exportPattern, List<String> ignorePattern) {
        Predicate<String> patternCheck =
            ProjectFilesUtils.isProjectFilePathSatisfiesPatterns(pattern, ignorePattern, this.preserveHierarchy);
        return projectFiles.entrySet().stream()
            .filter(entry -> patternCheck.test(entry.getKey()) && this.checkExportPattern(exportPattern, entry.getValue()))
            .filter(entry -> isFileDontHaveUpdate(filesToUpload, entry.getKey()))
            .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private boolean checkExportPattern(String exportPattern, File file) {
        String fileExportPattern = ProjectFilesUtils.getExportPattern(file.getExportOptions());
        return exportPattern.equals(fileExportPattern != null ? Utils.normalizePath(fileExportPattern) : null);
    }

    private Map<String, Long> findObsoleteDirectories(List<String> filesToUpload, Map<String, File> obsoleteDeletedProjectFiles) {
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

        List<String> obsoleteDirs = obsoleteDeletedProjectFiles.keySet().stream()
            .map(Utils::getParentDirectory)
            .distinct()
            .collect(Collectors.toList());
        for (int i = 0; i < obsoleteDirs.size(); i++) {
            String parentDir = Utils.getParentDirectory(obsoleteDirs.get(i));
            if (!obsoleteDirs.contains(parentDir)) {
                obsoleteDirs.add(parentDir);
            }
        }
        obsoleteDirs.remove(Utils.PATH_SEPARATOR);

        return obsoleteDirs.stream()
            .filter(dir -> !upToDateDirs.contains(dir))
            .collect(Collectors.toMap(Function.identity(), directoryIds::get));
    }

    private boolean isFileDontHaveUpdate(List<String> filesToUpload, String filePath) {
        filePath = (preserveHierarchy) ? filePath : Utils.joinPaths(".*", Utils.sepAtStart(filePath));
        return filesToUpload.stream()
            .noneMatch(Pattern.compile("^" + Utils.regexPath(filePath) + "$").asPredicate());
    }
}
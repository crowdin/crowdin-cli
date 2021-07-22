package com.crowdin.cli.commands.actions.subactions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.ObsoleteSourcesUtils;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.sourcefiles.model.File;
import lombok.NonNull;

import java.util.List;
import java.util.Map;
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
        Map<String, File> obsoleteProjectFiles = ObsoleteSourcesUtils.findObsoleteProjectFiles(this.projectFiles, this.preserveHierarchy, filesToUpload, sourcePattern, exportPattern, ignorePatterns);
        Map<String, Long> obsoleteDirs = ObsoleteSourcesUtils.findObsoleteProjectDirectories(this.projectFiles, this.directoryIds, filesToUpload, obsoleteProjectFiles);

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
}
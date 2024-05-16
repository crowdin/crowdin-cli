package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.client.models.FileBuilder;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.sourcefiles.model.File;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class ObsoleteSourcesUtilsTest {
    private static final Long projectId = 602L;

    private static final Long fileId1 = 42L;
    private static final Long fileId2 = 43L;
    private static final Long directoryId1 = 11L;

    // Issue: https://github.com/crowdin/crowdin-cli/issues/775
    @Test
    public void testFindObsoleteProjectFileWithNullishExportPattern() {
        String projectFile1Path = Utils.normalizePath("test/en/file1.md");
        String projectFile2Path = Utils.normalizePath("test/en/file2.md");

        Map<String, File> projectFilesFromApi = new HashMap<String, File>() {
            {
                put(Utils.normalizePath(projectFile1Path), FileBuilder.standard()
                        .setProjectId(projectId)
                        .setIdentifiers("file1.md", "md", fileId1, directoryId1, null)
                        .setExportPattern(null)
                        .build());
                put(Utils.normalizePath(projectFile2Path), FileBuilder.standard()
                        .setProjectId(projectId)
                        .setIdentifiers("file2.md", "md", fileId2, directoryId1, null)
                        .setExportPattern(null)
                        .build());
            }
        };
        boolean preserveHierarchy = true;
        List<String> filesToUpload = Arrays.asList(Utils.normalizePath(projectFile1Path));
        String sourcePattern = Utils.normalizePath("/test/en/**/*.md");
        String exportPattern = Utils.normalizePath("/test/%two_letters_code%/%original_path%/%original_file_name%");
        List<String> ignorePatterns = Arrays.asList();

        Map<String, File> obsoleteFiles = ObsoleteSourcesUtils.findObsoleteProjectFiles(projectFilesFromApi,
                preserveHierarchy,
                filesToUpload, sourcePattern, exportPattern, ignorePatterns);

        assertEquals(1, obsoleteFiles.size());
        assertEquals(true, obsoleteFiles.containsKey(Utils.normalizePath(projectFile2Path)));
    }

    // Issue: https://github.com/crowdin/crowdin-cli/issues/790
    @Test
    public void testFindObsoleteProjectFileWithDoubleAsteriskExportPattern() {
        String projectFilePath = Utils.normalizePath("someFeature/sources/file1.strings");
        Map<String, File> projectFilesFromApi = new HashMap<String, File>() {
            {
                put(projectFilePath, FileBuilder.standard()
                        .setProjectId(projectId)
                        .setIdentifiers("file1.strings", "strings", fileId1, directoryId1, null)
                        .setExportPattern("/someFeature/translations/%osx_locale%/%original_file_name%")
                        .build());
            }
        };
        boolean preserveHierarchy = true;
        List<String> filesToUpload = Arrays.asList();
        String sourcePattern = Utils.normalizePath("/**/sources/*.strings");
        String exportPattern = Utils.normalizePath("/**/translations/%osx_locale%/%original_file_name%");
        List<String> ignorePatterns = Arrays.asList();

        Map<String, File> obsoleteFiles = ObsoleteSourcesUtils.findObsoleteProjectFiles(projectFilesFromApi,
                preserveHierarchy,
                filesToUpload, sourcePattern, exportPattern, ignorePatterns);

        assertEquals(1, obsoleteFiles.size());
        assertEquals(true, obsoleteFiles.containsKey(projectFilePath));
    }
}

package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.utils.Utils;
import com.crowdin.client.sourcefiles.model.File;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class ObsoleteSourcesUtilsTest {

    @Test
    public void testFindObsoleteProjectFiles() {
        Map<String, File> projectFilesFromApi = new HashMap<String, File>() {
            {
                put(Utils.normalizePath("test/en/test.md"), new File());
                put(Utils.normalizePath("test/en/support.md"), new File());
                put(Utils.normalizePath("test/en/help.md"), new File());
            }
        };
        boolean preserveHierarchy = true;
        List<String> filesToUpload = Arrays.asList(Utils.normalizePath("test/en/test.md"),
                Utils.normalizePath("test/en/help.md"));
        String sourcePattern = Utils.normalizePath("/test/en/*.md");
        String exportPattern = Utils.normalizePath("/test/%two_letters_code%/%original_path%/%original_file_name%");
        List<String> ignorePatterns = Arrays.asList(Utils.normalizePath("**/.*"));

        Map<String, File> obsoleteFiles = ObsoleteSourcesUtils.findObsoleteProjectFiles(projectFilesFromApi,
                preserveHierarchy,
                filesToUpload, sourcePattern, exportPattern, ignorePatterns);

        assertEquals(1, obsoleteFiles.size());
        assertEquals(true, obsoleteFiles.containsKey(Utils.normalizePath("test/en/support.md")));
    }

}

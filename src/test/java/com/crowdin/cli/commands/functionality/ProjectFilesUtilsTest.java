package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.client.models.FileBuilder;
import com.crowdin.client.sourcefiles.model.ExportOptions;
import com.crowdin.client.sourcefiles.model.File;
import com.crowdin.client.sourcefiles.model.GeneralFileExportOptions;
import com.crowdin.client.sourcefiles.model.PropertyFileExportOptions;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class ProjectFilesUtilsTest {

    private static final long TEST_PROJECT_ID = 42;

    @Test
    public void testIsMultilingualFile() {
        File file1NoExportOptions = FileBuilder.standard().setProjectId(TEST_PROJECT_ID)
            .setIdentifiers("first.po", "gettext", 101L, null, null).build();
        File file2NoExportPattern = FileBuilder.standard().setProjectId(TEST_PROJECT_ID)
            .setIdentifiers("first.po", "gettext", 101L, null, null).build();
        file2NoExportPattern.setExportOptions(new PropertyFileExportOptions());
        File file3PropertyFileEO = FileBuilder.standard().setProjectId(TEST_PROJECT_ID)
            .setIdentifiers("first.po", "gettext", 101L, null, null).build();
        file3PropertyFileEO.setExportOptions(new PropertyFileExportOptions() {{
                setExportPattern("anything");
            }}
        );
        File file4GeneralFileEO = FileBuilder.standard().setProjectId(TEST_PROJECT_ID)
            .setIdentifiers("first.po", "gettext", 101L, null, null).build();
        file4GeneralFileEO.setExportOptions(new GeneralFileExportOptions() {{
                setExportPattern("anything");
            }}
        );

        assertTrue(ProjectFilesUtils.isMultilingualFile(file1NoExportOptions));
        assertTrue(ProjectFilesUtils.isMultilingualFile(file2NoExportPattern));
        assertFalse(ProjectFilesUtils.isMultilingualFile(file3PropertyFileEO));
        assertFalse(ProjectFilesUtils.isMultilingualFile(file4GeneralFileEO));


    }
}

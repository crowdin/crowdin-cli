package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.client.models.FileBuilder;
import com.crowdin.client.sourcefiles.model.File;
import com.crowdin.client.sourcefiles.model.GeneralFileExportOptions;
import com.crowdin.client.sourcefiles.model.PropertyFileExportOptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.params.provider.Arguments.arguments;

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

    @ParameterizedTest
    @MethodSource
    @DisabledOnOs(OS.WINDOWS)
    public void isProjectFileSatisfiesThePatternsTest(String projectFilePath, String sourcePattern, List<String> ignorePattern, boolean preserveHierarchy, boolean expected) {
        assertEquals(expected, ProjectFilesUtils.isProjectFilePathSatisfiesPatterns(sourcePattern, ignorePattern, preserveHierarchy).test(projectFilePath));
    }

    private static Stream<Arguments> isProjectFileSatisfiesThePatternsTest() {
        return Stream.of(
            arguments("path/to/file.csv", "/path/to/file.csv", null, true, true),
            arguments("path/to/file.csv", "/path/to/file.csv", null, false, true),
            arguments("path/to/file.csv", "/**/to/file.csv", null, true, true),
            arguments("path/to/file.csv", "/**/%file_name%.csv", Arrays.asList("/path/to/file.csv"), true, false),
            arguments("path/to/file.csv", "/**/%file_name%.csv", Arrays.asList("/**/to/file.csv"), true, false),
            arguments("file.csv", "/path/to/file.csv", null, true, false),
            arguments("file.csv", "/path/to/file.csv", null, false, true),
            arguments("one/path/to/file.csv", "/two/**/to/file.csv", null, true, false),
            arguments("one/path/to/file.csv", "/two/**/to/file.csv", null, false, true),
            arguments("one/path/to/file.csv", "/**/to/file.csv", Arrays.asList("/two/**/to/file.csv"), true, true),
            arguments("one/path/to/file.csv", "/**/to/file.csv", Arrays.asList("/two/**/to/file.csv"), false, false),
            arguments("one/path/to/file.csv", "/**/to/file.csv", Arrays.asList("/one/**/to/file.csv"), true, false),
            arguments("one/path/to/file.csv", "/**/to/file.csv", Arrays.asList("/one/**/to/file.csv"), false, false)
        );
    }

}

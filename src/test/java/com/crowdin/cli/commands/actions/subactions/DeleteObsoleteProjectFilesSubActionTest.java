package com.crowdin.cli.commands.actions.subactions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.models.FileBuilder;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.client.sourcefiles.model.File;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledOnOs;
import org.junit.jupiter.api.condition.OS;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

public class DeleteObsoleteProjectFilesSubActionTest {

    private static final Long projectId = 602L;

    private static final Long fileId1 = 42L;
    private static final Long fileId2 = 43L;
    private static final Long directoryId1 = 11L;
    private static final Long directoryId2 = 12L;
    private static final Long directoryId3 = 13L;
    private static final Long directoryId4 = 14L;

    @Test
    public void testSimple_oneLocalFile_oneProjectFile_noObsolete() {
        final String exportPattern = "/%file_name%.csv";
        Map<String, File> projectFiles = new HashMap<String, File>() {{
           put("file.csv", FileBuilder.standard()
               .setProjectId(projectId)
               .setIdentifiers("file.csv", "csv", fileId1, null, null)
               .setExportPattern(exportPattern)
               .build());
        }};
        List<String> filesToUpload = new ArrayList<String>() {{
           add("file.csv");
        }};
        HashMap<String, Long> directoryIds = new HashMap<>();

        ProjectClient client = mock(ProjectClient.class);

        DeleteObsoleteProjectFilesSubAction subAction = new DeleteObsoleteProjectFilesSubAction(Outputter.getDefault(), client);
        subAction.setData(projectFiles, directoryIds, true, false);
        subAction.act("/*.csv", null, exportPattern, filesToUpload);

        verifyNoMoreInteractions(client);
    }

    @Test
    @DisabledOnOs(OS.WINDOWS)
    public void testSimple_oneLocalFile_twoProjectFile_oneObsolete() {
        final String exportPattern = "/%file_name%.csv";
        final String projectFilePath = "file1.csv";
        final String projectFilePath2 = "file2.csv";
        Map<String, File> projectFiles = new HashMap<String, File>() {{
            put(projectFilePath, FileBuilder.standard()
                .setProjectId(projectId)
                .setIdentifiers("file1.csv", "csv", fileId1, null, null)
                .setExportPattern(exportPattern)
                .build());
            put(projectFilePath2, FileBuilder.standard()
                .setProjectId(projectId)
                .setIdentifiers("file2.csv", "csv", fileId2, null, null)
                .setExportPattern(exportPattern)
                .build());
        }};
        List<String> filesToUpload = new ArrayList<String>() {{
            add(projectFilePath);
        }};
        HashMap<String, Long> directoryIds = new HashMap<>();

        ProjectClient client = mock(ProjectClient.class);

        DeleteObsoleteProjectFilesSubAction subAction = new DeleteObsoleteProjectFilesSubAction(Outputter.getDefault(), client);
        subAction.setData(projectFiles, directoryIds, true, false);
        subAction.act("/*.csv", null, exportPattern, filesToUpload);

        verify(client).deleteSource(fileId2);
        verifyNoMoreInteractions(client);

        assertThat(projectFiles.keySet(), not(hasItem(projectFilePath2)));
    }

    @Test
    public void testSimple_oneLocalFile_twoProjectFile_oneIgnoreProjectFile_noObsolete() {
        final String exportPattern = "/**/%file_name%.csv";
        final String projectFilePath = "path/to/file1.csv";
        String projectFilePath2 = "path/from/file2.csv";
        Map<String, File> projectFiles = new HashMap<String, File>() {{
            put(projectFilePath, FileBuilder.standard()
                .setProjectId(projectId)
                .setIdentifiers("file1.csv", "csv", fileId1, directoryId2, null)
                .setExportPattern(exportPattern)
                .build());
            put(projectFilePath2, FileBuilder.standard()
                .setProjectId(projectId)
                .setIdentifiers("file2.csv", "csv", fileId2, directoryId3, null)
                .setExportPattern(exportPattern)
                .build());
        }};
        List<String> filesToUpload = new ArrayList<String>() {{
            add(projectFilePath);
        }};
        HashMap<String, Long> directoryIds = new HashMap<String, Long>() {{
            put("path/", directoryId1);
            put("path/to/", directoryId2);
            put("path/from/", directoryId3);
        }};

        ProjectClient client = mock(ProjectClient.class);

        DeleteObsoleteProjectFilesSubAction subAction = new DeleteObsoleteProjectFilesSubAction(Outputter.getDefault(), client);
        subAction.setData(projectFiles, directoryIds, true, false);
        subAction.act("/**/*.csv", Arrays.asList("/**/from/*"), exportPattern, filesToUpload);

        verifyNoMoreInteractions(client);
    }

    @Test
    @DisabledOnOs(OS.WINDOWS)
    public void testSimple_oneLocalFile_twoProjectFile_oneObsoleteFile_oneObsoleteDirectory() {
        final String exportPattern = "/**/%file_name%.csv";
        final String projectFilePath = "path/to/file1.csv";
        final String projectFilePath2 = "path/from/file2.csv";
        Map<String, File> projectFiles = new HashMap<String, File>() {{
            put(projectFilePath, FileBuilder.standard()
                .setProjectId(projectId)
                .setIdentifiers("file1.csv", "csv", fileId1, directoryId2, null)
                .setExportPattern(exportPattern)
                .build());
            put(projectFilePath2, FileBuilder.standard()
                .setProjectId(projectId)
                .setIdentifiers("file2.csv", "csv", fileId2, directoryId3, null)
                .setExportPattern(exportPattern)
                .build());
        }};
        List<String> filesToUpload = new ArrayList<String>() {{
            add(projectFilePath);
        }};
        final String dirPath3 = "path/from/";
        HashMap<String, Long> directoryIds = new HashMap<String, Long>() {{
            put("path/", directoryId1);
            put("path/to/", directoryId2);
            put(dirPath3, directoryId3);
        }};

        ProjectClient client = mock(ProjectClient.class);

        DeleteObsoleteProjectFilesSubAction subAction = new DeleteObsoleteProjectFilesSubAction(Outputter.getDefault(), client);
        subAction.setData(projectFiles, directoryIds, true, false);
        subAction.act("/**/*.csv", null, exportPattern, filesToUpload);

        verify(client).deleteSource(fileId2);
        verify(client).deleteDirectory(directoryId3);
        verifyNoMoreInteractions(client);

        assertThat(projectFiles.keySet(), not(hasItem(projectFilePath2)));
        assertThat(directoryIds.keySet(), not(hasItem(dirPath3)));
    }

    @Test
    @DisabledOnOs(OS.WINDOWS)
    public void testSimple_oneLocalFile_twoProjectFile_oneObsoleteFile_noPreserveHierarchy() {
        final String exportPattern = "/**/%file_name%.csv";
        String projectFilePath = "file1.csv";
        String projectFilePath2 = "file2.csv";
        String fileToUpload = "path/to/file1.csv";
        Map<String, File> projectFiles = new HashMap<String, File>() {{
            put(projectFilePath, FileBuilder.standard()
                .setProjectId(projectId)
                .setIdentifiers("file1.csv", "csv", fileId1, null, null)
                .setExportPattern(exportPattern)
                .build());
            put(projectFilePath2, FileBuilder.standard()
                .setProjectId(projectId)
                .setIdentifiers("file2.csv", "csv", fileId2, null, null)
                .setExportPattern(exportPattern)
                .build());
        }};
        List<String> filesToUpload = new ArrayList<String>() {{
            add(fileToUpload);
        }};
        HashMap<String, Long> directoryIds = new HashMap<>();

        ProjectClient client = mock(ProjectClient.class);

        DeleteObsoleteProjectFilesSubAction subAction = new DeleteObsoleteProjectFilesSubAction(Outputter.getDefault(), client);
        subAction.setData(projectFiles, directoryIds, false, false);
        subAction.act("/**/*.csv", null, exportPattern, filesToUpload);

        verify(client).deleteSource(fileId2);
        verifyNoMoreInteractions(client);

        assertThat(projectFiles.keySet(), not(hasItem(projectFilePath2)));
    }

    @Test
    @DisabledOnOs(OS.WINDOWS)
    public void testSimple_oneLocalFile_twoProjectFile_oneObsoleteFile_noPreserveHierarchy_2_withFolders() {
        final String exportPattern = "/**/%file_name%.csv";
        String projectFilePath = "to/file1.csv";
        String projectFilePath2 = "to/file2.csv";
        String fileToUpload = "path/to/file1.csv";
        Map<String, File> projectFiles = new HashMap<String, File>() {{
            put(projectFilePath, FileBuilder.standard()
                .setProjectId(projectId)
                .setIdentifiers("file1.csv", "csv", fileId1, directoryId1, null)
                .setExportPattern(exportPattern)
                .build());
            put(projectFilePath2, FileBuilder.standard()
                .setProjectId(projectId)
                .setIdentifiers("file2.csv", "csv", fileId2, directoryId1, null)
                .setExportPattern(exportPattern)
                .build());
        }};
        List<String> filesToUpload = new ArrayList<String>() {{
            add(fileToUpload);
        }};
        HashMap<String, Long> directoryIds = new HashMap<String, Long>() {{
            put("to/", directoryId1);
        }};

        ProjectClient client = mock(ProjectClient.class);

        DeleteObsoleteProjectFilesSubAction subAction = new DeleteObsoleteProjectFilesSubAction(Outputter.getDefault(), client);
        subAction.setData(projectFiles, directoryIds, false, false);
        subAction.act("/**/*.csv", null, exportPattern, filesToUpload);

        verify(client).deleteSource(fileId2);
        verifyNoMoreInteractions(client);

        assertThat(projectFiles.keySet(), not(hasItem(projectFilePath2)));
    }

    @Test
    @DisabledOnOs(OS.WINDOWS)
    public void testSimple_oneLocalFile_twoProjectFile_oneObsoleteFile_twoObsoleteDirectory() {
        final String exportPattern = "/**/%file_name%.csv";
        final String projectFilePath = "path/to/file1.csv";
        String projectFilePath2 = "path/from/dipper/file2.csv";
        Map<String, File> projectFiles = new HashMap<String, File>() {{
            put(projectFilePath, FileBuilder.standard()
                .setProjectId(projectId)
                .setIdentifiers("file1.csv", "csv", fileId1, directoryId2, null)
                .setExportPattern(exportPattern)
                .build());
            put(projectFilePath2, FileBuilder.standard()
                .setProjectId(projectId)
                .setIdentifiers("file2.csv", "csv", fileId2, directoryId4, null)
                .setExportPattern(exportPattern)
                .build());
        }};
        List<String> filesToUpload = new ArrayList<String>() {{
            add(projectFilePath);
        }};
        final String dirPath3 = "path/from/";
        final String dirPath4 = "path/from/dipper/";
        HashMap<String, Long> directoryIds = new HashMap<String, Long>() {{
            put("path/", directoryId1);
            put("path/to/", directoryId2);
            put(dirPath3, directoryId3);
            put(dirPath4, directoryId4);
        }};

        ProjectClient client = mock(ProjectClient.class);

        DeleteObsoleteProjectFilesSubAction subAction = new DeleteObsoleteProjectFilesSubAction(Outputter.getDefault(), client);
        subAction.setData(projectFiles, directoryIds, true, false);
        subAction.act("/**/*.csv", null, exportPattern, filesToUpload);

        verify(client).deleteSource(fileId2);
        verify(client).deleteDirectory(directoryId4);
        verify(client).deleteDirectory(directoryId3);
        verifyNoMoreInteractions(client);

        assertThat(projectFiles.keySet(), not(hasItem(projectFilePath2)));
        assertThat(directoryIds.keySet(), not(hasItem(dirPath4)));
        assertThat(directoryIds.keySet(), not(hasItem(dirPath3)));

    }

    @Test
    public void testSimple_oneLocalFile_twoProjectFile_noObsolete() {
        final String exportPattern = "/**/%file_name%.csv";
        String projectFilePath = "path/to/file1.csv";
        String projectFilePath2 = "path/from/file2.csv";
        Map<String, File> projectFiles = new HashMap<String, File>() {{
            put(projectFilePath, FileBuilder.standard()
                .setProjectId(projectId)
                .setIdentifiers("file1.csv", "csv", fileId1, directoryId2, null)
                .setExportPattern(exportPattern)
                .build());
            put(projectFilePath2, FileBuilder.standard()
                .setProjectId(projectId)
                .setIdentifiers("file2.csv", "csv", fileId2, directoryId3, null)
                .setExportPattern(exportPattern)
                .build());
        }};
        List<String> filesToUpload = new ArrayList<String>() {{
            add(projectFilePath);
        }};
        HashMap<String, Long> directoryIds = new HashMap<String, Long>() {{
            put("path/", directoryId1);
            put("path/to/", directoryId2);
            put("path/from/", directoryId3);
        }};

        ProjectClient client = mock(ProjectClient.class);

        DeleteObsoleteProjectFilesSubAction subAction = new DeleteObsoleteProjectFilesSubAction(Outputter.getDefault(), client);
        subAction.setData(projectFiles, directoryIds, true, false);
        subAction.act("/path/to/*.csv", null, exportPattern, filesToUpload);

        verifyNoMoreInteractions(client);
    }
}

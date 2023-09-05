package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientScreenshot;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.helper.FileHelperTest;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.screenshots.model.AddScreenshotRequest;
import com.crowdin.client.screenshots.model.Screenshot;
import com.crowdin.client.screenshots.model.UpdateScreenshotRequest;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.FileInfo;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.File;
import java.util.*;
import java.util.stream.Stream;

import static java.util.Objects.nonNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.Mockito.*;

public class ScreenshotUploadActionTest {

    NewAction<ProjectProperties, ClientScreenshot> action;

    private TempProject project;

    @BeforeEach
    public void createProj() {
        project = new TempProject(FileHelperTest.class);
    }

    @AfterEach
    public void deleteProj() {
        project.delete();
    }

    @ParameterizedTest
    @MethodSource
    public void testUploadScreenshot(String fileName, String sourceFilePath, Long sourceFileId, String branchName,
                                     Long branchId, String directoryPath, Long directoryId, boolean autoTag) throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + fileName);
        project.addFile(Utils.normalizePath(fileName));
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        AddScreenshotRequest request = new AddScreenshotRequest();
        request.setStorageId(1L);
        request.setName(fileName);
        request.setAutoTag(autoTag);
        request.setBranchId(branchId);
        request.setDirectoryId(directoryId);
        request.setFileId(sourceFileId);
        ClientScreenshot client = mock(ClientScreenshot.class);

        ProjectClient projectClient = mock(ProjectClient.class);
        CrowdinProjectFull projectFull = mock(CrowdinProjectFull.class);

        Branch branch = mock(Branch.class);
        FileInfo fileInfo = mock(FileInfo.class);
        Directory directory = mock(Directory.class);

        when(projectClient.downloadFullProject()).thenReturn(projectFull);

        when(branch.getId()).thenReturn(branchId);
        when(projectFull.findBranchByName(branchName)).thenReturn(Optional.of(branch));

        when(fileInfo.getId()).thenReturn(sourceFileId);
        when(fileInfo.getPath()).thenReturn(sourceFilePath);
        when(projectFull.getFileInfos()).thenReturn(Arrays.asList(fileInfo));

        when(directory.getId()).thenReturn(directoryId);
        when(directory.getPath()).thenReturn(directoryPath);
        when(projectFull.getDirectories()).thenReturn(nonNull(directoryId) ? Map.of(directoryId, directory) : new HashMap<>());

        when(projectClient.uploadStorage(eq(fileName), any())).thenReturn(1L);
        when(client.listScreenshots(null)).thenReturn(new ArrayList<>());

        when(client.uploadScreenshot(request))
                .thenReturn(new Screenshot() {{
                    setName(request.getName());
                    setId(1L);
                }});

        action = new ScreenshotUploadAction(fileToUpload, branchName, sourceFilePath, directoryPath, autoTag, false, false, projectClient);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).listScreenshots(null);
        verify(client).uploadScreenshot(request);
        verifyNoMoreInteractions(client);
    }

    public static Stream<Arguments> testUploadScreenshot() {
        return Stream.of(
                arguments("screenshot.png", null, null, null, null, null, null, false),
                arguments("screenshot.png", "/path/to/source/file", 10L, null, null, null, null, true),
                arguments("screenshot.png", null, null, "main", 11L, null, null, true),
                arguments("screenshot.png", null, null, null, null, "/path/to/directory", 12L, true));
    }

    @Test
    public void testUploadScreenshotToUpdate() throws ResponseException {
        String fileName = "to-upload.png";
        File fileToUpload = new File(project.getBasePath() + fileName);
        project.addFile(Utils.normalizePath(fileName));
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        ClientScreenshot client = mock(ClientScreenshot.class);
        Screenshot screenshot = mock(Screenshot.class);

        when(screenshot.getName()).thenReturn(fileName);
        when(screenshot.getId()).thenReturn(123L);
        when(client.listScreenshots(null)).thenReturn(Arrays.asList(screenshot));

        UpdateScreenshotRequest request = new UpdateScreenshotRequest();
        request.setStorageId(1L);
        request.setName(fileName);

        ProjectClient projectClient = mock(ProjectClient.class);
        when(projectClient.uploadStorage(eq(fileName), any())).thenReturn(1L);

        when(client.updateScreenshot(123L, request))
                .thenReturn(new Screenshot() {{
                    setName(request.getName());
                    setId(123L);
                }});

        action = new ScreenshotUploadAction(fileToUpload, null, null, null, false, false, false, projectClient);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).listScreenshots(null);
        verify(client).updateScreenshot(123L, request);
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadScreenshotNotExistingBranch() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        ClientScreenshot client = mock(ClientScreenshot.class);
        when(client.listScreenshots(null)).thenReturn(new ArrayList<>());

        ProjectClient projectClient = mock(ProjectClient.class);
        CrowdinProjectFull projectFull = mock(CrowdinProjectFull.class);
        when(projectClient.downloadFullProject()).thenReturn(projectFull);

        when(projectFull.findBranchByName("main")).thenReturn(Optional.empty());

        action = new ScreenshotUploadAction(new File("screenshot.png"), "main", null, null, true, false, false, projectClient);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));
    }

    @Test
    public void testUploadScreenshotNotExistingSourceFile() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        ClientScreenshot client = mock(ClientScreenshot.class);
        when(client.listScreenshots(null)).thenReturn(new ArrayList<>());

        ProjectClient projectClient = mock(ProjectClient.class);
        CrowdinProjectFull projectFull = mock(CrowdinProjectFull.class);
        when(projectClient.downloadFullProject()).thenReturn(projectFull);

        when(projectFull.getFileInfos()).thenReturn(new ArrayList<>());

        action = new ScreenshotUploadAction(new File("screenshot.png"), null, "/path/to/file", null, true, false, false, projectClient);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));
    }

    @Test
    public void testUploadScreenshotNotExistingDirectory() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        ClientScreenshot client = mock(ClientScreenshot.class);
        when(client.listScreenshots(null)).thenReturn(new ArrayList<>());

        ProjectClient projectClient = mock(ProjectClient.class);
        CrowdinProjectFull projectFull = mock(CrowdinProjectFull.class);
        when(projectClient.downloadFullProject()).thenReturn(projectFull);

        when(projectFull.getDirectories()).thenReturn(new HashMap<>());

        action = new ScreenshotUploadAction(new File("screenshot.png"), null, null, "/path/to/directory", true, false, false, projectClient);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));
    }
}
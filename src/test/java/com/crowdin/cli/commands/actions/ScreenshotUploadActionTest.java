package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientScreenshot;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.picocli.GenericActCommand;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.helper.FileHelperTest;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.labels.model.Label;
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
                                     Long branchId, List<String> labelNames, String directoryPath, Long directoryId, boolean autoTag) throws ResponseException {
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

        Map<Long, Directory> directories = new HashMap<>();
        directories.put(directoryId, directory);
        when(projectFull.getDirectories()).thenReturn(nonNull(directoryId) ? directories : new HashMap<>());

        when(projectClient.uploadStorage(eq(fileName), any())).thenReturn(1L);
        when(client.listScreenshotsByName(eq(fileName))).thenReturn(new ArrayList<>());

        when(client.uploadScreenshot(request))
                .thenReturn(new Screenshot() {{
                    setName(request.getName());
                    setId(1L);
                }});

        try (var mocked = mockStatic(GenericActCommand.class)) {
            mocked.when(() -> GenericActCommand.getProjectClient(pb)).thenReturn(projectClient);
            action = new ScreenshotUploadAction(fileToUpload, branchName, labelNames, sourceFilePath, directoryPath, autoTag, false, false);
            action.act(Outputter.getDefault(), pb, client);

            verify(client).listScreenshotsByName(eq(fileName));
            verify(client).uploadScreenshot(request);
            verifyNoMoreInteractions(client);
            mocked.verify(() -> GenericActCommand.getProjectClient(pb));
        }
    }

    public static Stream<Arguments> testUploadScreenshot() {
        return Stream.of(
                arguments("screenshot.png", null, null, null, null, null,  null, null, false),
                arguments("screenshot.png", "/path/to/source/file", 10L, null, null, null, null, null, true),
                arguments("screenshot.png", null, null, "main", 11L, null, null, null, true),
                arguments("screenshot.png", null, null, null, null, null, "/path/to/directory", 12L, true));
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
        when(client.listScreenshotsByName(eq(fileName))).thenReturn(Arrays.asList(screenshot));

        UpdateScreenshotRequest request = new UpdateScreenshotRequest();
        request.setStorageId(1L);
        request.setName(fileName);
        request.setUsePreviousTags(true);

        ProjectClient projectClient = mock(ProjectClient.class);
        when(projectClient.uploadStorage(eq(fileName), any())).thenReturn(1L);

        when(client.updateScreenshot(123L, request))
                .thenReturn(new Screenshot() {{
                    setName(request.getName());
                    setId(123L);
                }});

        try (var mocked = mockStatic(GenericActCommand.class)) {
            mocked.when(() -> GenericActCommand.getProjectClient(pb)).thenReturn(projectClient);
            action = new ScreenshotUploadAction(fileToUpload, null, null, null, null, false, false, false);
            action.act(Outputter.getDefault(), pb, client);

            verify(client).listScreenshotsByName(eq(fileName));
            verify(client).updateScreenshot(123L, request);
            verifyNoMoreInteractions(client);
            mocked.verify(() -> GenericActCommand.getProjectClient(pb));
        }
    }

    @Test
    public void testUploadScreenshotNotExistingBranch() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        ClientScreenshot client = mock(ClientScreenshot.class);
        when(client.listScreenshotsByName(eq("screenshot.png"))).thenReturn(new ArrayList<>());

        ProjectClient projectClient = mock(ProjectClient.class);
        CrowdinProjectFull projectFull = mock(CrowdinProjectFull.class);
        when(projectClient.downloadFullProject()).thenReturn(projectFull);

        when(projectFull.findBranchByName("main")).thenReturn(Optional.empty());

        try (var mocked = mockStatic(GenericActCommand.class)) {
            mocked.when(() -> GenericActCommand.getProjectClient(pb)).thenReturn(projectClient);
            action = new ScreenshotUploadAction(new File("screenshot.png"), "main", null, null, null, true, false, false);
            assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));
            mocked.verify(() -> GenericActCommand.getProjectClient(pb));
        }
    }

    @Test
    public void testUploadScreenshotNotExistingSourceFile() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        ClientScreenshot client = mock(ClientScreenshot.class);
        when(client.listScreenshotsByName("screenshot.png")).thenReturn(new ArrayList<>());

        ProjectClient projectClient = mock(ProjectClient.class);
        CrowdinProjectFull projectFull = mock(CrowdinProjectFull.class);
        when(projectClient.downloadFullProject()).thenReturn(projectFull);

        when(projectFull.getFileInfos()).thenReturn(new ArrayList<>());

        try (var mocked = mockStatic(GenericActCommand.class)) {
            mocked.when(() -> GenericActCommand.getProjectClient(pb)).thenReturn(projectClient);
            action = new ScreenshotUploadAction(new File("screenshot.png"), null, null, "/path/to/file", null, true, false, false);
            assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));
            mocked.verify(() -> GenericActCommand.getProjectClient(pb));
        }
    }

    @Test
    public void testUploadScreenshotNotExistingDirectory() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        ClientScreenshot client = mock(ClientScreenshot.class);
        when(client.listScreenshotsByName("screenshot.png")).thenReturn(new ArrayList<>());

        ProjectClient projectClient = mock(ProjectClient.class);
        CrowdinProjectFull projectFull = mock(CrowdinProjectFull.class);
        when(projectClient.downloadFullProject()).thenReturn(projectFull);

        when(projectFull.getDirectories()).thenReturn(new HashMap<>());

        try (var mocked = mockStatic(GenericActCommand.class)) {
            mocked.when(() -> GenericActCommand.getProjectClient(pb)).thenReturn(projectClient);
            action = new ScreenshotUploadAction(new File("screenshot.png"), null, null, null, "/path/to/directory", true, false, false);
            assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));
            mocked.verify(() -> GenericActCommand.getProjectClient(pb));
        }
    }

    @Test
    public void testUploadScreenshotWithLabels() throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + "screenshot.png");
        project.addFile(Utils.normalizePath("screenshot.png"));
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        AddScreenshotRequest request = new AddScreenshotRequest();
        request.setStorageId(1L);
        request.setName("screenshot.png");
        request.setAutoTag(false);
        request.setLabelIds(new Long[] {3L, 4L});
        ClientScreenshot client = mock(ClientScreenshot.class);
        Label label1 = new Label() {{
            setId(3L);
            setTitle("label1");
        }};
        Label label2 = new Label() {{
            setId(4L);
            setTitle("label2");
        }};

        ProjectClient projectClient = mock(ProjectClient.class);
        CrowdinProjectFull projectFull = mock(CrowdinProjectFull.class);

        FileInfo fileInfo = mock(FileInfo.class);

        when(projectClient.downloadFullProject()).thenReturn(projectFull);
        when(projectFull.getFileInfos()).thenReturn(Arrays.asList(fileInfo));

        when(projectClient.uploadStorage(eq("screenshot.png"), any())).thenReturn(1L);
        when(projectClient.listLabels()).thenReturn(Arrays.asList(label1, label2));
        when(client.listScreenshotsByName(eq(fileToUpload.getName()))).thenReturn(new ArrayList<>());

        when(client.uploadScreenshot(request))
            .thenReturn(new Screenshot() {{
                setName(request.getName());
                setId(1L);
            }});

        try (var mocked = mockStatic(GenericActCommand.class)) {
            mocked.when(() -> GenericActCommand.getProjectClient(pb)).thenReturn(projectClient);
            action = new ScreenshotUploadAction(fileToUpload, null, Arrays.asList("label1", "label2"), null, null, false, false, false);
            action.act(Outputter.getDefault(), pb, client);

            verify(client).listScreenshotsByName(eq(fileToUpload.getName()));
            verify(client).uploadScreenshot(request);
            verify(projectClient).downloadFullProject();
            verify(projectClient).listLabels();
            verify(projectClient).uploadStorage(any(), any());
            verifyNoMoreInteractions(client);
            verifyNoMoreInteractions(projectClient);
            mocked.verify(() -> GenericActCommand.getProjectClient(pb));
        }
    }

    @Test
    public void testUploadScreenshotNotExistingLabel() throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + "screenshot.png");
        project.addFile(Utils.normalizePath("screenshot.png"));
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        AddScreenshotRequest request = new AddScreenshotRequest();
        request.setStorageId(1L);
        request.setName("screenshot.png");
        request.setAutoTag(false);
        request.setLabelIds(new Long[] {3L});
        ClientScreenshot client = mock(ClientScreenshot.class);

        Label label1 = new Label() {{
            setId(3L);
            setTitle("label1");
        }};

        ProjectClient projectClient = mock(ProjectClient.class);
        CrowdinProjectFull projectFull = mock(CrowdinProjectFull.class);

        FileInfo fileInfo = mock(FileInfo.class);

        when(projectClient.downloadFullProject()).thenReturn(projectFull);
        when(projectFull.getFileInfos()).thenReturn(Arrays.asList(fileInfo));

        when(projectClient.uploadStorage(eq("screenshot.png"), any())).thenReturn(1L);
        when(projectClient.listLabels()).thenReturn(new ArrayList<>());
        when(projectClient.addLabel(any())).thenReturn(label1);
        when(client.listScreenshotsByName(eq(fileToUpload.getName()))).thenReturn(new ArrayList<>());

        when(client.uploadScreenshot(request))
            .thenReturn(new Screenshot() {{
                setName(request.getName());
                setId(1L);
            }});

        try (var mocked = mockStatic(GenericActCommand.class)) {
            mocked.when(() -> GenericActCommand.getProjectClient(pb)).thenReturn(projectClient);
            action = new ScreenshotUploadAction(fileToUpload, null, Arrays.asList("label1"), null, null, false, false, false);
            action.act(Outputter.getDefault(), pb, client);

            verify(client).listScreenshotsByName(eq(fileToUpload.getName()));
            verify(client).uploadScreenshot(request);
            verify(projectClient).downloadFullProject();
            verify(projectClient).listLabels();
            verify(projectClient).addLabel(any());
            verify(projectClient).uploadStorage(any(), any());
            verifyNoMoreInteractions(client);
            verifyNoMoreInteractions(projectClient);
            mocked.verify(() -> GenericActCommand.getProjectClient(pb));
        }
    }
}

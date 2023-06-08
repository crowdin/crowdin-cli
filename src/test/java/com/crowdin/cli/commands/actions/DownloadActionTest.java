package com.crowdin.cli.commands.actions;

import com.crowdin.cli.MockitoUtils;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.helper.FileHelperTest;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.translations.model.CrowdinTranslationCreateProjectBuildForm;
import com.crowdin.client.translations.model.ProjectBuild;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class DownloadActionTest {

    TempProject project;

    @BeforeEach
    public void createProj() {
        project = new TempProject(FileHelperTest.class);
    }

    @AfterEach
    public void deleteProj() {
        project.delete();
    }

    public static ProjectBuild buildProjectBuild(Long buildId, Long projectId, String status, Integer progress) {
        return new ProjectBuild() {{
                setId(buildId);
                setProjectId(projectId);
                setStatus(status);
                setProgress(progress);
            }};
    }

    @Test
    public void testEmptyProject() throws IOException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        CrowdinTranslationCreateProjectBuildForm buildProjectTranslationRequest = new CrowdinTranslationCreateProjectBuildForm();
        long buildId = 42L;
        when(client.startBuildingTranslation(eq(buildProjectTranslationRequest)))
            .thenReturn(buildProjectBuild(buildId, Long.parseLong(pb.getProjectId()), "finished", 100));
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadBuild(eq(buildId)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);
        AtomicReference<File> zipArchive = new AtomicReference<>();
        AtomicReference<File> tempDir = new AtomicReference<>();
        when(files.extractZipArchive(any(), any()))
            .thenAnswer((invocation -> {
                zipArchive.set(invocation.getArgument(0));
                tempDir.set(invocation.getArgument(1));
                System.out.println(tempDir.get().getAbsolutePath());
                return new ArrayList<>();
            }));

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadAction(files, false, null, null, false, null, false, false, false, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).startBuildingTranslation(eq(buildProjectTranslationRequest));
        verify(client).downloadBuild(eq(buildId));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(any(), any());
        verify(files).extractZipArchive(any(), any());
        verify(files).deleteFile(eq(zipArchive.get()));
        verify(files).deleteDirectory(tempDir.get());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void testProjectOneFittingFile() throws IOException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        project.addFile("first.po");

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 101L, null, null, "/%original_file_name%-CR-%locale%").build());
        CrowdinTranslationCreateProjectBuildForm buildProjectTranslationRequest = new CrowdinTranslationCreateProjectBuildForm();
        long buildId = 42L;
        when(client.startBuildingTranslation(eq(buildProjectTranslationRequest)))
            .thenReturn(buildProjectBuild(buildId, Long.parseLong(pb.getProjectId()), "finished", 100));
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadBuild(eq(buildId)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);
        AtomicReference<File> zipArchive = new AtomicReference<>();
        AtomicReference<File> tempDir = new AtomicReference<>();
        when(files.extractZipArchive(any(), any()))
            .thenAnswer((invocation -> {
                zipArchive.set(invocation.getArgument(0));
                tempDir.set(invocation.getArgument(1));
                return new ArrayList<File>() {{
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-uk-UA"));
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-ru-RU"));
                    }};
            }));

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadAction(files, false, null, null,false, null, false, false, false, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).startBuildingTranslation(eq(buildProjectTranslationRequest));
        verify(client).downloadBuild(eq(buildId));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(any(), any());
        verify(files).extractZipArchive(any(), any());
        verify(files).copyFile(
            new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-ru-RU"),
            new File(pb.getBasePath() + "first.po-CR-ru-RU"));
        verify(files).copyFile(
            new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-uk-UA"),
            new File(pb.getBasePath() + "first.po-CR-uk-UA"));
        verify(files).deleteFile(eq(zipArchive.get()));
        verify(files).deleteDirectory(tempDir.get());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void testProjectOneFittingFile_WithExportApprovedOnly_WithSkipUntranslatedFiles() throws IOException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        pb.getFiles().get(0).setExportApprovedOnly(true);
        pb.getFiles().get(0).setSkipUntranslatedFiles(true);

        project.addFile("first.po");

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
                .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                        .addFile("first.po", "gettext", 101L, null, null, "/%original_file_name%-CR-%locale%").build());
        CrowdinTranslationCreateProjectBuildForm buildProjectTranslationRequest = new CrowdinTranslationCreateProjectBuildForm() {{
                setExportApprovedOnly(true);
                setSkipUntranslatedFiles(true);
            }};
        long buildId = 42L;
        when(client.startBuildingTranslation(eq(buildProjectTranslationRequest)))
                .thenReturn(buildProjectBuild(buildId, Long.parseLong(pb.getProjectId()), "finished", 100));
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadBuild(eq(buildId)))
                .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);
        AtomicReference<File> zipArchive = new AtomicReference<>();
        AtomicReference<File> tempDir = new AtomicReference<>();
        when(files.extractZipArchive(any(), any()))
                .thenAnswer((invocation -> {
                    zipArchive.set(invocation.getArgument(0));
                    tempDir.set(invocation.getArgument(1));
                    return new ArrayList<File>() {{
                            add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-uk-UA"));
                            add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-ru-RU"));
                        }};
                }));

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadAction(files, false, null, null, false, null, false, false, false, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).startBuildingTranslation(eq(buildProjectTranslationRequest));
        verify(client).downloadBuild(eq(buildId));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(any(), any());
        verify(files).extractZipArchive(any(), any());
        verify(files).copyFile(
                new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-ru-RU"),
                new File(pb.getBasePath() + "first.po-CR-ru-RU"));
        verify(files).copyFile(
                new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-uk-UA"),
                new File(pb.getBasePath() + "first.po-CR-uk-UA"));
        verify(files).deleteFile(eq(zipArchive.get()));
        verify(files).deleteDirectory(tempDir.get());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void testProjectDownloadWithKeepArchive() throws IOException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        project.addFile("first.po");

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
                .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                        .addFile("first.po", "gettext", 101L, null, null, "/%original_file_name%-CR-%locale%").build());
        CrowdinTranslationCreateProjectBuildForm buildProjectTranslationRequest = new CrowdinTranslationCreateProjectBuildForm();
        long buildId = 42L;
        when(client.startBuildingTranslation(eq(buildProjectTranslationRequest)))
                .thenReturn(buildProjectBuild(buildId, Long.parseLong(pb.getProjectId()), "finished", 100));
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadBuild(eq(buildId)))
                .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);
        AtomicReference<File> zipArchive = new AtomicReference<>();
        AtomicReference<File> tempDir = new AtomicReference<>();
        when(files.extractZipArchive(any(), any()))
                .thenAnswer((invocation -> {
                    zipArchive.set(invocation.getArgument(0));
                    tempDir.set(invocation.getArgument(1));
                    return new ArrayList<File>() {{
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-uk-UA"));
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-ru-RU"));
                    }};
                }));

        NewAction<PropertiesWithFiles, ProjectClient> action =
                new DownloadAction(files, false, null, null, false, null, false, false, false, false, true);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).startBuildingTranslation(eq(buildProjectTranslationRequest));
        verify(client).downloadBuild(eq(buildId));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(any(), any());
        verify(files).extractZipArchive(any(), any());
        verify(files).copyFile(
                new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-ru-RU"),
                new File(pb.getBasePath() + "first.po-CR-ru-RU"));
        verify(files).copyFile(
                new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-uk-UA"),
                new File(pb.getBasePath() + "first.po-CR-uk-UA"));
        verify(files).deleteDirectory(tempDir.get());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void testProjectOneFittingFile_LongBuild() throws IOException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        project.addFile("first.po");

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 101L, null, null, "/%original_file_name%-CR-%locale%").build());
        CrowdinTranslationCreateProjectBuildForm buildProjectTranslationRequest = new CrowdinTranslationCreateProjectBuildForm();
        long buildId = 42L;
        when(client.startBuildingTranslation(eq(buildProjectTranslationRequest)))
            .thenReturn(buildProjectBuild(buildId, Long.parseLong(pb.getProjectId()), "building", 25));
        when(client.checkBuildingTranslation(eq(buildId)))
            .thenReturn(buildProjectBuild(buildId, Long.parseLong(pb.getProjectId()), "building", 50))
            .thenReturn(buildProjectBuild(buildId, Long.parseLong(pb.getProjectId()), "building", 75))
            .thenReturn(buildProjectBuild(buildId, Long.parseLong(pb.getProjectId()), "finished", 100));
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadBuild(eq(buildId)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);
        AtomicReference<File> zipArchive = new AtomicReference<>();
        AtomicReference<File> tempDir = new AtomicReference<>();
        when(files.extractZipArchive(any(), any()))
            .thenAnswer((invocation -> {
                zipArchive.set(invocation.getArgument(0));
                tempDir.set(invocation.getArgument(1));
                return new ArrayList<File>() {{
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-uk-UA"));
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-ru-RU"));
                    }};
            }));

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadAction(files, false, null, null, false, null, false, false, false, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).startBuildingTranslation(eq(buildProjectTranslationRequest));
        verify(client, times(3)).checkBuildingTranslation(eq(buildId));
        verify(client).downloadBuild(eq(buildId));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(any(), any());
        verify(files).extractZipArchive(any(), any());
        verify(files).copyFile(
            new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-ru-RU"),
            new File(pb.getBasePath() + "first.po-CR-ru-RU"));
        verify(files).copyFile(
            new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-uk-UA"),
            new File(pb.getBasePath() + "first.po-CR-uk-UA"));
        verify(files).deleteFile(eq(zipArchive.get()));
        verify(files).deleteDirectory(tempDir.get());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void testProjectOneFittingOneUnfittingFile_LongBuild() throws IOException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        project.addFile("first.po");

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 101L, null, null, "/%original_file_name%-CR-%locale%")
                .addFile("second.po", "gettext", 102L, null, null, "/%original_file_name%-CR-%locale%")
                .build());
        CrowdinTranslationCreateProjectBuildForm buildProjectTranslationRequest = new CrowdinTranslationCreateProjectBuildForm();
        long buildId = 42L;
        when(client.startBuildingTranslation(eq(buildProjectTranslationRequest)))
            .thenReturn(buildProjectBuild(buildId, Long.parseLong(pb.getProjectId()), "finished", 100));
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadBuild(eq(buildId)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);
        AtomicReference<File> zipArchive = new AtomicReference<>();
        AtomicReference<File> tempDir = new AtomicReference<>();
        when(files.extractZipArchive(any(), any()))
            .thenAnswer((invocation -> {
                zipArchive.set(invocation.getArgument(0));
                tempDir.set(invocation.getArgument(1));
                return new ArrayList<File>() {{
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-uk-UA"));
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-ru-RU"));
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "second.po-CR-uk-UA"));
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "second.po-CR-ru-RU"));
                    }};
            }));

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadAction(files, false, null, null, false, null, false, false, false, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).startBuildingTranslation(eq(buildProjectTranslationRequest));
        verify(client).downloadBuild(eq(buildId));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(any(), any());
        verify(files).extractZipArchive(any(), any());
        verify(files).copyFile(
            new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-ru-RU"),
            new File(pb.getBasePath() + "first.po-CR-ru-RU"));
        verify(files).copyFile(
            new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-uk-UA"),
            new File(pb.getBasePath() + "first.po-CR-uk-UA"));
        verify(files).deleteFile(eq(zipArchive.get()));
        verify(files).deleteDirectory(tempDir.get());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void testProjectOneFittingOneUnfittingOneWithUnfoundSourceFile_LongBuild() throws IOException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        project.addFile("first.po");

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 101L, null, null, "/%original_file_name%-CR-%locale%")
                .addFile("second.po", "gettext", 102L, null, null, "/%original_file_name%-CR-%locale%")
                .build());
        CrowdinTranslationCreateProjectBuildForm buildProjectTranslationRequest = new CrowdinTranslationCreateProjectBuildForm();
        long buildId = 42L;
        when(client.startBuildingTranslation(eq(buildProjectTranslationRequest)))
            .thenReturn(buildProjectBuild(buildId, Long.parseLong(pb.getProjectId()), "finished", 100));
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadBuild(eq(buildId)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);
        AtomicReference<File> zipArchive = new AtomicReference<>();
        AtomicReference<File> tempDir = new AtomicReference<>();
        when(files.extractZipArchive(any(), any()))
            .thenAnswer((invocation -> {
                zipArchive.set(invocation.getArgument(0));
                tempDir.set(invocation.getArgument(1));
                return new ArrayList<File>() {{
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-uk-UA"));
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-ru-RU"));
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "second.po-CR-uk-UA"));
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "second.po-CR-ru-RU"));
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "third.po-CR-uk-UA"));
                    }};
            }));

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadAction(files, false, null, null, false, null, false, true, false, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).startBuildingTranslation(eq(buildProjectTranslationRequest));
        verify(client).downloadBuild(eq(buildId));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(any(), any());
        verify(files).extractZipArchive(any(), any());
        verify(files).copyFile(
            new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-ru-RU"),
            new File(pb.getBasePath() + "first.po-CR-ru-RU"));
        verify(files).copyFile(
            new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-uk-UA"),
            new File(pb.getBasePath() + "first.po-CR-uk-UA"));
        verify(files).deleteFile(eq(zipArchive.get()));
        verify(files).deleteDirectory(tempDir.get());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void testProjectOneFittingFile_WithLanguageMapping() throws IOException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        project.addFile("first.po");

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 101L, null, null, "/%original_file_name%-CR-%locale%")
                .addFile("second.po", "gettext", 102L, null, null, "/%original_file_name%-CR-%locale%")
                .addLanguageMapping("ua", "locale", "UA")
                .build());
        CrowdinTranslationCreateProjectBuildForm buildProjectTranslationRequest = new CrowdinTranslationCreateProjectBuildForm();
        long buildId = 42L;
        when(client.startBuildingTranslation(eq(buildProjectTranslationRequest)))
                .thenReturn(buildProjectBuild(buildId, Long.parseLong(pb.getProjectId()), "finished", 100));
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadBuild(eq(buildId)))
                .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);
        AtomicReference<File> zipArchive = new AtomicReference<>();
        AtomicReference<File> tempDir = new AtomicReference<>();
        when(files.extractZipArchive(any(), any()))
                .thenAnswer((invocation -> {
                    zipArchive.set(invocation.getArgument(0));
                    tempDir.set(invocation.getArgument(1));
                    return new ArrayList<File>() {{
                            add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-UA"));
                            add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-ru-RU"));
                            add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "second.po-CR-UA"));
                            add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "second.po-CR-ru-RU"));
                            add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "third.po-CR-UA"));
                        }};
                }));

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadAction(files, false, null, null, false, null, false, true, false, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).startBuildingTranslation(eq(buildProjectTranslationRequest));
        verify(client).downloadBuild(eq(buildId));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(any(), any());
        verify(files).extractZipArchive(any(), any());
        verify(files).copyFile(
                new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-ru-RU"),
                new File(pb.getBasePath() + "first.po-CR-ru-RU"));
        verify(files).copyFile(
                new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-UA"),
                new File(pb.getBasePath() + "first.po-CR-UA"));
        verify(files).deleteFile(eq(zipArchive.get()));
        verify(files).deleteDirectory(tempDir.get());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void testProjectOneFittingFile_FailBuild() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        project.addFile("first.po");

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 101L, null, null, "/%original_file_name%-CR-%locale%").build());
        CrowdinTranslationCreateProjectBuildForm buildProjectTranslationRequest = new CrowdinTranslationCreateProjectBuildForm();
        long buildId = 42L;
        when(client.startBuildingTranslation(eq(buildProjectTranslationRequest)))
            .thenThrow(new RuntimeException());
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadBuild(eq(buildId)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadAction(files, false, null, null, false, null, false, false, false, false, false);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject(null);
        verify(client).startBuildingTranslation(eq(buildProjectTranslationRequest));
        verifyNoMoreInteractions(client);

        verifyNoMoreInteractions(files);
    }

    @Test
    public void testProjectOneFittingFile_failDownloadProject() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        project.addFile("first.po");

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
            .thenThrow(new RuntimeException());

        FilesInterface files = mock(FilesInterface.class);

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadAction(files, false, null, null, false, null, false, false, false, false, false);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject(null);
        verifyNoMoreInteractions(client);

        verifyNoMoreInteractions(files);
    }

    @Test
    public void testProjectOneFittingFile_failDeleteFile() throws IOException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        project.addFile("first.po");

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 101L, null, null, "/%original_file_name%-CR-%locale%").build());
        CrowdinTranslationCreateProjectBuildForm buildProjectTranslationRequest = new CrowdinTranslationCreateProjectBuildForm();
        long buildId = 42L;
        when(client.startBuildingTranslation(eq(buildProjectTranslationRequest)))
            .thenReturn(buildProjectBuild(buildId, Long.parseLong(pb.getProjectId()), "finished", 100));
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadBuild(eq(buildId)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);
        AtomicReference<File> zipArchive = new AtomicReference<>();
        AtomicReference<File> tempDir = new AtomicReference<>();
        when(files.extractZipArchive(any(), any()))
            .thenAnswer((invocation -> {
                System.out.println("invocation.getArgument(0) = " + invocation.getArgument(0));
                System.out.println("invocation.getArgument(1) = " + invocation.getArgument(1));
                zipArchive.set(invocation.getArgument(0));
                tempDir.set(invocation.getArgument(1));
                return new ArrayList<File>() {{
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-uk-UA"));
                        add(new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-ru-RU"));
                    }};
            }));
        doThrow(IOException.class)
            .when(files).deleteFile(any());

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadAction(files, false, null, null, false, null, false, false, false, false, false);
//        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).startBuildingTranslation(eq(buildProjectTranslationRequest));
        verify(client).downloadBuild(eq(buildId));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(any(), any());
        verify(files).extractZipArchive(any(), any());
        verify(files).copyFile(
            new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-ru-RU"),
            new File(pb.getBasePath() + "first.po-CR-ru-RU"));
        verify(files).copyFile(
            new File(tempDir.get().getAbsolutePath() + Utils.PATH_SEPARATOR + "first.po-CR-uk-UA"),
            new File(pb.getBasePath() + "first.po-CR-uk-UA"));
        verify(files).deleteFile(eq(zipArchive.get()));
        verify(files).deleteDirectory(tempDir.get());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void testProjectOneFittingFile_failDownloadingException() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        project.addFile("first.po");

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
                .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                        .addFile("first.po", "gettext", 101L, null, null, "/%original_file_name%-CR-%locale%").build());
        CrowdinTranslationCreateProjectBuildForm buildProjectTranslationRequest = new CrowdinTranslationCreateProjectBuildForm();
        long buildId = 42L;
        when(client.startBuildingTranslation(eq(buildProjectTranslationRequest)))
            .thenReturn(buildProjectBuild(buildId, Long.parseLong(pb.getProjectId()), "finished", 100));
        when(client.downloadBuild(eq(buildId)))
            .thenThrow(new RuntimeException());

        FilesInterface files = mock(FilesInterface.class);

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadAction(files, false, null, null, false, null, false, false, false, false, false);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject(null);
        verify(client).startBuildingTranslation(eq(buildProjectTranslationRequest));
        verify(client).downloadBuild(eq(buildId));
        verifyNoMoreInteractions(client);

        verifyNoMoreInteractions(files);
    }

    @Test
    public void testProjectOneFittingFile_failWritingFile() throws IOException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        project.addFile("first.po");

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 101L, null, null, "/%original_file_name%-CR-%locale%").build());
        CrowdinTranslationCreateProjectBuildForm buildProjectTranslationRequest = new CrowdinTranslationCreateProjectBuildForm();
        long buildId = 42L;
        when(client.startBuildingTranslation(eq(buildProjectTranslationRequest)))
            .thenReturn(buildProjectBuild(buildId, Long.parseLong(pb.getProjectId()), "finished", 100));
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadBuild(eq(buildId)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);
        doThrow(IOException.class)
            .when(files)
                .writeToFile(any(), any());

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadAction(files, false, null, null, false, null, false, false, false, false, false);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject(null);
        verify(client).startBuildingTranslation(eq(buildProjectTranslationRequest));
        verify(client).downloadBuild(eq(buildId));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(any(), any());
        verifyNoMoreInteractions(files);
    }
}

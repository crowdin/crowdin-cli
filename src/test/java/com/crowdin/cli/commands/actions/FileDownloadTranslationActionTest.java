package com.crowdin.cli.commands.actions;

import com.crowdin.cli.MockitoUtils;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.helper.FileHelperTest;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.translations.model.BuildProjectFileTranslationRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class FileDownloadTranslationActionTest {
    private TempProject project;

    @BeforeEach
    public void createProj() {
        project = new TempProject(FileHelperTest.class);
    }

    @AfterEach
    public void deleteProj() {
        project.delete();
    }

    @Test
    public void testDownloadTranslation() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addFile("/first.po", "gettext", 101L, null, null, null).build();
        build.setType(Type.FILES_BASED);
        BuildProjectFileTranslationRequest request = new BuildProjectFileTranslationRequest() {{
            setTargetLanguageId("ua");
        }};
        when(client.downloadFullProject())
            .thenReturn(build);
        when(client.buildProjectFileTranslation(eq(101L), eq(request)))
            .thenReturn(urlMock);

        NewAction<ProjectProperties, ProjectClient> action = new FileDownloadTranslationAction("first.po", "ua", null, null);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).buildProjectFileTranslation(eq(101L), eq(request));
        verifyNoMoreInteractions(client);
        assertTrue(Files.exists(Paths.get(project.getBasePath() + "ua/first.po")), "File should exist at the specified path");
    }

    @Test
    public void testDownloadTranslationWithDest() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addFile("/first.po", "gettext", 101L, null, null, null).build();
        build.setType(Type.FILES_BASED);
        BuildProjectFileTranslationRequest request = new BuildProjectFileTranslationRequest() {{
            setTargetLanguageId("ua");
        }};
        when(client.downloadFullProject())
            .thenReturn(build);
        when(client.buildProjectFileTranslation(eq(101L), eq(request)))
            .thenReturn(urlMock);

        NewAction<ProjectProperties, ProjectClient> action = new FileDownloadTranslationAction("first.po", "ua", null, "path/to/save");
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).buildProjectFileTranslation(eq(101L), eq(request));
        verifyNoMoreInteractions(client);
        assertTrue(Files.exists(Paths.get(project.getBasePath() + "path/to/save/first.po")), "File should exist at the specified path");
    }

    @Test
    public void testDownloadTranslation_StringBasedProject() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build();
        build.setType(Type.STRINGS_BASED);
        when(client.downloadFullProject())
            .thenReturn(build);

        NewAction<ProjectProperties, ProjectClient> action = new FileDownloadTranslationAction("first.po", "ua", null, "path/to/save");
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verifyNoMoreInteractions(client);
    }
}
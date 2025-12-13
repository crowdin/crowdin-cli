package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectBuilder;
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
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.translations.model.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class FileUploadTranslationActionTest {
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
    public void testUploadTranslation_xliff() throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + "first_uk.xliff");
        project.addFile(Utils.normalizePath("first_uk.xliff"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build();
        build.setType(Type.FILES_BASED);
        ImportTranslationsRequest request = new ImportTranslationsRequest() {{
            setStorageId(1L);
            setLanguageIds(List.of("ua"));
        }};
        when(client.downloadFullProject(any()))
            .thenReturn(build);
        when(client.uploadStorage(eq("first_uk.xliff"), any()))
            .thenReturn(1L);
        when(client.importTranslations(eq(request))).thenReturn(new ImportTranslationsStatus() {{
            setStatus("finished");
            setIdentifier("123");
        }});

        NewAction<ProjectProperties, ProjectClient> action = new FileUploadTranslationAction(fileToUpload, null, null, "ua", true, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(any());
        verify(client).uploadStorage(eq("first_uk.xliff"), any());
        verify(client).importTranslations(eq(request));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadTranslation_FileBasedProject() throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + "first_uk.po");
        project.addFile(Utils.normalizePath("first_uk.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addFile("/first.po", "gettext", 101L, null, null, null).build();
        build.setType(Type.FILES_BASED);
        ImportTranslationsRequest request = new ImportTranslationsRequest() {{
            setFileId(101L);
            setStorageId(1L);
            setLanguageIds(List.of("ua"));
        }};
        when(client.downloadFullProject(any()))
            .thenReturn(build);
        when(client.uploadStorage(eq("first_uk.po"), any()))
            .thenReturn(1L);
        when(client.importTranslations(eq(request))).thenReturn(new ImportTranslationsStatus() {{
            setStatus("finished");
            setIdentifier("123");
        }});

        NewAction<ProjectProperties, ProjectClient> action = new FileUploadTranslationAction(fileToUpload, null, "/first.po", "ua", false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(any());
        verify(client).uploadStorage(eq("first_uk.po"), any());
        verify(client).importTranslations(eq(request));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadTranslation_FileBasedProject_WithBranch() throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + "first_uk.po");
        project.addFile(Utils.normalizePath("first_uk.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addBranches(1L, "main")
            .addFile("/main/first.po", "gettext", 101L, null, 1L, null).build();
        build.setType(Type.FILES_BASED);
        ImportTranslationsRequest request = new ImportTranslationsRequest() {{
            setFileId(101L);
            setStorageId(1L);
            setLanguageIds(List.of("ua"));
        }};
        when(client.downloadFullProject(any()))
            .thenReturn(build);
        when(client.uploadStorage(eq("first_uk.po"), any()))
            .thenReturn(1L);
        when(client.importTranslations(eq(request))).thenReturn(new ImportTranslationsStatus() {{
            setStatus("finished");
            setIdentifier("123");
        }});

        NewAction<ProjectProperties, ProjectClient> action = new FileUploadTranslationAction(fileToUpload, "main", "/first.po", "ua", false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(any());
        verify(client).uploadStorage(eq("first_uk.po"), any());
        verify(client).importTranslations(eq(request));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testImportTranslation_StringBasedProject() throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + "first_uk.po");
        project.addFile(Utils.normalizePath("first_uk.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addBranches(2L, "main").build();
        build.setType(Type.STRINGS_BASED);
        ImportTranslationsStringsBasedRequest request = new ImportTranslationsStringsBasedRequest() {{
            setBranchId(2L);
            setStorageId(1L);
            setLanguageIds(List.of("ua"));
        }};
        ImportTranslationsStringsBasedStatus status = new ImportTranslationsStringsBasedStatus();
        status.setStatus("finished");
        status.setIdentifier("123");
        when(client.downloadFullProject(any()))
            .thenReturn(build);
        when(client.uploadStorage(eq("first_uk.po"), any()))
            .thenReturn(1L);
        when(client.importTranslations(eq(request))).thenReturn(status);

        NewAction<ProjectProperties, ProjectClient> action = new FileUploadTranslationAction(fileToUpload, "main", null, "ua", false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(any());
        verify(client).uploadStorage(eq("first_uk.po"), any());
        verify(client).importTranslations(eq(request));
        verifyNoMoreInteractions(client);
    }
}
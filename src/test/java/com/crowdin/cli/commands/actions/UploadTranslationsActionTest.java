package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.helper.FileHelperTest;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.translations.model.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class UploadTranslationsActionTest {

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
    public void testUploadOneOfTwoTranslation_Project() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        project.addFile(Utils.normalizePath("first.po-CR-uk-UA"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%", Arrays.asList("*-CR-*"))
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 301L, null, null).build();
        build.setType(Type.FILES_BASED);
        ImportTranslationsRequest request = new ImportTranslationsRequest() {{
            setStorageId(1L);
            setFileId(301L);
            setImportEqSuggestions(false);
            setAutoApproveImported(false);
            setTranslateHidden(false);
            setLanguageIds(List.of("ua"));
        }};
        ImportTranslationsStatus importTranslationsStatus = new ImportTranslationsStatus();
        importTranslationsStatus.setStatus("finished");
        importTranslationsStatus.setIdentifier("123");

        when(client.downloadFullProject(null))
                .thenReturn(build);
        when(client.uploadStorage(eq("first.po-CR-uk-UA"), any()))
                .thenReturn(1L);
        when(client.importTranslations(eq(request))).thenReturn(importTranslationsStatus);

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadTranslationsAction(false, null, null, false, false, false, false, false, false);
        assertDoesNotThrow(() -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject(null);
        verify(client).uploadStorage(eq("first.po-CR-uk-UA"), any());
        verify(client).importTranslations(eq(request));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadBothTranslation_Project() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        project.addFile(Utils.normalizePath("first.po-CR-uk-UA"), "Hello, World!");
        project.addFile(Utils.normalizePath("first.po-CR-en-GB"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%", Arrays.asList("*-CR-*"))
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 301L, null, null).build();
        build.setType(Type.FILES_BASED);
        ImportTranslationsRequest request1 = new ImportTranslationsRequest() {{
            setStorageId(1L);
            setFileId(301L);
            setImportEqSuggestions(false);
            setAutoApproveImported(false);
            setTranslateHidden(false);
            setLanguageIds(List.of("ua"));
        }};

        ImportTranslationsRequest request2 = new ImportTranslationsRequest() {{
            setStorageId(2L);
            setFileId(301L);
            setImportEqSuggestions(false);
            setAutoApproveImported(false);
            setTranslateHidden(false);
            setLanguageIds(List.of("en"));
        }};

        ImportTranslationsStatus importTranslationsStatus = new ImportTranslationsStatus();
        importTranslationsStatus.setStatus("finished");
        importTranslationsStatus.setIdentifier("123");

        when(client.downloadFullProject(null))
                .thenReturn(build);
        when(client.uploadStorage(eq("first.po-CR-uk-UA"), any()))
                .thenReturn(1L);
        when(client.uploadStorage(eq("first.po-CR-en-GB"), any()))
                .thenReturn(2L);
        when(client.importTranslations(eq(request1))).thenReturn(importTranslationsStatus);
        when(client.importTranslations(eq(request2))).thenReturn(importTranslationsStatus);

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadTranslationsAction(false, null, null, false, false, false, false, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).uploadStorage(eq("first.po-CR-uk-UA"), any());
        verify(client).uploadStorage(eq("first.po-CR-en-GB"), any());
        verify(client).importTranslations(eq(request1));
        verify(client).importTranslations(eq(request2));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneOfTwoTranslation_EmptyProject() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        project.addFile(Utils.normalizePath("first.po-CR-uk-UA"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%", Arrays.asList("*-CR-*"))
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build();
        build.setType(Type.FILES_BASED);
        when(client.downloadFullProject(null))
                .thenReturn(build);

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadTranslationsAction(false, null, null, false, false, false, false, false, false);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject(null);
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadSpreadsheetTranslation_Project() throws ResponseException {
        project.addFile(Utils.normalizePath("first.csv"), "Hello, World!");
        project.addFile(Utils.normalizePath("first.csv-CR"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR", Arrays.asList("*-CR"))
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        pb.getFiles().get(0).setScheme("identifier,source_phrase,context,uk,ru,fr");
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.csv", "csv", 301L, null, null).build();
        build.setType(Type.FILES_BASED);
        ImportTranslationsRequest request = new ImportTranslationsRequest() {{
            setStorageId(1L);
            setFileId(301L);
            setImportEqSuggestions(false);
            setAutoApproveImported(false);
            setTranslateHidden(false);
            setLanguageIds(List.of(
                    "de",
                    "en",
                    "ru",
                    "ua"
            ));
        }};
        ImportTranslationsStatus importTranslationsStatus = new ImportTranslationsStatus();
        importTranslationsStatus.setStatus("finished");
        importTranslationsStatus.setIdentifier("123");

        when(client.downloadFullProject(null))
                .thenReturn(build);
        when(client.uploadStorage(eq("first.csv-CR"), any()))
                .thenReturn(1L);
        when(client.importTranslations(eq(request))).thenReturn(importTranslationsStatus);

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadTranslationsAction(false, null, null, false, false, false, false, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).uploadStorage(eq("first.csv-CR"), any());
        verify(client).importTranslations(eq(request));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadWithDest() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        project.addFile(Utils.normalizePath("first.po-CR-uk-UA"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%", Arrays.asList("*-CR-*"), "/second.po")
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("second.po", "gettext", 301L, null, null).build();
        build.setType(Type.FILES_BASED);
        ImportTranslationsRequest request = new ImportTranslationsRequest() {{
            setStorageId(1L);
            setFileId(301L);
            setImportEqSuggestions(false);
            setAutoApproveImported(false);
            setTranslateHidden(false);
            setLanguageIds(List.of("ua"));
        }};
        ImportTranslationsStatus importTranslationsStatus = new ImportTranslationsStatus();
        importTranslationsStatus.setStatus("finished");
        importTranslationsStatus.setIdentifier("123");

        when(client.downloadFullProject(null))
                .thenReturn(build);
        when(client.uploadStorage(eq("first.po-CR-uk-UA"), any()))
                .thenReturn(1L);
        when(client.importTranslations(eq(request))).thenReturn(importTranslationsStatus);

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadTranslationsAction(false, null, null, false, false, false, false, false, false);
        assertDoesNotThrow(() -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject(null);
        verify(client).uploadStorage(eq("first.po-CR-uk-UA"), any());
        verify(client).importTranslations(eq(request));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneOfTwoTranslation_StringBasedProject() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        project.addFile(Utils.normalizePath("first.po-CR-uk-UA"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%", Arrays.asList("*-CR-*"))
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).addBranches(2L, "main").build();
        build.setType(Type.STRINGS_BASED);
        ImportTranslationsStringsBasedRequest importTranslationsStringsBasedRequest = new ImportTranslationsStringsBasedRequest() {{
            setStorageId(1L);
            setBranchId(2L);
            setImportEqSuggestions(false);
            setAutoApproveImported(false);
            setTranslateHidden(false);
            setLanguageIds(List.of("ua"));
        }};
        ImportTranslationsStringsBasedStatus status = new ImportTranslationsStringsBasedStatus();
        status.setStatus("finished");
        status.setIdentifier("123");

        when(client.downloadFullProject("main"))
                .thenReturn(build);
        when(client.uploadStorage(eq("first.po-CR-uk-UA"), any()))
                .thenReturn(1L);
        when(client.importTranslations(eq(importTranslationsStringsBasedRequest))).thenReturn(status);

        NewAction<PropertiesWithFiles, ProjectClient> action = new UploadTranslationsAction(false, null, "main", false, false, false, false, false, false);
        assertDoesNotThrow(() -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject("main");
        verify(client).uploadStorage(eq("first.po-CR-uk-UA"), any());

        verify(client).importTranslations(eq(importTranslationsStringsBasedRequest));
        verifyNoMoreInteractions(client);
    }
}

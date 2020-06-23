package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.properties.PropertiesBeanBuilder;
import com.crowdin.cli.properties.helper.FileHelperTest;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.translations.model.UploadTranslationsRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

public class UploadTranslationsActionTest {

    static TempProject project;

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
        PropertiesBeanBuilder pbBuilder = new PropertiesBeanBuilder()
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%", Arrays.asList("*-CR-*"))
            .setBasePath(project.getBasePath());
        PropertiesBean pb = pbBuilder.build();
        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 301L, null, null).build());
        when(client.uploadStorage(eq("first.po-CR-uk-UA"), any()))
            .thenReturn(1L);

        Action action = new UploadTranslationsAction(false, null, null, false, false, false);
        action.act(pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.po-CR-uk-UA"), any());
        UploadTranslationsRequest uploadTranslationRequest = new UploadTranslationsRequest() {{
            setStorageId(1L);
            setFileId(301L);
            setImportEqSuggestions(false);
            setAutoApproveImported(false);
        }};
        verify(client).uploadTranslations(eq("ua"), eq(uploadTranslationRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadBothTranslation_Project() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        project.addFile(Utils.normalizePath("first.po-CR-uk-UA"), "Hello, World!");
        project.addFile(Utils.normalizePath("first.po-CR-ru-RU"), "Hello, World!");
        PropertiesBeanBuilder pbBuilder = new PropertiesBeanBuilder()
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%", Arrays.asList("*-CR-*"))
            .setBasePath(project.getBasePath());
        PropertiesBean pb = pbBuilder.build();
        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 301L, null, null).build());
        when(client.uploadStorage(eq("first.po-CR-uk-UA"), any()))
            .thenReturn(1L);
        when(client.uploadStorage(eq("first.po-CR-ru-RU"), any()))
            .thenReturn(2L);

        Action action = new UploadTranslationsAction(false, null, null, false, false, false);
        action.act(pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.po-CR-uk-UA"), any());
        verify(client).uploadStorage(eq("first.po-CR-ru-RU"), any());
        UploadTranslationsRequest uploadTranslationRequest1 = new UploadTranslationsRequest() {{
            setStorageId(1L);
            setFileId(301L);
            setImportEqSuggestions(false);
            setAutoApproveImported(false);
        }};
        verify(client).uploadTranslations(eq("ua"), eq(uploadTranslationRequest1));
        UploadTranslationsRequest uploadTranslationRequest2 = new UploadTranslationsRequest() {{
            setStorageId(2L);
            setFileId(301L);
            setImportEqSuggestions(false);
            setAutoApproveImported(false);
        }};
        verify(client).uploadTranslations(eq("ru"), eq(uploadTranslationRequest2));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadOneOfTwoTranslation_EmptyProject() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        project.addFile(Utils.normalizePath("first.po-CR-uk-UA"), "Hello, World!");
        PropertiesBeanBuilder pbBuilder = new PropertiesBeanBuilder()
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%", Arrays.asList("*-CR-*"))
            .setBasePath(project.getBasePath());
        PropertiesBean pb = pbBuilder.build();
        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());

        Action action = new UploadTranslationsAction(false, null, null, false, false, false);
        action.act(pb, client);

        verify(client).downloadFullProject();
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadSpreadsheetTranslation_Project() throws ResponseException {
        project.addFile(Utils.normalizePath("first.csv"), "Hello, World!");
        project.addFile(Utils.normalizePath("first.csv-CR"), "Hello, World!");
        PropertiesBeanBuilder pbBuilder = new PropertiesBeanBuilder()
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR", Arrays.asList("*-CR"))
            .setBasePath(project.getBasePath());
        PropertiesBean pb = pbBuilder.build();
        pb.getFiles().get(0).setScheme("identifier,source_phrase,context,uk,ru,fr");
        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.csv", "csv", 301L, null, null).build());
        when(client.uploadStorage(eq("first.csv-CR"), any()))
            .thenReturn(1L);

        Action action = new UploadTranslationsAction(false, null, null, false, false, false);
        action.act(pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.csv-CR"), any());
        UploadTranslationsRequest uploadTranslationRequest = new UploadTranslationsRequest() {{
            setStorageId(1L);
            setFileId(301L);
            setImportEqSuggestions(false);
            setAutoApproveImported(false);
        }};
        verify(client).uploadTranslations(eq("ua"), eq(uploadTranslationRequest));
        verify(client).uploadTranslations(eq("ru"), eq(uploadTranslationRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadWithDest() throws ResponseException {
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        project.addFile(Utils.normalizePath("first.po-CR-uk-UA"), "Hello, World!");
        PropertiesBeanBuilder pbBuilder = PropertiesBeanBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%", Arrays.asList("*-CR-*"), "/second.po")
            .setBasePath(project.getBasePath());
        PropertiesBean pb = pbBuilder.build();
        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("second.po", "gettext", 301L, null, null).build());
        when(client.uploadStorage(eq("first.po-CR-uk-UA"), any()))
            .thenReturn(1L);

        Action action = new UploadTranslationsAction(false, null, null, false, false, false);
        action.act(pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.po-CR-uk-UA"), any());
        UploadTranslationsRequest uploadTranslationRequest = new UploadTranslationsRequest() {{
            setStorageId(1L);
            setFileId(301L);
            setImportEqSuggestions(false);
            setAutoApproveImported(false);
        }};
        verify(client).uploadTranslations(eq("ua"), eq(uploadTranslationRequest));
        verifyNoMoreInteractions(client);
    }
}

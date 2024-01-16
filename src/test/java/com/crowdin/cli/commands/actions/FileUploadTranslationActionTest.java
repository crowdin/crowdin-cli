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
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.translations.model.UploadTranslationsRequest;
import com.crowdin.client.translations.model.UploadTranslationsStringsRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;

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
        when(client.downloadFullProject(any()))
            .thenReturn(build);
        when(client.uploadStorage(eq("first_uk.po"), any()))
            .thenReturn(1L);

        NewAction<ProjectProperties, ProjectClient> action = new FileUploadTranslationAction(fileToUpload, null, "first.po", "ua", false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(any());
        verify(client).uploadStorage(eq("first_uk.po"), any());
        UploadTranslationsRequest request = new UploadTranslationsRequest() {{
            setFileId(101L);
            setStorageId(1L);
        }};
        verify(client).uploadTranslations(eq("ua"), eq(request));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadTranslation_StringBasedProject() throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + "first_uk.po");
        project.addFile(Utils.normalizePath("first_uk.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build();
        build.setType(Type.STRINGS_BASED);
        Branch branch = mock(Branch.class);
        when(branch.getId()).thenReturn(2L);
        when(client.downloadFullProject(any()))
            .thenReturn(build);
        when(client.uploadStorage(eq("first_uk.po"), any()))
            .thenReturn(1L);
        when(client.addBranch(any()))
            .thenReturn(branch);

        NewAction<ProjectProperties, ProjectClient> action = new FileUploadTranslationAction(fileToUpload, "main", null, "ua", false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(any());
        verify(client).addBranch(any());
        verify(client).uploadStorage(eq("first_uk.po"), any());
        UploadTranslationsStringsRequest request = new UploadTranslationsStringsRequest() {{
            setBranchId(2L);
            setStorageId(1L);
        }};
        verify(client).uploadTranslationStringsBased(eq("ua"), eq(request));
        verifyNoMoreInteractions(client);
    }
}
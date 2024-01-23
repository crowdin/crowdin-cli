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
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.AddFileRequest;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.UpdateFileRequest;
import com.crowdin.client.sourcestrings.model.UploadStringsProgress;
import com.crowdin.client.sourcestrings.model.UploadStringsRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.util.Arrays;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class FileUploadActionTest {
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
    public void testUpload_FileBasedProject() throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + "first.po");
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build();
        build.setType(Type.FILES_BASED);
        when(client.downloadFullProject())
            .thenReturn(build);
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);

        NewAction<ProjectProperties, ProjectClient> action = new FileUploadAction(fileToUpload, null, false, null, null, false, false, null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("first.po");
            setStorageId(1L);
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUpload_StringBasedProject() throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + "first.po");
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        Branch branch = mock(Branch.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build();
        build.setType(Type.STRINGS_BASED);
        UploadStringsProgress progress = new UploadStringsProgress() {{
            setIdentifier("id");
            setProgress(100);
        }};
        UploadStringsProgress progressFinished = new UploadStringsProgress() {{
            setIdentifier("id");
            setStatus("finished");
            setProgress(100);
        }};

        when(branch.getId()).thenReturn(2L);
        when(client.downloadFullProject()).thenReturn(build);
        when(client.uploadStorage(eq("first.po"), any())).thenReturn(1L);
        when(client.addBranch(any())).thenReturn(branch);
        when(client.addSourceStringsBased(any())).thenReturn(progress);
        when(client.getUploadStringsStatus(any())).thenReturn(progressFinished);

        NewAction<ProjectProperties, ProjectClient> action = new FileUploadAction(fileToUpload, "branch", false, null, null, false, false, null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.po"), any());
        verify(client).addBranch(any());
        verify(client).getUploadStringsStatus(any());
        UploadStringsRequest addFileRequest = new UploadStringsRequest() {{
            setBranchId(2L);
            setStorageId(1L);
            setCleanupMode(false);
            setUpdateStrings(false);
        }};
        verify(client).addSourceStringsBased(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadUpdate_FileBasedProject() throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + "first.po");
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addFile("first.po", "gettext", 101L, null, null).build();
        build.setType(Type.FILES_BASED);
        when(client.downloadFullProject())
            .thenReturn(build);
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);

        NewAction<ProjectProperties, ProjectClient> action = new FileUploadAction(fileToUpload, null, true, null, null, false, false, null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.po"), any());
        UpdateFileRequest addFileRequest = new UpdateFileRequest() {{
            setStorageId(1L);
        }};
        verify(client).updateSource(any(), eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadNoAutoUpdate_FileBasedProject() throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + "first.po");
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addFile("first.po", "gettext", 101L, null, null).build();
        build.setType(Type.FILES_BASED);
        when(client.downloadFullProject())
            .thenReturn(build);

        NewAction<ProjectProperties, ProjectClient> action = new FileUploadAction(fileToUpload, null, false, null, null, false, false, null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadWhenBranchMissed_FileBasedProject() throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + "first.po");
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        Branch branch = new Branch() {{
            setId(3L);
            setName("main");
        }};
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build();
        build.setType(Type.FILES_BASED);
        when(client.downloadFullProject())
            .thenReturn(build);
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);
        when(client.addBranch(any())).thenReturn(branch);

        NewAction<ProjectProperties, ProjectClient> action = new FileUploadAction(fileToUpload, "main", false, null, null, false, false, null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.po"), any());
        verify(client).addBranch(any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("first.po");
            setStorageId(1L);
            setBranchId(3L);
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadLabel_FileBasedProject() throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + "first.po");
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        Label label = new Label() {{
            setId(3L);
            setTitle("main_label");
        }};
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build();
        build.setType(Type.FILES_BASED);
        when(client.downloadFullProject())
            .thenReturn(build);
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);
        when(client.listLabels()).thenReturn(Collections.emptyList());
        when(client.addLabel(any())).thenReturn(label);

        NewAction<ProjectProperties, ProjectClient> action = new FileUploadAction(fileToUpload, null, false, Collections.singletonList("main_label"), null, false, false, null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.po"), any());
        verify(client).listLabels();
        verify(client).addLabel(any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("first.po");
            setStorageId(1L);
            setAttachLabelIds(Collections.singletonList(3L));
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadExcludedLangs_FileBasedProject() throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + "first.po");
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build();
        build.setType(Type.FILES_BASED);
        when(client.downloadFullProject())
            .thenReturn(build);
        when(client.uploadStorage(eq("first.po"), any()))
            .thenReturn(1L);
        when(client.listLabels()).thenReturn(Collections.emptyList());

        NewAction<ProjectProperties, ProjectClient> action = new FileUploadAction(fileToUpload, null, false, null, null, false, false, Arrays.asList("ua", "fr"), false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("first.po");
            setStorageId(1L);
            setExcludedTargetLanguages(Collections.singletonList("ua"));
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadWithDest_FileBasedProject() throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + "first.po");
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build();
        build.setType(Type.FILES_BASED);
        Directory directory = new Directory(){{
            setId(2L);
        }};
        when(client.downloadFullProject())
            .thenReturn(build);
        when(client.addDirectory(any()))
            .thenReturn(directory);
        when(client.uploadStorage(eq("save.po"), any()))
            .thenReturn(1L);
        NewAction<ProjectProperties, ProjectClient> action = new FileUploadAction(fileToUpload, null, false, null, "path/to/save.po", false, false, null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client, times(2)).addDirectory(any());
        verify(client).uploadStorage(eq("save.po"), any());
        AddFileRequest addFileRequest = new AddFileRequest() {{
            setName("save.po");
            setStorageId(1L);
            setDirectoryId(2L);
        }};
        verify(client).addSource(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testUploadCleanUpModeAndUpdateStrings_StringBasedProject() throws ResponseException {
        File fileToUpload = new File(project.getBasePath() + "first.po");
        project.addFile(Utils.normalizePath("first.po"), "Hello, World!");
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        Branch branch = mock(Branch.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build();
        build.setType(Type.STRINGS_BASED);
        UploadStringsProgress progress = new UploadStringsProgress() {{
            setIdentifier("id");
            setProgress(100);
        }};
        UploadStringsProgress progressFinished = new UploadStringsProgress() {{
            setIdentifier("id");
            setStatus("finished");
            setProgress(100);
        }};

        when(branch.getId()).thenReturn(2L);
        when(client.downloadFullProject()).thenReturn(build);
        when(client.uploadStorage(eq("first.po"), any())).thenReturn(1L);
        when(client.addBranch(any())).thenReturn(branch);
        when(client.addSourceStringsBased(any())).thenReturn(progress);
        when(client.getUploadStringsStatus(any())).thenReturn(progressFinished);

        NewAction<ProjectProperties, ProjectClient> action = new FileUploadAction(fileToUpload, "branch", false, null, null, true, true, null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).uploadStorage(eq("first.po"), any());
        verify(client).addBranch(any());
        verify(client).getUploadStringsStatus(any());
        UploadStringsRequest addFileRequest = new UploadStringsRequest() {{
            setBranchId(2L);
            setStorageId(1L);
            setCleanupMode(true);
            setUpdateStrings(true);
        }};
        verify(client).addSourceStringsBased(eq(addFileRequest));
        verifyNoMoreInteractions(client);
    }
}
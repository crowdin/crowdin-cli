package com.crowdin.cli.commands.actions;

import com.crowdin.cli.MockitoUtils;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.URL;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class DownloadSourcesActionTest {

    TempProject project;

    @BeforeEach
    public void createProj() {
        project = new TempProject(DownloadSourcesActionTest.class);
    }

    @AfterEach
    public void deleteProj() {
        project.delete();
    }

    @Test
    public void testDest() throws IOException {
        PropertiesWithFiles pb = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean(
                "/values/strings.xml", "/values-%two_letters_code%/%original_file_name%",
                null, "/common/%original_file_name%")
            .setBasePath(project.getBasePath())
            .build();

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addDirectory("common", 201L, null, null)
                .addFile("strings.xml", "gettext", 101L, 201L, null, "/values-%two_letters_code%/%original_file_name%").build());
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadFile(eq(101L)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadSourcesAction(files, false, false, null, true, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).downloadFile(eq(101L));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "values/strings.xml")), any());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void testDestAndUnaryAsterisk() throws IOException {
        PropertiesWithFiles pb = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean(
                "/*.xml", "/tests/tr-%locale%/%original_file_name%",
                null, "destination/%original_file_name%")
            .setBasePath(project.getBasePath())
            .build();

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addDirectory("destination", 201L, null, null)
                .addFile("crowdin_sample_android.xml", "gettext", 101L, 201L, null, "/tests/tr-%locale%/%original_file_name%").build());
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadFile(eq(101L)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadSourcesAction(files, false, false, null, true, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).downloadFile(eq(101L));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/crowdin_sample_android.xml")), any());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void testDifferentPatterns() throws IOException {
        PropertiesWithFiles pb = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("/folder_1/**/*.xml", "/%locale%/folder_1/**/%file_name%.xml")
            .addBuiltFileBean("/folder_2/android_1.xml", "/%locale%/folder_2/%file_name%.xml")
            .addBuiltFileBean("/folder_2/android_[2-3].xml", "/%locale%/folder_2/%file_name%.xml")
            .addBuiltFileBean("/folder_2/android_4?.xml", "/%locale%/folder_2/%file_name%.xml")
            .setBasePath(project.getBasePath())
            .setPreserveHierarchy(true)
            .build();

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addDirectory("folder_1", 201L, null, null)
                .addDirectory("f1", 202L, 201L, null)
                .addDirectory("folder_1", 203L, 201L, null)
                .addDirectory("folder_2", 204L, null, null)
                .addFile("android.xml", "gettext", 101L, 202L, null, "/%locale%/folder_1/f1/%file_name%.xml")
                .addFile("android.xml", "gettext", 102L, 203L, null, "/%locale%/folder_1/folder_1/%file_name%.xml")
                .addFile("android.xml", "gettext", 103L, 201L, null, "/%locale%/folder_1/%file_name%.xml")
                .addFile("android_1.xml", "gettext", 104L, 204L, null, "/%locale%/folder_2/%file_name%.xml")
                .addFile("android_2.xml", "gettext", 105L, 204L, null, "/%locale%/folder_2/%file_name%.xml")
                .addFile("android_3.xml", "gettext", 106L, 204L, null, "/%locale%/folder_2/%file_name%.xml")
                .addFile("android_4a.xml", "gettext", 107L, 204L, null, "/%locale%/folder_2/%file_name%.xml")
                .build());
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadFile(eq(101L)))
            .thenReturn(urlMock);
        when(client.downloadFile(eq(102L)))
            .thenReturn(urlMock);
        when(client.downloadFile(eq(103L)))
            .thenReturn(urlMock);
        when(client.downloadFile(eq(104L)))
            .thenReturn(urlMock);
        when(client.downloadFile(eq(105L)))
            .thenReturn(urlMock);
        when(client.downloadFile(eq(106L)))
            .thenReturn(urlMock);
        when(client.downloadFile(eq(107L)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadSourcesAction(files, false, false, null, true, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).downloadFile(eq(101L));
        verify(client).downloadFile(eq(102L));
        verify(client).downloadFile(eq(103L));
        verify(client).downloadFile(eq(104L));
        verify(client).downloadFile(eq(105L));
        verify(client).downloadFile(eq(106L));
        verify(client).downloadFile(eq(107L));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder_1/android.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder_1/f1/android.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder_1/folder_1/android.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder_2/android_1.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder_2/android_2.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder_2/android_3.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder_2/android_4a.xml")), any());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void testWithPreserveHierarchyFalse() throws IOException {
        PropertiesWithFiles pb = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("/folder_1/**/*.xml", "/%locale%/folder_1/**/%file_name%.xml")
            .addBuiltFileBean("/folder_2/android_1.xml", "/%locale%/folder_2/%file_name%.xml")
            .addBuiltFileBean("/folder_2/android_[2-3].xml", "/%locale%/folder_2/%file_name%.xml")
            .addBuiltFileBean("/folder_2/android_4?.xml", "/%locale%/folder_2/%file_name%.xml")
            .setBasePath(project.getBasePath())
            .setPreserveHierarchy(false)
            .build();

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addDirectory("f1", 201L, null, null)
                .addDirectory("folder_1", 202L, null, null)
                .addFile("android.xml", "gettext", 101L, 201L, null, "/%locale%/folder_1/f1/%file_name%.xml")
                .addFile("android.xml", "gettext", 102L, 202L, null, "/%locale%/folder_1/folder_1/%file_name%.xml")
                .addFile("android.xml", "gettext", 103L, null, null, "/%locale%/folder_1/%file_name%.xml")
                .addFile("android_1.xml", "gettext", 104L, null, null, "/%locale%/folder_2/%file_name%.xml")
                .addFile("android_2.xml", "gettext", 105L, null, null, "/%locale%/folder_2/%file_name%.xml")
                .addFile("android_3.xml", "gettext", 106L, null, null, "/%locale%/folder_2/%file_name%.xml")
                .addFile("android_4a.xml", "gettext", 107L, null, null, "/%locale%/folder_2/%file_name%.xml")
                .build());
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadFile(eq(101L)))
            .thenReturn(urlMock);
        when(client.downloadFile(eq(102L)))
            .thenReturn(urlMock);
        when(client.downloadFile(eq(103L)))
            .thenReturn(urlMock);
        when(client.downloadFile(eq(104L)))
            .thenReturn(urlMock);
        when(client.downloadFile(eq(105L)))
            .thenReturn(urlMock);
        when(client.downloadFile(eq(106L)))
            .thenReturn(urlMock);
        when(client.downloadFile(eq(107L)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadSourcesAction(files, false, false, null, true, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).downloadFile(eq(101L));
        verify(client).downloadFile(eq(102L));
        verify(client).downloadFile(eq(103L));
        verify(client).downloadFile(eq(104L));
        verify(client).downloadFile(eq(105L));
        verify(client).downloadFile(eq(106L));
        verify(client).downloadFile(eq(107L));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/android.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/f1/android.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder_1/android.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/android_1.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/android_2.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/android_3.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/android_4a.xml")), any());
        verifyNoMoreInteractions(files);
    }
}

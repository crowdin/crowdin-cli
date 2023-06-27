package com.crowdin.cli.commands.actions;

import com.crowdin.cli.MockitoUtils;
import com.crowdin.cli.client.CrowdinProject;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ExecutionStatus;
import org.apache.commons.lang3.StringUtils;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.condition.DisabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.mockito.Mockito;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.PrintStream;
import java.net.URL;
import java.util.ArrayList;

import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

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
        when(client.downloadFullProject(null))
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addDirectory("common", 201L, null, null)
                .addFile("strings.xml", "gettext", 101L, 201L, null, "/values-%two_letters_code%/%original_file_name%").build());
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadFile(eq(101L)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadSourcesAction(files, false, false, null, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
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
        when(client.downloadFullProject(null))
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addDirectory("destination", 201L, null, null)
                .addFile("crowdin_sample_android.xml", "gettext", 101L, 201L, null, "/tests/tr-%locale%/%original_file_name%").build());
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadFile(eq(101L)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadSourcesAction(files, false, false, null, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).downloadFile(eq(101L));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/crowdin_sample_android.xml")), any());
        verifyNoMoreInteractions(files);
    }

    @Test
    @DisabledOnOs(OS.WINDOWS)
    public void testDifferentPatterns() throws IOException {
        PropertiesWithFiles pb = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("/folder_1/**/*.xml", "/%locale%/folder_1/**/%file_name%.xml")
            .addBuiltFileBean("/folder_2/android_1.xml", "/%locale%/folder_2/%file_name%.xml")
            .addBuiltFileBean("/folder_2/android_[2-3].xml", "/%locale%/folder_2/%file_name%.xml")
            .addBuiltFileBean("/folder_2/android_4?.xml", "/%locale%/folder_2/%file_name%.xml")
            .addBuiltFileBean("folder1/folder2/**/messages.json", "/folder1/folder2/**/%file_name%_%two_letters_code%.json", new ArrayList<>(), "/folder_on_crowdin/%original_path%/%file_name%.json")
            .addBuiltFileBean("folder1/folder2/**/plugins.json", "/folder1/folder2/**/%file_name%_%two_letters_code%.json", new ArrayList<>(), "/folder_on_crowdin/%original_path%/%file_name%.json")
            .addBuiltFileBean("foo_string.json", "/workdir/foo/string_%two_letters_code%.json", new ArrayList<>(), "/foo_string.json")
            .setBasePath(project.getBasePath())
            .setPreserveHierarchy(true)
            .build();

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addDirectory("folder_1", 201L, null, null)
                .addDirectory("f1", 202L, 201L, null)
                .addDirectory("folder_1", 203L, 201L, null)
                .addDirectory("folder_2", 204L, null, null)
                .addDirectory("folder_on_crowdin", 205L, null, null)
                .addDirectory("folder1", 206L, 205L, null)
                .addDirectory("folder2", 207L, 206L, null)
                .addDirectory("nested", 208L, 207L, null)
                .addFile("android.xml", "gettext", 101L, 202L, null, "/%locale%/folder_1/f1/%file_name%.xml")
                .addFile("android.xml", "gettext", 102L, 203L, null, "/%locale%/folder_1/folder_1/%file_name%.xml")
                .addFile("android.xml", "gettext", 103L, 201L, null, "/%locale%/folder_1/%file_name%.xml")
                .addFile("android_1.xml", "gettext", 104L, 204L, null, "/%locale%/folder_2/%file_name%.xml")
                .addFile("android_2.xml", "gettext", 105L, 204L, null, "/%locale%/folder_2/%file_name%.xml")
                .addFile("android_3.xml", "gettext", 106L, 204L, null, "/%locale%/folder_2/%file_name%.xml")
                .addFile("android_4a.xml", "gettext", 107L, 204L, null, "/%locale%/folder_2/%file_name%.xml")
                .addFile("messages.json", "json", 108L, 208L, null, "/folder1/folder2/nested/%file_name%_%two_letters_code%.json")
                .addFile("plugins.json", "json", 109L, 208L, null, "/folder1/folder2/nested/%file_name%_%two_letters_code%.json")
                .addFile("foo_string.json", "json", 110L, null, null, null)
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
        when(client.downloadFile(eq(108L)))
            .thenReturn(urlMock);
        when(client.downloadFile(eq(109L)))
            .thenReturn(urlMock);
        when(client.downloadFile(eq(110L)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadSourcesAction(files, false, false, null, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).downloadFile(eq(101L));
        verify(client).downloadFile(eq(102L));
        verify(client).downloadFile(eq(103L));
        verify(client).downloadFile(eq(104L));
        verify(client).downloadFile(eq(105L));
        verify(client).downloadFile(eq(106L));
        verify(client).downloadFile(eq(107L));
        verify(client).downloadFile(eq(108L));
        verify(client).downloadFile(eq(109L));
        verify(client).downloadFile(eq(110L));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder_1/android.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder_1/f1/android.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder_1/folder_1/android.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder_2/android_1.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder_2/android_2.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder_2/android_3.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder_2/android_4a.xml")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder1/folder2/nested/messages.json")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/folder1/folder2/nested/plugins.json")), any());
        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "/foo_string.json")), any());
        verifyNoMoreInteractions(files);
    }

    @Test
    @DisabledOnOs(OS.WINDOWS)
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
        when(client.downloadFullProject(null))
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
            new DownloadSourcesAction(files, false, false, null, true, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
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

    @Test
    public void testDryRun() {
        ByteArrayOutputStream outContent = new ByteArrayOutputStream();
        PrintStream ps = System.out;
        System.setOut(new PrintStream(outContent));

        PropertiesWithFiles pb = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean(
                "/values/strings.xml", "/values-%two_letters_code%/%original_file_name%",
                null, "/common/%original_file_name%")
            .setBasePath(project.getBasePath())
            .build();

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addDirectory("common", 201L, null, null)
            .addFile("strings.xml", "gettext", 101L, 201L, null, "/values-%two_letters_code%/%original_file_name%").build());
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadFile(eq(101L)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadSourcesAction(files, false, false, null, true, false,true);
        action.act(Outputter.getDefault(), pb, client);

        String outMessage1 = OK.withIcon("Fetching project info");
        String outMessage2 = OK.withIcon(String.format("File @|bold 'common%sstrings.xml'|@", File.separator));

        client.downloadFullProject(null);
        client.downloadFile(101L);

        assertThat(outContent.toString(), Matchers.containsString(outMessage1));
        assertThat(outContent.toString(), Matchers.containsString(outMessage2));
    }

    @Test
    public void testReviewedOnly() {
        ByteArrayOutputStream outContent = new ByteArrayOutputStream();
        PrintStream ps = System.out;
        System.setOut(new PrintStream(outContent));

        PropertiesWithFiles pb = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean(
                "/values/strings.xml", "/values-%two_letters_code%/%original_file_name%",
                null, "/common/%original_file_name%")
            .setBasePath(project.getBasePath())
            .build();

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addDirectory("common", 201L, null, null)
                .addFile("strings.xml", "gettext", 101L, 201L, null, "/values-%two_letters_code%/%original_file_name%").build());
        URL urlMock = MockitoUtils.getMockUrl(getClass());
        when(client.downloadFile(eq(101L)))
            .thenReturn(urlMock);

        FilesInterface files = mock(FilesInterface.class);

        NewAction<PropertiesWithFiles, ProjectClient> action =
            new DownloadSourcesAction(files, false, false, null, true, true, false);
        action.act(Outputter.getDefault(), pb, client);

        String warnMessage = WARNING.withIcon("Operation is available only for Crowdin Enterprise")
                + System.lineSeparator();

        client.downloadFullProject(null);
        assertEquals(warnMessage, outContent.toString());
    }
}

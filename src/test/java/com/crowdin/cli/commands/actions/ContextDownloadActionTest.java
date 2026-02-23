package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.models.SourceStringBuilder;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.properties.NewProjectPropertiesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcestrings.model.SourceString;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.InputStream;
import java.io.File;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

public class ContextDownloadActionTest {

    @Test
    public void testJsonlSavesSingleString() throws Exception {
        ProjectProperties pb = NewProjectPropertiesUtilBuilder.minimalBuilt().build();

        // Build project with one file (id=101)
        var projectFull = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addFile("first.txt", "plain", 101L, null, null, "/%original_file_name%")
            .build();
        projectFull.setType(Type.FILES_BASED);

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null)).thenReturn(projectFull);
        when(client.listLabels()).thenReturn(List.of());

        SourceString ss = SourceStringBuilder.standard()
            .setProjectId(Long.parseLong(pb.getProjectId()))
            .setIdentifiers(701L, "the-text", "manual\n\n✨ AI Context\nai-content\n✨ 🔚", "the.key", 101L)
            .build();

        when(client.listSourceString(null, null, null, null, null, null, null))
            .thenReturn(Arrays.asList(ss));

        FilesInterface files = mock(FilesInterface.class);
        File to = new File("out.jsonl");

        ContextDownloadAction action = new ContextDownloadAction(
            to,
            null,
            null,
            null,
            null,
            null,
            null,
            "jsonl",
            files,
            true,
            false
        );

        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).listLabels();
        verify(client).listSourceString(null, null, null, null, null, null, null);

        ArgumentCaptor<InputStream> captor = ArgumentCaptor.forClass(InputStream.class);
        verify(files).writeToFile(eq(to.toString()), captor.capture());

        try (InputStream is = captor.getValue()) {
            byte[] bytes = is.readAllBytes();
            String content = new String(bytes, UTF_8);
            // The saved jsonl should contain id and key
            assertTrue(content.contains("\"id\":701"));
            assertTrue(content.contains("\"key\":\"the.key\""));
            assertTrue(content.contains("\"ai_context\":\"ai-content\""));
        }

        verifyNoMoreInteractions(files);
    }

    @Test
    public void testStatusFilterAi() throws Exception {
        ProjectProperties pb = NewProjectPropertiesUtilBuilder.minimalBuilt().build();

        var projectFull = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addFile("first.txt", "plain", 101L, null, null, "/%original_file_name%")
            .build();
        projectFull.setType(Type.FILES_BASED);

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null)).thenReturn(projectFull);
        when(client.listLabels()).thenReturn(List.of());

        SourceString emptyCtx = SourceStringBuilder.standard()
            .setProjectId(Long.parseLong(pb.getProjectId()))
            .setIdentifiers(1L, "t1", "", "k1", 101L).build();
        SourceString aiCtx = SourceStringBuilder.standard()
            .setProjectId(Long.parseLong(pb.getProjectId()))
            .setIdentifiers(2L, "t2", "manual\n\n✨ AI Context\naiOnly\n✨ 🔚", "k2", 101L).build();
        SourceString manualCtx = SourceStringBuilder.standard()
            .setProjectId(Long.parseLong(pb.getProjectId()))
            .setIdentifiers(3L, "t3", "only manual", "k3", 101L).build();

        when(client.listSourceString(null, null, null, null, null, null, null))
            .thenReturn(Arrays.asList(emptyCtx, aiCtx, manualCtx));

        FilesInterface files = mock(FilesInterface.class);
        File to = new File("out2.jsonl");

        ContextDownloadAction action = new ContextDownloadAction(
            to,
            null,
            null,
            null,
            null,
            null,
            "ai",
            "jsonl",
            files,
            true,
            false
        );

        action.act(Outputter.getDefault(), pb, client);

        ArgumentCaptor<InputStream> captor = ArgumentCaptor.forClass(InputStream.class);
        verify(files).writeToFile(eq(to.toString()), captor.capture());
        String content;
        try (InputStream is = captor.getValue()) {
            content = new String(is.readAllBytes(), UTF_8);
        }

        // ensure only the AI-context string (id=2) is present
        assertTrue(content.contains("\"id\":2"));
        assertFalse(content.contains("\"id\":1"));
        assertFalse(content.contains("\"id\":3"));

        verifyNoMoreInteractions(files);
    }

    @Test
    public void testSinceFilterExcludesStringsAndNoWrite() throws Exception {
        ProjectProperties pb = NewProjectPropertiesUtilBuilder.minimalBuilt().build();

        var projectFull = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addFile("first.txt", "plain", 101L, null, null, "/%original_file_name%")
            .build();
        projectFull.setType(Type.FILES_BASED);

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null)).thenReturn(projectFull);
        when(client.listLabels()).thenReturn(List.of());

        // SourceStringBuilder.standard() has createdAt 2020-03-20, so sinceFilter 2020-03-21 will exclude it
        SourceString ss = SourceStringBuilder.standard()
            .setProjectId(Long.parseLong(pb.getProjectId()))
            .setIdentifiers(701L, "the-text", "manual", "the.key", 101L)
            .build();

        when(client.listSourceString(null, null, null, null, null, null, null))
            .thenReturn(Arrays.asList(ss));

        FilesInterface files = mock(FilesInterface.class);
        File to = new File("out3.jsonl");

        ContextDownloadAction action = new ContextDownloadAction(
            to,
            null,
            null,
            null,
            null,
            LocalDate.of(2020, 3, 21),
            null,
            "jsonl",
            files,
            true,
            false
        );

        action.act(Outputter.getDefault(), pb, client);

        // since all strings are filtered out, writeToFile should not be called
        verify(files, never()).writeToFile(any(), any());
    }


    @Test
    public void testJsonlSavesFileFilter() throws Exception {
        ProjectProperties pb = NewProjectPropertiesUtilBuilder.minimalBuilt().build();

        // Build project with one file (id=101)
        var projectFull = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("/android-new-file.xml", "plain", 101L, null, null, "/%original_file_name%")
                .addFile("/android-new-file2.xml", "plain", 102L, null, null, "/%original_file_name%")
                .build();
        projectFull.setType(Type.FILES_BASED);

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null)).thenReturn(projectFull);
        when(client.listLabels()).thenReturn(List.of());

        SourceString ss = SourceStringBuilder.standard()
                .setProjectId(Long.parseLong(pb.getProjectId()))
                .setIdentifiers(701L, "the-text", "manual\n\n✨ AI Context\nai-content\n✨ 🔚", "the.key", 101L)
                .build();

        when(client.listSourceString(101L, null, null, null, null, null, null))
                .thenReturn(Arrays.asList(ss));

        FilesInterface files = mock(FilesInterface.class);
        File to = new File("out.jsonl");

        ContextDownloadAction action = new ContextDownloadAction(
                to,
                List.of("android-new-file.xml"),
                null,
                null,
                null,
                null,
                null,
                "jsonl",
                files,
                true,
                false
        );

        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).listLabels();
        verify(client).listSourceString(101L, null, null, null, null, null, null);

        ArgumentCaptor<InputStream> captor = ArgumentCaptor.forClass(InputStream.class);
        verify(files).writeToFile(eq(to.toString()), captor.capture());

        try (InputStream is = captor.getValue()) {
            byte[] bytes = is.readAllBytes();
            String content = new String(bytes, UTF_8);
            // The saved jsonl should contain id and key
            assertTrue(content.contains("\"id\":701"));
            assertFalse(content.contains("\"id\":702"));
            assertTrue(content.contains("\"key\":\"the.key\""));
            assertFalse(content.contains("\"key\":\"the.key2\""));
            assertTrue(content.contains("\"ai_context\":\"ai-content\""));
        }

        verifyNoMoreInteractions(files);
    }

    @Test
    public void testJsonlSavesFileFilter2() throws Exception {
        ProjectProperties pb = NewProjectPropertiesUtilBuilder.minimalBuilt().build();

        // Build project with one file (id=101)
        var projectFull = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("/[test.Folder dev]/resources/js/lang/en/auth.php", "plain", 101L, null, null, "/%original_file_name%")
                .addFile("/[test.Folder dev]/resources/js/lang/en/email.php", "plain", 102L, null, null, "/%original_file_name%")
                .build();
        projectFull.setType(Type.FILES_BASED);

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null)).thenReturn(projectFull);
        when(client.listLabels()).thenReturn(List.of());

        SourceString ss1 = SourceStringBuilder.standard()
                .setProjectId(Long.parseLong(pb.getProjectId()))
                .setIdentifiers(701L, "the-text", "manual\n\n✨ AI Context\nai-content\n✨ 🔚", "the.key", 101L)
                .build();

        SourceString ss2 = SourceStringBuilder.standard()
                .setProjectId(Long.parseLong(pb.getProjectId()))
                .setIdentifiers(702L, "the-text2", "manual\n\n✨ AI Context\nai-content2\n✨ 🔚", "the.key2", 101L)
                .build();

        when(client.listSourceString(101L, null, null, null, null, null, null))
                .thenReturn(Arrays.asList(ss1));

        when(client.listSourceString(102L, null, null, null, null, null, null))
                .thenReturn(Arrays.asList(ss2));

        FilesInterface files = mock(FilesInterface.class);
        File to = new File("out.jsonl");

        ContextDownloadAction action = new ContextDownloadAction(
                to,
                List.of("/[test.Folder dev]/**/*.php"),
                null,
                null,
                null,
                null,
                null,
                "jsonl",
                files,
                true,
                false
        );

        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).listLabels();
        verify(client).listSourceString(101L, null, null, null, null, null, null);
        verify(client).listSourceString(102L, null, null, null, null, null, null);

        ArgumentCaptor<InputStream> captor = ArgumentCaptor.forClass(InputStream.class);
        verify(files).writeToFile(eq(to.toString()), captor.capture());

        try (InputStream is = captor.getValue()) {
            byte[] bytes = is.readAllBytes();
            String content = new String(bytes, UTF_8);
            // The saved jsonl should contain id and key
            assertTrue(content.contains("\"id\":701"));
            assertTrue(content.contains("\"id\":702"));
            assertTrue(content.contains("\"key\":\"the.key\""));
            assertTrue(content.contains("\"key\":\"the.key2\""));
            assertTrue(content.contains("\"ai_context\":\"ai-content\""));
            assertTrue(content.contains("\"ai_context\":\"ai-content2\""));
        }

        verifyNoMoreInteractions(files);
    }
}

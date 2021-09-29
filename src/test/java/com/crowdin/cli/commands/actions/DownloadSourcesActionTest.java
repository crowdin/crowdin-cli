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
            new DownloadSourcesAction(files, false, false, null, true);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).downloadFile(eq(101L));
        verifyNoMoreInteractions(client);

        verify(files).writeToFile(eq(Utils.joinPaths(project.getBasePath(), "values/strings.xml")), any());
        verifyNoMoreInteractions(files);
    }
}

package com.crowdin.cli.commands.actions;

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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class ListSourcesActionTest {

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
    public void testForServerInteraction() throws ResponseException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadProjectWithLanguages())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());

        NewAction<PropertiesWithFiles, ProjectClient> action = new ListSourcesAction(false, null, false, false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadProjectWithLanguages();
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testForPreserveHierarchy() throws ResponseException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadProjectWithLanguages())
                .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());

        NewAction<PropertiesWithFiles, ProjectClient> action = new ListSourcesAction(false, null, false, false, false);
        action.act(Outputter.getDefault(), pb, client);
        pb.setPreserveHierarchy(true);
        action.act(Outputter.getDefault(), pb, client);
    }
}

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

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class ListProjectActionTest {

    TempProject project;

    ProjectClient client = mock(ProjectClient.class);
    NewAction<PropertiesWithFiles, ProjectClient> action;
    PropertiesWithFiles pb;

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
        pb = pbBuilder.build();
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 101L, null, null).build());

        action = new ListProjectAction(false, null, true, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testForNonexistentBranch() throws ResponseException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(project.getBasePath());
        pb = pbBuilder.build();
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 101L, null, null).build());

        action = new ListProjectAction(false, "nonexistentBranch", false, false);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject();
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testForExistentBranch() throws ResponseException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(project.getBasePath());
        pb = pbBuilder.build();
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.po", "gettext", 101L, null, null)
                .addBranches(1L, "existentBranch").build());

        action = new ListProjectAction(false, "existentBranch", false, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verifyNoMoreInteractions(client);
    }
}

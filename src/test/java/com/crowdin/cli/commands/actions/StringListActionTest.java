package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.client.models.SourceStringBuilder;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.projectsgroups.model.Type;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.Arrays;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class StringListActionTest {

    private PropertiesWithFiles pb;
    private ProjectClient client = mock(ProjectClient.class);
    private NewAction<ProjectProperties, ProjectClient> action;

    @ParameterizedTest
    @MethodSource
    public void testStringList(String file, String filter) {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        pb = pbBuilder.build();
        CrowdinProjectFull projectFull = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).addBranches(3L, "main")
            .addFile("first.csv", "csv", 101L, null, 3L).build();
        projectFull.setType(Type.FILES_BASED);
        when(client.downloadFullProject("main"))
            .thenReturn(projectFull);
        when(client.listSourceString(101L, null, null, filter, null, null, null))
            .thenReturn(Arrays.asList(SourceStringBuilder.standard()
                .setProjectId(Long.parseLong(pb.getProjectId()))
                .setIdentifiers(701L, "7-0-1", "seven-o-one", "7.0.1", 101L).build()));

        action = new StringListAction(true, true, file, filter, "main", null, null, null, null, true);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(eq("main"));
        verify(client).listLabels();
        if (file != null) {
            verify(client).listSourceString(101L, null, null, filter, null, null, null);
        } else {
            verify(client).listSourceString(null, null, null, filter, null, null, null);
        }
        verifyNoMoreInteractions(client);
    }

    public static Stream<Arguments> testStringList() {
        return Stream.of(
            arguments("first.csv", null),
            arguments(null, null)
        );
    }

    @Test
    public void testGetProjectThrows() throws ResponseException {

        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        pb = pbBuilder.build();
        when(client.downloadFullProject(null))
            .thenThrow(new RuntimeException("Whoops"));

        action = new StringListAction(true, true, null, null, null, null, null, null, null, false);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject(null);
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testFileNotExistThrows() throws ResponseException {

        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        pb = pbBuilder.build();
        when(client.downloadFullProject(null))
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.csv", "csv", 101L, null, null).build());

        action = new StringListAction(true, true, "nonexistent.csv", null, null, null, null, null, null, false);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject(null);
        verify(client).listLabels();
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testStringList_StringsBasedProject() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        pb = pbBuilder.build();
        CrowdinProjectFull projectFull = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addFile("first.csv", "csv", 101L, null, null).build();
        projectFull.setType(Type.STRINGS_BASED);
        when(client.downloadFullProject(null))
            .thenReturn(projectFull);
        when(client.listSourceString(101L, null, null, null, null, null, null))
            .thenReturn(Arrays.asList(SourceStringBuilder.standard()
                .setProjectId(Long.parseLong(pb.getProjectId()))
                .setIdentifiers(701L, "7-0-1", "seven-o-one", "7.0.1", 101L).build()));

        action = new StringListAction(true, true, null, null, null, null,  null, null, null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).listLabels();
        verify(client).listSourceString(null, null, null, null, null, null, null);
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testStringListLabels() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        pb = pbBuilder.build();
        CrowdinProjectFull projectFull = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).addBranches(3L, "main")
            .addFile("first.csv", "csv", 101L, null, null).build();
        projectFull.setType(Type.FILES_BASED);
        Label label1 = new Label() {{
            setId(4L);
            setTitle("l1");
        }};
        Label label2 = new Label() {{
            setId(5L);
            setTitle("l2");
        }};

        when(client.downloadFullProject(null))
            .thenReturn(projectFull);
        when(client.listSourceString(101L, null, null, null, null, null, null))
            .thenReturn(Arrays.asList(SourceStringBuilder.standard()
                .setProjectId(Long.parseLong(pb.getProjectId()))
                .setIdentifiers(701L, "7-0-1", "seven-o-one", "7.0.1", 101L).build()));
        when(client.listLabels()).thenReturn(Arrays.asList(label1, label2));

        action = new StringListAction(
            true, true, "first.csv", null, null, Arrays.asList("l1", "l2"), null, null, null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(null);
        verify(client).listLabels();
        verify(client).listSourceString(101L, null, "4,5", null, null, null, null);
        verifyNoMoreInteractions(client);
    }
}

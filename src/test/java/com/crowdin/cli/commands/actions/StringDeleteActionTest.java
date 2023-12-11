package com.crowdin.cli.commands.actions;

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
import com.crowdin.client.sourcestrings.model.SourceString;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class StringDeleteActionTest {

    public static final Long PROJECT_ID = 42L;

    private PropertiesWithFiles pb;
    private ProjectClient client = mock(ProjectClient.class);
    private NewAction<ProjectProperties, ProjectClient> action;

    @ParameterizedTest
    @MethodSource
    public void testStringList(List<SourceString> strings, List<Long> ids, List<String> texts, List<String> identifiers) throws ResponseException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        pb = pbBuilder.build();
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        when(client.listSourceString(null, null, null, null, null))
            .thenReturn(strings);


        action = new StringDeleteAction(true, ids, texts, identifiers);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).listSourceString(null, null, null, null, null);
        for (SourceString sourceString : strings) {
            verify(client).deleteSourceString(sourceString.getId());
        }
        verifyNoMoreInteractions(client);
    }

    public static Stream<Arguments> testStringList() {
        return Stream.of(
            arguments(Arrays.asList(
                SourceStringBuilder.standard().setProjectId(PROJECT_ID)
                    .setIdentifiers(801L, "first. text", "context", "first. identifier", null).build(),
                SourceStringBuilder.standard().setProjectId(PROJECT_ID)
                    .setIdentifiers(802L, "second. text", "context", "second. identifier", null).build(),
                SourceStringBuilder.standard().setProjectId(PROJECT_ID)
                    .setIdentifiers(803L, "third. text", "context", "third. identifier", null).build()
            ), Arrays.asList(801L), Arrays.asList("second. text"), Arrays.asList("third. identifier"))
        );
    }

    @Test
    public void testStringList_throwsNotFound() {
        List<SourceString> strings = new ArrayList<>();
        List<Long> ids = Arrays.asList(801L);
        List<String> texts = Arrays.asList("second. text");
        List<String> identifiers = Arrays.asList("third. identifier");

        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        pb = pbBuilder.build();
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).build());
        when(client.listSourceString(null, null, null, null, null))
            .thenReturn(strings);


        action = new StringDeleteAction(true, ids, texts, identifiers);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject();
        verify(client).listSourceString(null, null, null, null, null);
        for (SourceString sourceString : strings) {
            verify(client).deleteSourceString(sourceString.getId());
        }
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testGetProjectThrows() throws ResponseException {

        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        pb = pbBuilder.build();
        when(client.downloadFullProject())
            .thenThrow(new RuntimeException("Whoops"));

        action = new StringDeleteAction(true, null, null, null);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject();
        verifyNoMoreInteractions(client);
    }
}

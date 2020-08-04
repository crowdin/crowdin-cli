package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.client.models.SourceStringBuilder;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.properties.PropertiesBeanBuilder;
import com.crowdin.cli.utils.Utils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.Arrays;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class StringListActionTest {

    @ParameterizedTest
    @MethodSource
    public void testStringList(String file, String filter) throws ResponseException {
        PropertiesBeanBuilder pbBuilder = PropertiesBeanBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesBean pb = pbBuilder.build();
        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.csv", "csv", 101L, null, null).build());
        when(client.listSourceString(101L, filter))
            .thenReturn(Arrays.asList(SourceStringBuilder.standard()
                .setProjectId(Long.parseLong(pb.getProjectId()))
                .setIdentifiers(701L, "7-0-1", "seven-o-one", "7.0.1", 101L).build()));

        ClientAction action = new StringListAction(true, true, file, filter);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        if (file != null) {
            verify(client).listSourceString(101L, filter);
        } else {
            verify(client).listSourceString(null, filter);
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

        PropertiesBeanBuilder pbBuilder = PropertiesBeanBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesBean pb = pbBuilder.build();
        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenThrow(new RuntimeException("Whoops"));

        ClientAction action = new StringListAction(true, true, null, null);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject();
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testFileNotExistThrows() throws ResponseException {

        PropertiesBeanBuilder pbBuilder = PropertiesBeanBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesBean pb = pbBuilder.build();
        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.csv", "csv", 101L, null, null).build());

        ClientAction action = new StringListAction(true, true, "notexist.csv", null);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject();
        verifyNoMoreInteractions(client);
    }
}

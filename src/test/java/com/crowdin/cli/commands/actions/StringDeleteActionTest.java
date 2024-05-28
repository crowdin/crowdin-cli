package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.Utils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.Mockito.*;

public class StringDeleteActionTest {

    private PropertiesWithFiles pb;
    private ProjectClient client = mock(ProjectClient.class);
    private NewAction<ProjectProperties, ProjectClient> action;

    @ParameterizedTest
    @MethodSource
    public void testStringList(Long id) throws ResponseException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        pb = pbBuilder.build();


        action = new StringDeleteAction(id);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).deleteSourceString(id);
        verifyNoMoreInteractions(client);
    }

    public static Stream<Arguments> testStringList() {
        return Stream.of(arguments(801L), arguments(802L), arguments(803L));
    }

    @Test
    public void testStringList_throwsNotFound() {
        Long id = 801L;

        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        pb = pbBuilder.build();
        doThrow(new RuntimeException()).when(client).deleteSourceString(id);


        action = new StringDeleteAction(id);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).deleteSourceString(id);
        verifyNoMoreInteractions(client);
    }
}

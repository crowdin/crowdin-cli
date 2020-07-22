package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.properties.PropertiesBeanBuilder;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.sourcestrings.model.AddSourceStringRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class StringAddActionTest {

    @ParameterizedTest
    @MethodSource
    public void testStringAdd(
        String text, String identifier, Integer maxLength, String context, Boolean hidden, Map<String, Long> files, String[] stringFiles
    ) throws ResponseException {
        PropertiesBeanBuilder pbBuilder = PropertiesBeanBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesBean pb = pbBuilder.build();



        List<AddSourceStringRequest> requests = new ArrayList<>();
        if (files != null) {
            if (files.size() == 0) {
                requests.add(RequestBuilder.addString(text, identifier, maxLength, context, null, hidden));
            } else {
                for (Long fileId : files.values()) {
                    requests.add(RequestBuilder.addString(text, identifier, maxLength, context, fileId, hidden));
                }
            }
        }

        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()));
        if (files != null) {
            for (Map.Entry<String, Long> pathWithId : files.entrySet()) {
                projectBuilder.addFile(pathWithId.getKey(), "csv", pathWithId.getValue(), null, null);
            }
        }

        Client client = mock(Client.class);
        when(client.downloadFullProject())
            .thenReturn(projectBuilder.build());

        Action action = new StringAddAction(true, text, identifier, maxLength, context, stringFiles, hidden);
        action.act(pb, client);

        verify(client).downloadFullProject();
        for (AddSourceStringRequest request : requests) {
            verify(client).addSourceString(request);
        }

        verifyNoMoreInteractions(client);
    }

    public static Stream<Arguments> testStringAdd() {
        Map<String, Long> headers = new HashMap<String, Long>() {{
                put("first.csv", 801L);
            }};
        return Stream.of(
            arguments("first text", "1.1", 42, "It's first text", false, headers, new String[] {"first.csv"}),
            arguments("first text", "1.1", 42, "It's first text", false, null, new String[] {"notExist.csv"}),
            arguments("first text", "1.1", 42, "It's first text", false, new HashMap<String, Long>(), new String[0])
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

        Action action = new StringAddAction(false, null, null, null, null, null, null);
        assertThrows(RuntimeException.class, () -> action.act(pb, client));

        verify(client).downloadFullProject();
        verifyNoMoreInteractions(client);
    }
}

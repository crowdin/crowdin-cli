package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.client.models.SourceStringBuilder;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.core.model.PatchOperation;
import com.crowdin.client.core.model.PatchRequest;
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

public class StringEditActionTest {

    private PropertiesWithFiles pb;
    private ProjectClient client = mock(ProjectClient.class);
    private NewAction<PropertiesWithFiles, ProjectClient> action;

    @ParameterizedTest
    @MethodSource
    public void testStringList(
        Long id, String identifier, String newText, String newContext, Integer newMaxLength, Boolean newIsHidden
    ) throws ResponseException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        pb = pbBuilder.build();
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.csv", "csv", 101L, null, null).build());
        when(client.listSourceString(null, null))
            .thenReturn(Arrays.asList(SourceStringBuilder.standard().setProjectId(42L).setIdentifiers(801L, "old", "old", "old", null).build()));

        action = new StringEditAction(true, id, identifier, newText, newContext, newMaxLength, newIsHidden);
        action.act(Outputter.getDefault(), pb, client);

        List<PatchRequest> patches = new ArrayList<PatchRequest>() {{
                if (newText != null) {
                    add(RequestBuilder.patch(newText, PatchOperation.REPLACE, "/text"));
                }
                if (newContext != null) {
                    add(RequestBuilder.patch(newContext, PatchOperation.REPLACE, "/context"));
                }
                if (newMaxLength != null) {
                    add(RequestBuilder.patch(newMaxLength, PatchOperation.REPLACE, "/maxLength"));
                }
                if (newIsHidden != null) {
                    add(RequestBuilder.patch(newIsHidden, PatchOperation.REPLACE, "/isHidden"));
                }
            }};
        verify(client).listSourceString(null, null);
        verify(client).editSourceString(801L, patches);
        verifyNoMoreInteractions(client);
    }

    public static Stream<Arguments> testStringList() {
        return Stream.of(
            arguments(801L, null, "new Text", "new Context", null, null),
            arguments(null, "old", "new Text", "new Context", null, null),
            arguments(801L, null, null, null, 42, true)
        );
    }

    @Test
    public void testBothIdAndIdentifier_throws() throws ResponseException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        pb = pbBuilder.build();
        when(client.downloadFullProject())
            .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("first.csv", "csv", 101L, null, null).build());
        when(client.listSourceString(null, null))
            .thenReturn(Arrays.asList(SourceStringBuilder.standard().setProjectId(42L).setIdentifiers(801L, "old", "old", "old", null).build()));

        action = new StringEditAction(true, null, null, null, null, null, null);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).listSourceString(null, null);
        verifyNoMoreInteractions(client);
    }
}

package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.core.model.PatchOperation;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.sourcestrings.model.SourceString;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.Mockito.*;

public class StringEditActionTest {

    private PropertiesWithFiles pb;
    private ProjectClient client = mock(ProjectClient.class);
    private NewAction<ProjectProperties, ProjectClient> action;

    @ParameterizedTest
    @MethodSource
    public void testStringList(
        Long id, String identifier, String newText, String newContext, Integer newMaxLength, Map<Long, String> newLabels, Boolean newIsHidden
    ) throws ResponseException {
        List<Long> labelIds = newLabels != null ? new ArrayList<>(newLabels.keySet()) : null;
        List<String> labelNames = newLabels != null ? new ArrayList<>(newLabels.values()) : null;

        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        pb = pbBuilder.build();
        when(client.downloadFullProject())
                .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                        .addFile("first.csv", "csv", 101L, null, null).build());

        List<Label> labels = new ArrayList<>();
        if (newLabels != null) {
            for (Long labelId : newLabels.keySet()) {
                labels.add(new Label() {{
                    setId(labelId);
                    setTitle(newLabels.get(labelId));
                }});
            }
        }
        when(client.listLabels())
                .thenReturn(labels);

        when(client.editSourceString(any(), any())).thenReturn(new SourceString());

        action = new StringEditAction(true, false, id, identifier, newText, newContext, newMaxLength, labelNames, newIsHidden, false);
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
                if (newLabels != null) {
                    add(RequestBuilder.patch(labelIds, PatchOperation.REPLACE, "/labelIds"));
                }
                if (identifier != null) {
                    add(RequestBuilder.patch(identifier, PatchOperation.REPLACE, "/identifier"));
                }
            }};
        verify(client).editSourceString(801L, patches);
        verify(client, times(newLabels != null ? 2 : 1)).listLabels();
    }

    public static Stream<Arguments> testStringList() {
        return Stream.of(
            arguments(801L, null, "new Text", "new Context", null, null, null),
            arguments(801L, "new", "new Text", "new Context", null, null, null),
            arguments(801L, null, null, null, 42, null, true),
            arguments(801L, null, "new Text", "new Context", null, new HashMap<Long, String>() {{
                put(42L, "label1");
            }}, null),
            arguments(801L, null, "new Text", "new Context", null, new HashMap<Long, String>() {{
                put(42L, "label1");
                put(43L, "label2");
            }}, null)
        );
    }
}

package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientTask;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.sourcestrings.model.AddSourceStringRequest;
import com.crowdin.client.tasks.model.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.Mockito.*;

public class TaskAddActionTest {

    NewAction<ProjectProperties, ClientTask> action;

    @ParameterizedTest
    @MethodSource
    public void testTaskAdd(String title, Integer type, String languageId, Map<String, Long> filesMap, List<String> files, String description,
                            boolean skipAssignedStrings, boolean skipUntranslatedStrings, boolean includePreTranslatedStringsOnly, List<Long> labelIds) {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()));
        for (Map.Entry<String, Long> pathWithId : filesMap.entrySet()) {
            projectBuilder.addFile(pathWithId.getKey(), "txt", pathWithId.getValue(), null, null);
        }

        ProjectClient projectClient = mock(ProjectClient.class);
        when(projectClient.downloadFullProject(any()))
                .thenReturn(projectBuilder.build());

        CreateTaskRequest request = RequestBuilder.addCrowdinTask(title, Type.from(String.valueOf(type)), languageId, new ArrayList<>(filesMap.values()),
                description, skipAssignedStrings, skipUntranslatedStrings, includePreTranslatedStringsOnly, labelIds);

        ClientTask client = mock(ClientTask.class);
        when(client.addTask(request))
                .thenReturn(new Task() {{
                    setType(request.getType());
                    setFileIds(request.getFileIds());
                    setDescription(request.getDescription());
                    setTitle(request.getTitle());
                }});

        action = new TaskAddAction(true, title, type, languageId, files, null, null, description, skipAssignedStrings, skipUntranslatedStrings, includePreTranslatedStringsOnly, labelIds, projectClient, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).addTask(request);
        verify(projectClient).downloadFullProject(null);
        verifyNoMoreInteractions(client);
    }

    public static Stream<Arguments> testTaskAdd() {
        Map<String, Long> filesMap = new HashMap<String, Long>() {{
            put("first.txt", 51L);
            put("second.txt", 52L);
        }};
        List<String> files = new ArrayList<String>() {{
            add("second.txt");
            add("first.txt");
        }};
        return Stream.of(arguments("My title", 1, "es", filesMap, files, "It's description", false, false, false, null));
    }

    @ParameterizedTest
    @MethodSource
    public void testEnterpriseTaskAdd(String title, String languageId, Map<String, Long> filesMap, List<String> files, String description,
                            boolean skipAssignedStrings, List<Long> labelIds, Long workflowStepId) {

        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        pb.setBaseUrl("https://testos.crowdin.com");

        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()));
        for (Map.Entry<String, Long> pathWithId : filesMap.entrySet()) {
            projectBuilder.addFile(pathWithId.getKey(), "txt", pathWithId.getValue(), null, null);
        }

        ProjectClient projectClient = mock(ProjectClient.class);
        when(projectClient.downloadFullProject(any()))
                .thenReturn(projectBuilder.build());

        CreateTaskEnterpriseRequest request = RequestBuilder.addEnterpriseTask(title, languageId, new ArrayList<>(filesMap.values()),
                description, skipAssignedStrings, false, labelIds, workflowStepId);

        ClientTask client = mock(ClientTask.class);
        when(client.addTask(request))
                .thenReturn(new Task() {{
                    setWorkflowStepId(request.getWorkflowStepId());
                    setFileIds(request.getFileIds());
                    setDescription(request.getDescription());
                    setTitle(request.getTitle());
                }});

        action = new TaskAddAction(false, title, null, languageId, files, null, workflowStepId, description, skipAssignedStrings, false, false, labelIds, projectClient, true);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).addTask(request);
        verify(projectClient).downloadFullProject(null);
        verifyNoMoreInteractions(client);
    }

    public static Stream<Arguments> testEnterpriseTaskAdd() {
        Map<String, Long> filesMap = new HashMap<String, Long>() {{
            put("first.txt", 51L);
        }};
        return Stream.of(arguments("My title", "es", filesMap, Arrays.asList("first.txt"), "It's description", false, Arrays.asList(1L), 10L));
    }

    @Test
    public void testAddTaskThrows() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ClientTask client = mock(ClientTask.class);

        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()));
        projectBuilder.addFile("file.txt", "txt", 1L, null, null);
        ProjectClient projectClient = mock(ProjectClient.class);
        when(projectClient.downloadFullProject(any()))
                .thenReturn(projectBuilder.build());

        CreateTaskRequest request = RequestBuilder.addCrowdinTask(null, null, null,
                Arrays.asList(1L), null, false, false, false, null);

        when(client.addTask(request))
                .thenThrow(new RuntimeException("Whoops"));

        action = new TaskAddAction(false, null, null, null, Arrays.asList("file.txt"), null, null, null, false, false, false, null, projectClient, false);

        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).addTask(request);
        verifyNoMoreInteractions(client);
    }
}

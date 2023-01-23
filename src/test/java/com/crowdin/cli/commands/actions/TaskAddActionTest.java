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
import com.crowdin.client.tasks.model.AddTaskRequest;
import com.crowdin.client.tasks.model.CrowdinTaskCreateFormRequest;
import com.crowdin.client.tasks.model.EnterpriseTaskCreateFormRequest;
import com.crowdin.client.tasks.model.Task;
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
    public void testTaskAdd(String title, Integer type, String languageId, List<Long> fileIds, String description,
                            boolean skipAssignedStrings, boolean skipUntranslatedStrings, List<Long> labelIds) {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        CrowdinTaskCreateFormRequest request = RequestBuilder.addCrowdinTask(title, type, languageId, fileIds,
                description, skipAssignedStrings, skipUntranslatedStrings, labelIds);

        ClientTask client = mock(ClientTask.class);
        when(client.addTask(request))
                .thenReturn(new Task() {{
                    setType(request.getType());
                    setFileIds(request.getFileIds());
                    setDescription(request.getDescription());
                    setTitle(request.getTitle());
                }});
        action = new TaskAddAction(title, type, languageId, fileIds, null, description, skipAssignedStrings,
                skipUntranslatedStrings, labelIds);
        action.act(Outputter.getDefault(), pb, client);
        verify(client).addTask(request);
        verifyNoMoreInteractions(client);
    }

    public static Stream<Arguments> testTaskAdd() {
        return Stream.of(arguments("My title", 1, "es", Arrays.asList(12L), "It's description", false, false, null));
    }

    @ParameterizedTest
    @MethodSource
    public void testEnterpriseTaskAdd(String title, String languageId, List<Long> fileIds, String description,
                            boolean skipAssignedStrings, List<Long> labelIds, Long workflowStepId) {

        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        pb.setBaseUrl("https://testos.crowdin.com");

        EnterpriseTaskCreateFormRequest request = RequestBuilder.addEnterpriseTask(title, languageId, fileIds,
                description, skipAssignedStrings, labelIds, workflowStepId);

        ClientTask client = mock(ClientTask.class);
        when(client.addTask(request))
                .thenReturn(new Task() {{
                    setWorkflowStepId(request.getWorkflowStepId());
                    setFileIds(request.getFileIds());
                    setDescription(request.getDescription());
                    setTitle(request.getTitle());
                }});
        action = new TaskAddAction(title, null, languageId, fileIds, workflowStepId, description, skipAssignedStrings,
                false, labelIds);
        action.act(Outputter.getDefault(), pb, client);
        verify(client).addTask(request);
        verifyNoMoreInteractions(client);
    }

    public static Stream<Arguments> testEnterpriseTaskAdd() {
        return Stream.of(arguments("My title", "es", Arrays.asList(12L), "It's description", false, Arrays.asList(1L), 10L));
    }

    @Test
    public void testAddTaskThrows() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ClientTask client = mock(ClientTask.class);

        CrowdinTaskCreateFormRequest request = RequestBuilder.addCrowdinTask(null, null, null,
                null, null, false, false, null);

        when(client.addTask(request))
                .thenThrow(new RuntimeException("Whoops"));

        action = new TaskAddAction(null, null, null,null, null, null,
                false, false, null);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).addTask(request);
        verifyNoMoreInteractions(client);
    }

}

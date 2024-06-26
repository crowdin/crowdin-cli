package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcestrings.model.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class StringAddActionTest {

    NewAction<ProjectProperties, ProjectClient> action;

    @ParameterizedTest
    @MethodSource
    public void testStringAdd(
        String text, String identifier, Integer maxLength, String context, List<Long> labelIds, List<String> labelNames, Boolean hidden, Map<String, Long> files, String[] stringFiles
    ) {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();



        List<AddSourceStringRequest> requests = new ArrayList<>();
        if (files != null) {
            if (files.size() == 0) {
                requests.add(RequestBuilder.addString(text, identifier, maxLength, context, null, hidden, labelIds));
            } else {
                for (Long fileId : files.values()) {
                    requests.add(RequestBuilder.addString(text, identifier, maxLength, context, fileId, hidden, labelIds));
                }
            }
        }

        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()));
        if (files != null) {
            for (Map.Entry<String, Long> pathWithId : files.entrySet()) {
                projectBuilder.addFile(pathWithId.getKey(), "csv", pathWithId.getValue(), null, null);
            }
        }

        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = projectBuilder.build();
        build.setType(Type.FILES_BASED);
        when(client.downloadFullProject())
            .thenReturn(build);
        when(client.addSourceString(any())).thenReturn(new SourceString());

        action =
            new StringAddAction(true, text, identifier, maxLength, context, Arrays.asList(stringFiles), labelNames, null, hidden, null, null, null, null, null, false);
        action.act(Outputter.getDefault(), pb, client);

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
            arguments("first text", "1.1", 42, "It's first text", null, null, false, headers, new String[] {"first.csv"})
        );
    }

    @Test
    public void testStringAdd_throwsNotFound() {
        String text = "first text";
        String identifier = "1.1";
        Integer maxLength = 42;
        String context = "It's first text";
        List<Long> labelIds = null;
        List<String> labelNames = null;
        Boolean hidden = false;
        Map<String, Long> files = null;
        String[] stringFiles = new String[] {"notExist.csv"};


        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();



        List<AddSourceStringRequest> requests = new ArrayList<>();
        if (files != null) {
            if (files.size() == 0) {
                requests.add(RequestBuilder.addString(text, identifier, maxLength, context, null, hidden, labelIds));
            } else {
                for (Long fileId : files.values()) {
                    requests.add(RequestBuilder.addString(text, identifier, maxLength, context, fileId, hidden, labelIds));
                }
            }
        }

        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()));
        if (files != null) {
            for (Map.Entry<String, Long> pathWithId : files.entrySet()) {
                projectBuilder.addFile(pathWithId.getKey(), "csv", pathWithId.getValue(), null, null);
            }
        }

        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = projectBuilder.build();
        build.setType(Type.FILES_BASED);
        when(client.downloadFullProject())
            .thenReturn(build);
        when(client.addSourceString(any())).thenReturn(new SourceString());

        action =
            new StringAddAction(true, text, identifier, maxLength, context, Arrays.asList(stringFiles), labelNames, null, hidden, null, null, null, null, null, true);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject();
        for (AddSourceStringRequest request : requests) {
            verify(client).addSourceString(request);
        }

        verifyNoMoreInteractions(client);
    }

    @Test
    public void testGetProjectThrows() throws ResponseException {

        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject())
            .thenThrow(new RuntimeException("Whoops"));

        action = new StringAddAction(false, null, null, null, null, null, null, null, null,  null, null, null, null, null, false);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject();
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testStringAdd_UseLabels() {
        String text = "first text";
        String identifier = "1.1";
        Integer maxLength = 42;
        String context = "It's first text";
        Map<Long, String> labels = new HashMap<Long, String>() {{
            put(42L, "LabeL");
        }};
        Boolean hidden = false;
        Map<String, Long> files = new HashMap<String, Long>() {{
            put("first.csv", 801L);
        }};
        String[] stringFiles = new String[] {"first.csv"};

        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();



        List<AddSourceStringRequest> requests = new ArrayList<>();
        if (files != null) {
            if (files.size() == 0) {
                requests.add(RequestBuilder.addString(text, identifier, maxLength, context, null, hidden, new ArrayList<>(labels.keySet())));
            } else {
                for (Long fileId : files.values()) {
                    requests.add(RequestBuilder.addString(text, identifier, maxLength, context, fileId, hidden, new ArrayList<>(labels.keySet())));
                }
            }
        }

        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()));
        if (files != null) {
            for (Map.Entry<String, Long> pathWithId : files.entrySet()) {
                projectBuilder.addFile(pathWithId.getKey(), "csv", pathWithId.getValue(), null, null);
            }
        }

        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = projectBuilder.build();
        build.setType(Type.FILES_BASED);
        when(client.downloadFullProject())
            .thenReturn(build);
        List<Label> labelsResponse = labels.entrySet().stream()
            .map(entry -> createLabel(entry.getKey(), entry.getValue()))
            .collect(Collectors.toList());
        when(client.listLabels())
            .thenReturn(labelsResponse);
        when(client.addSourceString(any())).thenReturn(new SourceString());


        action =
            new StringAddAction(true, text, identifier, maxLength, context, Arrays.asList(stringFiles), new ArrayList<>(labels.values()), null, hidden,  null, null, null, null, null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        for (AddSourceStringRequest request : requests) {
            verify(client).addSourceString(request);
        }
        verify(client).listLabels();

        verifyNoMoreInteractions(client);
    }

    private Label createLabel(Long id, String title) {
        Label label = new Label();
        label.setId(id);
        label.setTitle(title);
        return label;
    }

    @Test
    public void testStringAdd_PluralString() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        AddSourcePluralStringRequest request = RequestBuilder.addPluralString(
            "strings", "1.1", 42, "It's first text", 101L, false, null, "string", null, null, null, null);

        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()));
        projectBuilder.addFile("file.csv", "csv", 101L, null, null);

        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = projectBuilder.build();
        build.setType(Type.FILES_BASED);
        when(client.downloadFullProject())
            .thenReturn(build);
        when(client.addSourcePluralString(any())).thenReturn(new SourceString() {{ setId(12L); }});

        action =
            new StringAddAction(true, "strings", "1.1", 42, "It's first text", Arrays.asList("file.csv"), null, null, false, "string", null, null, null, null, true);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).addSourcePluralString(request);

        verifyNoMoreInteractions(client);
    }

    @Test
    public void testStringAdd_StringsBasedProject() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        AddSourceStringStringsBasedRequest request = RequestBuilder.addStringStringsBased(
            "first text", "1.1", 42, "It's first text", 1L, false, null);

        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).addBranches(1L, "main");

        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = projectBuilder.build();
        build.setType(Type.STRINGS_BASED);
        when(client.downloadFullProject())
            .thenReturn(build);
        when(client.addSourceStringStringsBased(any())).thenReturn(new SourceString());

        action =
            new StringAddAction(true, "first text", "1.1", 42, "It's first text", null, null, "main", false, null, null, null, null, null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).addSourceStringStringsBased(request);

        verifyNoMoreInteractions(client);
    }

    @Test
    public void testStringAdd_PluralStringStringsBasedProject() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        AddSourcePluralStringStringsBasedRequest request = RequestBuilder.addPluralStringStringsBased(
            "strings", "1.1", 42, "It's first text", 1L, false, null, "string", null, null, null, null);

        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId())).addBranches(1L, "main");

        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = projectBuilder.build();
        build.setType(Type.STRINGS_BASED);
        when(client.downloadFullProject())
            .thenReturn(build);
        when(client.addSourcePluralStringStringsBased(any())).thenReturn(new SourceString());

        action =
            new StringAddAction(true, "strings", "1.1", 42, "It's first text", null, null, "main", false, "string", null, null, null, null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject();
        verify(client).addSourcePluralStringStringsBased(request);

        verifyNoMoreInteractions(client);
    }
}

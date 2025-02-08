package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.commands.picocli.GenericActCommand;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.helper.FileHelperTest;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.core.model.PatchOperation;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.distributions.model.Distribution;
import com.crowdin.client.distributions.model.ExportMode;
import com.crowdin.client.projectsgroups.model.Type;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.Mockito.*;

class DistributionEditActionTest {
    NewAction<ProjectProperties, ClientDistribution> action;

    @ParameterizedTest
    @MethodSource
    public void testDistributionEdit(String hash, String name, ExportMode exportMode, List<String> files, List<Integer> bundleIds,
                                    String branch, Long branchId) {
        TempProject project = new TempProject(FileHelperTest.class);

        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        List<Long> fileIds = files == null ? null : files.stream().map(f -> project.addFile(f).getId()).collect(
            Collectors.toList());

        List<PatchRequest> patches = new ArrayList<>() {{
            if (name != null) {
                add(RequestBuilder.patch(name, PatchOperation.REPLACE, "/name"));
            }
            if (exportMode != null) {
                add(RequestBuilder.patch(exportMode, PatchOperation.REPLACE, "/exportMode"));
            }
            if (files != null) {
                add(RequestBuilder.patch(fileIds, PatchOperation.REPLACE, "/fileIds"));
            }
            if (bundleIds != null) {
                add(RequestBuilder.patch(bundleIds, PatchOperation.REPLACE, "/bundleIds"));
            }
        }};

        ClientDistribution client = mock(ClientDistribution.class);
        when(client.listDistribution()).thenReturn(new ArrayList<>(){{
            add(new Distribution() {{
                setHash(hash);
            }});
        }});
        when(client.editDistribution(hash, patches))
            .thenReturn(new Distribution() {{
                setName("Name");
            }});

        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()));
        if (branch != null) {
            projectBuilder.addBranches(branchId, branch);
        }
        Optional.ofNullable(fileIds).ifPresent(ids -> new ArrayList<>(ids).forEach(
            f -> projectBuilder.addFile(Utils.toUnixPath(Utils.sepAtStart(Paths.get(Optional.ofNullable(branch).orElse(""),
                    files.get(ids.indexOf(f))).toString())),
                "gettext", f, null, branchId,
                "/%original_file_name%-CR-%locale%")));

        ProjectClient projectClient = mock(ProjectClient.class);
        CrowdinProjectFull build = projectBuilder.build();
        build.setType(Type.FILES_BASED);
        when(projectClient.downloadFullProject(branch))
            .thenReturn(build);

        try (var mocked = mockStatic(GenericActCommand.class)) {
            mocked.when(() -> GenericActCommand.getProjectClient(pb)).thenReturn(projectClient);
            action = new DistributionEditAction(hash, true, true, name, exportMode, files, bundleIds, branch);
            action.act(Outputter.getDefault(), pb, client);
            verify(client).listDistribution();
            verify(client).editDistribution(hash, patches);
            verifyNoMoreInteractions(client);
            mocked.verify(() -> GenericActCommand.getProjectClient(pb));
        }
    }

    public static Stream<Arguments> testDistributionEdit() {
        return Stream.of(arguments("hash0", null, null, Arrays.asList("first.po"), null, null, null),
            arguments("hash1", "My Distribution 2", null, null, null, null, null),
            arguments("hash2", null, ExportMode.DEFAULT, null, null, null, null),
            arguments("hash3", "My Distribution 3", ExportMode.BUNDLE, null, Arrays.asList(2L), null, null),
            arguments("hash4", null, null, Arrays.asList("second.po"), null, "master", 1L));
    }

    @Test
    public void testEditDistributionThrows() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ClientDistribution client = mock(ClientDistribution.class);

        List<PatchRequest> patches = new ArrayList<>();
        when(client.editDistribution("hash", patches))
            .thenThrow(new RuntimeException());

        try (var mocked = mockStatic(GenericActCommand.class)) {
            mocked.when(() -> GenericActCommand.getProjectClient(pb)).thenReturn(null);
            action = new DistributionEditAction("hash", true, false, null, null, null, null, null);
            assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

            verifyNoMoreInteractions(client);
            mocked.verify(() -> GenericActCommand.getProjectClient(pb));
        }
    }

    @Test
    public void testDistributionEdit_StringsBasedProject() {
        TempProject project = new TempProject(FileHelperTest.class);

        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        List<PatchRequest> patches = new ArrayList<>() {{
            add(RequestBuilder.patch("New name", PatchOperation.REPLACE, "/name"));
        }};

        ClientDistribution client = mock(ClientDistribution.class);
        when(client.listDistribution()).thenReturn(new ArrayList<>(){{
            add(new Distribution() {{
                setHash("hash");
            }});
        }});
        when(client.editDistribution("hash", patches))
            .thenReturn(new Distribution() {{
                setName("New name");
            }});

        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()));

        ProjectClient projectClient = mock(ProjectClient.class);
        CrowdinProjectFull build = projectBuilder.build();
        build.setType(Type.STRINGS_BASED);
        when(projectClient.downloadFullProject(null))
            .thenReturn(build);

        try (var mocked = mockStatic(GenericActCommand.class)) {
            mocked.when(() -> GenericActCommand.getProjectClient(pb)).thenReturn(projectClient);
            action = new DistributionEditAction("hash", true, true, "New name", null, null, null, null);
            action.act(Outputter.getDefault(), pb, client);
            verify(client).listDistribution();
            verify(client).editDistribution("hash", patches);
            verifyNoMoreInteractions(client);
            mocked.verify(() -> GenericActCommand.getProjectClient(pb));
        }
    }

    @Test
    public void testDistributionEditWrongArgs_StringsBasedProject() {
        TempProject project = new TempProject(FileHelperTest.class);

        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        List<PatchRequest> patches = new ArrayList<>() {{
            add(RequestBuilder.patch("New name", PatchOperation.REPLACE, "/name"));
        }};

        ClientDistribution client = mock(ClientDistribution.class);
        when(client.editDistribution("hash", patches))
            .thenReturn(new Distribution() {{
                setName("New name");
            }});

        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()));

        ProjectClient projectClient = mock(ProjectClient.class);
        CrowdinProjectFull build = projectBuilder.build();
        build.setType(Type.STRINGS_BASED);
        when(projectClient.downloadFullProject(null))
            .thenReturn(build);

        try (var mocked = mockStatic(GenericActCommand.class)) {
            mocked.when(() -> GenericActCommand.getProjectClient(pb)).thenReturn(projectClient);
            action = new DistributionEditAction("hash", true, true, null, null, Arrays.asList("first.po"), null, null);
            assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));
            mocked.verify(() -> GenericActCommand.getProjectClient(pb));
        }
    }
}

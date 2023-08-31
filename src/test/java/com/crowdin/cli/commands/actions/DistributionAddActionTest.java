package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.helper.FileHelperTest;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.distributions.model.AddDistributionRequest;
import com.crowdin.client.distributions.model.Distribution;
import com.crowdin.client.distributions.model.ExportMode;
import com.crowdin.client.sourcefiles.model.File;
import jdk.internal.joptsimple.internal.Strings;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import javax.annotation.Nullable;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.Mockito.*;

public class DistributionAddActionTest {

    NewAction<ProjectProperties, ClientDistribution> action;

    @ParameterizedTest
    @MethodSource
    public void testDistributionAdd(String name, ExportMode exportMode, List<String> files, List<Integer> bundleIds,
                                        String branch, Long branchId) {
        TempProject project = new TempProject(FileHelperTest.class);

        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();

        List<Long> fileIds = files == null ? null : files.stream().map(f -> project.addFile(f).getId()).collect(
                Collectors.toList());
        AddDistributionRequest request = RequestBuilder.addDistribution(name, exportMode, fileIds, bundleIds);

        ClientDistribution client = mock(ClientDistribution.class);
        when(client.addDistribution(request))
                .thenReturn(new Distribution() {{
                    setName(request.getName());
                    setFileIds(request.getFileIds());
                    setBundleIds(request.getBundleIds());
                    setExportMode(request.getExportMode().toString());
                }});

        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()));
        if (branch != null) {
            projectBuilder.addBranches(branchId, branch);
        }
        Optional.ofNullable(fileIds).ifPresent(ids -> new ArrayList<>(ids).forEach(
                f -> projectBuilder.addFile(Utils.sepAtStart(Paths.get(Optional.ofNullable(branch).orElse(""),
                                                                       files.get(ids.indexOf(f))).toString()),
                                            "gettext", f, null, branchId,
                                            "/%original_file_name%-CR-%locale%")));

        ProjectClient projectClient = mock(ProjectClient.class);
        when(projectClient.downloadFullProject(branch))
                .thenReturn(projectBuilder.build());

        action = new DistributionAddAction(true, true, name, exportMode, files, bundleIds, branch, projectClient);
        action.act(Outputter.getDefault(), pb, client);
        verify(client).addDistribution(request);
        verifyNoMoreInteractions(client);
    }

    public static Stream<Arguments> testDistributionAdd() {
        return Stream.of(arguments("My Distribution 1", ExportMode.DEFAULT, Arrays.asList("first.po"), null,
                                   null, null),
                         arguments("My Distribution 2", ExportMode.BUNDLE, null, Arrays.asList(9),
                                   null, null),
                          arguments("My Distribution 3", ExportMode.DEFAULT, Arrays.asList("second.po"), null,
                                   "master", 1l));
    }

    @Test
    public void testAddDistributionThrows() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ClientDistribution client = mock(ClientDistribution.class);

        AddDistributionRequest request = RequestBuilder.addDistribution(null, null, null, null);

        when(client.addDistribution(request))
                .thenThrow(new RuntimeException("Whoops"));

        action = new DistributionAddAction(true, false, null, null, null, null, null, null);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verifyNoMoreInteractions(client);
    }

}

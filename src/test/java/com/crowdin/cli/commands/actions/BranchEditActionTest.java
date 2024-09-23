package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.core.model.PatchOperation;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.core.model.Priority;
import com.crowdin.client.sourcefiles.model.Branch;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.Mockito.*;

public class BranchEditActionTest {

    private PropertiesWithFiles pb;
    private ProjectClient client = mock(ProjectClient.class);
    private NewAction<ProjectProperties, ProjectClient> action;

    @ParameterizedTest
    @MethodSource
    public void testBranchEdit(String branch, String name, String title, Priority priority) {
        Long branchId = 1L;

        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        pb = pbBuilder.build();
        when(client.downloadFullProject())
                .thenReturn(ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                        .addBranches(branchId, branch).build());

        when(client.editBranch(any(), any())).thenReturn(new Branch());

        action = new BranchEditAction(branch, name, title, priority, false, false);
        action.act(Outputter.getDefault(), pb, client);

        List<PatchRequest> patches = new ArrayList<>() {{
            if (name != null) {
                add(RequestBuilder.patch(name, PatchOperation.REPLACE, "/name"));
            }
            if (title != null) {
                add(RequestBuilder.patch(title, PatchOperation.REPLACE, "/title"));
            }
            if (priority != null) {
                add(RequestBuilder.patch(priority, PatchOperation.REPLACE, "/priority"));
            }
        }};
        verify(client).editBranch(branchId, patches);
    }

    public static Stream<Arguments> testBranchEdit() {
        return Stream.of(
                arguments("main", "dev", null, null),
                arguments("main", null, "test", null),
                arguments("main", null, null, Priority.HIGH),
                arguments("main", "dev", "test", Priority.HIGH)
        );
    }
}

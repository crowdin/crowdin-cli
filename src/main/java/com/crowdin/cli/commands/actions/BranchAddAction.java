package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.core.model.Priority;
import com.crowdin.client.sourcefiles.model.Branch;
import lombok.AllArgsConstructor;

import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.SKIPPED;

@AllArgsConstructor
class BranchAddAction implements NewAction<ProjectProperties, ProjectClient> {

    private final String name;
    private final String title;
    private final String exportPattern;
    private final Priority priority;
    private final boolean plainView;

    @Override
    public void act(Outputter out, ProjectProperties properties, ProjectClient client) {
        Map<String, Long> branches = client.listBranches().stream()
            .collect(Collectors.toMap(Branch::getName, Branch::getId));
        if (!branches.containsKey(name)) {
            Branch branch = client.addBranch(RequestBuilder.addBranch(name, title, exportPattern, priority));
            if (!plainView) {
                out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch.list"), branch.getId(), branch.getName())));
            } else {
                out.println(branch.getName());
            }
        } else {
            out.println(SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch_already_exists"), name)));
        }
    }
}

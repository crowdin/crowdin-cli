package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.BranchUtils;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.sourcefiles.model.Branch;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.SKIPPED;

class BranchDeleteAction implements NewAction<ProjectProperties, ProjectClient> {

    private final String name;

    public BranchDeleteAction(String name) {
        this.name = name;
    }

    @Override
    public void act(Outputter out, ProjectProperties properties, ProjectClient client) {
        List<Branch> branches = client.listBranches();
        String branchName = BranchUtils.normalizeBranchName(name);

        Optional<Branch> toDelete = branches.stream()
            .filter(b -> b.getName().equals(branchName)).findFirst();

        if (toDelete.isPresent()) {
            client.deleteBranch(toDelete.get().getId());
            out.println(ExecutionStatus.OK.withIcon(
                String.format(RESOURCE_BUNDLE.getString("message.branch_deleted"), name)
            ));
        }
        else {
            out.println(SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch_does_not_exist"), name)));
        }
    }
}

package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.sourcefiles.model.Branch;

import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.SKIPPED;

class BranchDeleteAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private final String name;

    public BranchDeleteAction(String name) {
        this.name = name;
    }

    @Override
    public void act(Outputter out, PropertiesWithFiles properties, ProjectClient client) {
        Map<String, Long> branches = client.listBranches().stream()
            .collect(Collectors.toMap(Branch::getName, Branch::getId));
        if (branches.containsKey(name)) {
            client.deleteBranch(branches.get(name));
            out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch_deleted"), name)));
        } else {
            out.println(SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch_does_not_exist"), name)));
        }
    }
}

package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.DryrunBranches;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcefiles.model.Branch;
import com.google.common.base.Functions;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

class ListBranchesAction implements NewAction<ProjectProperties, ProjectClient> {

    private boolean noProgress;
    private boolean plainView;

    public ListBranchesAction(boolean noProgress,  boolean plainView) {
        this.noProgress = noProgress || plainView;
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        Map<Long, Branch> branches = client.listBranches()
            .stream()
            .collect(Collectors.toMap(Branch::getId, Function.identity()));

        new DryrunBranches(branches)
            .run(out, false, plainView);
    }
}

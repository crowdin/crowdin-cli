package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine.Command;
import picocli.CommandLine.Parameters;

@Command(
    sortOptions = false,
    name = CommandNames.BRANCH_CLONE
)
class BranchCloneSubcommand extends ActCommandProject {

    @Parameters(descriptionKey = "crowdin.branch.clone.original_branch")
    protected String name;

    @Parameters(descriptionKey = "crowdin.branch.clone.new_branch")
    protected String newBranch;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.branchClone(name, newBranch, noProgress);
    }
}

package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.PropertiesWithFiles;
import picocli.CommandLine;

@CommandLine.Command(
    sortOptions = false,
    name = CommandNames.BRANCH_DELETE
)
class BranchDeleteSubcommand extends ActCommandWithFiles {

    @CommandLine.Parameters(descriptionKey = "crowdin.branch.delete.name")
    protected String name;

    @Override
    protected NewAction<PropertiesWithFiles, ProjectClient> getAction(Actions actions) {
        return actions.branchDelete(name);
    }
}

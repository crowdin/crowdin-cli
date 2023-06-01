package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.core.model.Priority;
import picocli.CommandLine;

@CommandLine.Command(
    sortOptions = false,
    name = CommandNames.BRANCH_ADD
)
class BranchAddSubcommand extends ActCommandProject {

    @CommandLine.Parameters(descriptionKey = "crowdin.branch.add.name")
    protected String name;

    @CommandLine.Option(names = "--title", paramLabel = "...", order = -2)
    protected String title;

    @CommandLine.Option(names = "--export-pattern", paramLabel = "...", order = -2)
    protected String exportPattern;

    @CommandLine.Option(names = "--priority", paramLabel = "...", order = -2)
    protected Priority priority;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.branchAdd(name, title, exportPattern, priority);
    }
}

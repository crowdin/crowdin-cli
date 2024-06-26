package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.core.model.Priority;
import picocli.CommandLine;

@CommandLine.Command(
    sortOptions = false,
    name = CommandNames.ADD
)
class BranchAddSubcommand extends ActCommandProject {

    @CommandLine.Parameters(descriptionKey = "crowdin.branch.add.name")
    protected String name;

    @CommandLine.Option(names = "--title", descriptionKey = "crowdin.branch.add.title", paramLabel = "...", order = -2)
    protected String title;

    @CommandLine.Option(names = "--export-pattern", descriptionKey = "crowdin.branch.add.export-pattern", paramLabel = "...", order = -2)
    protected String exportPattern;

    @CommandLine.Option(names = "--priority", descriptionKey = "crowdin.branch.add.priority", paramLabel = "...", order = -2)
    protected Priority priority;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.branchAdd(name, title, exportPattern, priority, plainView);
    }
}

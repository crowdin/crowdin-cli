package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.LIST_PROJECT,
    sortOptions = false
)
class ListProjectSubcommand extends ActCommandProject {

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", order = -2)
    protected String branch;

    @CommandLine.Option(names = {"--tree"}, order = -2)
    protected boolean treeView;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.listProject(this.noProgress, this.branch, this.treeView, this.plainView);
    }

    @Override
    protected final boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }
}

package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.PropertiesWithFiles;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.LIST_SOURCES,
    sortOptions = false
)
class ListSourcesSubcommand extends ActCommandWithFiles {

    @CommandLine.Option(names = {"-b", "--branch"}, order = -2)
    protected String branch;

    @CommandLine.Option(names = {"--tree"}, order = -2)
    protected boolean treeView;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<PropertiesWithFiles, ProjectClient> getAction(Actions actions) {
        return actions.listSources(false, null, this.noProgress, this.treeView, this.plainView);
    }

    @Override
    protected final boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }
}

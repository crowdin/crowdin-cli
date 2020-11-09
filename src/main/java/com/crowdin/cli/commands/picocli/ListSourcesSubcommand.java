package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.PropertiesWithFiles;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.LIST_SOURCES
)
class ListSourcesSubcommand extends ActCommandWithFiles {

    @CommandLine.Option(names = {"-b", "--branch"})
    protected String branch;

    @CommandLine.Option(names = {"--tree"})
    protected boolean treeView;

    @Override
    protected NewAction<PropertiesWithFiles, ProjectClient> getAction(Actions actions) {
        return actions.listSources(this.noProgress, this.treeView, this.plainView);
    }

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected final boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }
}

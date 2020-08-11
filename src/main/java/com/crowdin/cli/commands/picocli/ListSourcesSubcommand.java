package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.ClientAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.LIST_SOURCES
)
class ListSourcesSubcommand extends ClientActPlainMixin {

    @CommandLine.Option(names = {"-b", "--branch"})
    protected String branch;

    @CommandLine.Option(names = {"--tree"})
    protected boolean treeView;

    @Override
    protected ClientAction getAction(Actions actions) {
        return actions.listSources(this.noProgress, this.treeView, this.plainView);
    }
}

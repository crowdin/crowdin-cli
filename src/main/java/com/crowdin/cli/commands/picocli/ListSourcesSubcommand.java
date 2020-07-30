package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.actions.ClientAction;
import com.crowdin.cli.commands.actions.ListSourcesAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = "sources")
class ListSourcesSubcommand extends ClientActCommand {

    @CommandLine.Option(names = {"-b", "--branch"})
    protected String branch;

    @CommandLine.Option(names = {"--tree"})
    protected boolean treeView;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected ClientAction getAction() {
        return new ListSourcesAction(this.noProgress, this.treeView, this.plainView);
    }

    @Override
    protected boolean isAnsi() {
        return !plainView;
    }
}

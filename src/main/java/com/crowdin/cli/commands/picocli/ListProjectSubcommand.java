package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.ClientAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.LIST_PROJECT)
class ListProjectSubcommand extends ClientActPlainMixin {

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...")
    protected String branch;

    @CommandLine.Option(names = {"--tree"})
    protected boolean treeView;

    @Override
    protected ClientAction getAction(Actions actions) {
        return actions.listProject(this.noProgress, this.branch, this.treeView, this.plainView);
    }
}

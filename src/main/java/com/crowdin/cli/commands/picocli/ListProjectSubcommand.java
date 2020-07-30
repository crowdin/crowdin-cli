package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.actions.ClientAction;
import com.crowdin.cli.commands.actions.ListProjectAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = "project")
class ListProjectSubcommand extends ClientActCommand {

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...")
    protected String branch;

    @CommandLine.Option(names = {"--tree"})
    protected boolean treeView;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected ClientAction getAction() {
        return new ListProjectAction(this.noProgress, this.branch, this.treeView, this.plainView);
    }

    @Override
    protected boolean isAnsi() {
        return !plainView;
    }
}

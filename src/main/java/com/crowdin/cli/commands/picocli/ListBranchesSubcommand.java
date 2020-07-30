package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.actions.ClientAction;
import com.crowdin.cli.commands.actions.ListBranchesAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = "branches"
)
class ListBranchesSubcommand extends ClientActCommand {

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected ClientAction getAction() {
        return new ListBranchesAction(this.noProgress, this.plainView);
    }

    @Override
    protected boolean isAnsi() {
        return !plainView;
    }
}

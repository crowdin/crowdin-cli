package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.ClientAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.LIST_BRANCHES
)
class ListBranchesSubcommand extends ClientActPlainMixin {

    @Override
    protected ClientAction getAction(Actions actions) {
        return actions.listBranches(this.noProgress, this.plainView);
    }
}

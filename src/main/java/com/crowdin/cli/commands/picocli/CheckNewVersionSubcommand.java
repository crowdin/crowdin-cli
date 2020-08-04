package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.actions.Action;
import com.crowdin.cli.commands.actions.CheckNewVersionAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = "check-new-version",
    hidden = true
)
class CheckNewVersionSubcommand extends ActCommand {

    @Override
    protected Action getAction() {
        return new CheckNewVersionAction();
    }
}

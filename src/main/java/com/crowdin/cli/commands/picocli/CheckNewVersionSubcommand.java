package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Action;
import com.crowdin.cli.commands.Actions;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.CHECK_NEW_VERSION,
    hidden = true
)
class CheckNewVersionSubcommand extends ActCommand {

    @Override
    protected Action getAction(Actions actions) {
        return actions.checkNewVersion();
    }
}

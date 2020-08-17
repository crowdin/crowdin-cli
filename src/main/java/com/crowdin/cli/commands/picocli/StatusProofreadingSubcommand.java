package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.ClientAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.STATUS_PROOFREADING,
    sortOptions = false
)
class StatusProofreadingSubcommand extends ClientActCommand {

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...")
    protected String languageId;

    @Override
    protected ClientAction getAction(Actions actions) {
        return actions.status(noProgress, languageId, isVerbose, false, true);
    }
}

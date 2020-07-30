package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.actions.ClientAction;
import com.crowdin.cli.commands.actions.StatusAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = "status",
    sortOptions = false,
    subcommands = {
        StatusTranslationSubcommand.class,
        StatusProofreadingSubcommand.class
    }
)
class StatusSubcommand extends ClientActCommand {

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...")
    protected String languageId;

    @Override
    protected ClientAction getAction() {
        return new StatusAction(noProgress, languageId, isVerbose, true, true);
    }
}

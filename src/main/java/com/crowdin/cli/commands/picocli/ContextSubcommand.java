package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.CONTEXT,
    subcommands = {
        ContextDownloadSubcommand.class,
    }
)
class ContextSubcommand extends HelpCommand {
    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get(CommandNames.CONTEXT);
    }
}

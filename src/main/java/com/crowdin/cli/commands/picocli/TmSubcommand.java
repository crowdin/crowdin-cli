package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.TM,
    subcommands = {
        TmListSubcommand.class,
        TmUploadSubcommand.class,
        TmDownloadSubcommand.class
    }
)
class TmSubcommand extends HelpCommand {

    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get(CommandNames.TM);
    }
}

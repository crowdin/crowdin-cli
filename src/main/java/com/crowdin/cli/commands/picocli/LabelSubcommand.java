package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.LABEL,
    subcommands = {
        LabelListSubcommand.class,
        LabelAddSubcommand.class,
        LabelDeleteSubcommand.class
    }
)
class LabelSubcommand extends HelpCommand {

    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get(CommandNames.LABEL);
    }
}

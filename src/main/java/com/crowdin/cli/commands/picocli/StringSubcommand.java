package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = "string",
    subcommands = {
        StringListSubcommand.class,
        StringAddSubcommand.class,
        StringDeleteSubcommand.class,
        StringEditSubcommand.class
    }
)
class StringSubcommand extends HelpCommand {
    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand.getSubcommands().get("string");
    }
}
